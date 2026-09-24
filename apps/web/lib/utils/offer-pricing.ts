import type { OfferDoc } from '../types/db';

/**
 * Whose number is currently on the table, and what it is.
 *
 * A negotiation ping-pongs between two separate fields:
 *   offerAmount   — the buyer's opening bid (never changes)
 *   counterAmount — the seller/admin's latest counter
 *   buyerCounter  — the buyer's latest counter-back
 *
 * `status` says whose turn it is:
 *   'countered' — the admin has just countered; the ball is with the buyer, and
 *                 the live figure is counterAmount.
 *   'pending'   — the ball is with the admin. The live figure is buyerCounter if
 *                 the buyer has countered back, otherwise the opening offer.
 *
 * Getting this wrong is a money bug: an earlier version derived the price as
 * `counterAmount || offerAmount`, while the counter route wrote the buyer's
 * counter-back into counterAmount. A buyer could therefore set their own price
 * and the admin would unknowingly accept it.
 */
export function liveOfferAmount(offer: Pick<OfferDoc, 'status' | 'offerAmount' | 'counterAmount' | 'buyerCounter'>): {
  amount: number;
  from: 'buyer' | 'seller';
} {
  if (offer.status === 'countered' && offer.counterAmount != null) {
    return { amount: offer.counterAmount, from: 'seller' };
  }
  if (offer.buyerCounter != null) {
    return { amount: offer.buyerCounter, from: 'buyer' };
  }
  return { amount: offer.offerAmount, from: 'buyer' };
}

/**
 * The price both sides settled on, in cents.
 *
 * Prefers `agreedAmount`, which the accept route freezes onto the offer, so the
 * figure can never drift afterwards. Older offers accepted before that field
 * existed fall back to the derivation above.
 */
export function agreedOfferAmount(
  offer: Pick<OfferDoc, 'status' | 'offerAmount' | 'counterAmount' | 'buyerCounter' | 'agreedAmount'>
): number {
  if (offer.agreedAmount != null && offer.agreedAmount > 0) return offer.agreedAmount;
  return liveOfferAmount(offer).amount;
}
