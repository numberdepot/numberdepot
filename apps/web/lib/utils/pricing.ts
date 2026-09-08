import type { WithId } from 'mongodb';
import type { NumberDoc } from '../types/db';

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatNumberDoc(doc: WithId<NumberDoc>) {
  // All inventory numbers are offer-only (no fixed price, only "Make an Offer").
  // NumberBarn numbers keep their normal price/cart flow.
  const isOfferOnly = doc.source === 'inventory';

  return {
    id: doc._id.toString(),
    number: doc.formattedNumber,
    rawNumber: doc.number,
    countryCode: doc.countryCode,
    areaCode: doc.areaCode,
    numberType: doc.numberType,
    vanityText: doc.vanityText || null,
    salePrice: isOfferOnly ? null : centsToDollars(doc.price),
    basePrice: isOfferOnly ? null : centsToDollars(doc.price),
    licensePrice: isOfferOnly ? null : (doc.licensePrice ? centsToDollars(doc.licensePrice) : centsToDollars(doc.price)),
    monthlyPrice: centsToDollars(doc.monthlyPrice),
    setupFee: centsToDollars(doc.setupFee),
    source: doc.source,
    status: doc.status,
    isVanity: doc.isVanity,
    isPremium: doc.isPremium,
    isPortable: true,
    features: doc.features,
    description: doc.description || '',
    city: doc.city || '',
    state: doc.state || '',
    listingId: `lst_${doc._id.toString()}`,
    listingType: doc.price > 0 ? 'sale' : 'license',
    offerOnly: isOfferOnly,
    allowOffers: isOfferOnly ? true : (doc.allowOffers ?? true),
    minimumOffer: doc.minimumOffer != null ? centsToDollars(doc.minimumOffer) : (isOfferOnly ? null : centsToDollars(Math.round(doc.price * 0.7))),
    sellerId: null,
    createdAt: doc.createdAt.toISOString(),
    reservedUntil: doc.reservationExpiresAt?.toISOString() || null,
  };
}
