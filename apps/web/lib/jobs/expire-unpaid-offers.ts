import {
  getOffersCollection,
  getNumbersCollection,
  getOrdersCollection,
  getUsersCollection,
} from '../collections';
import { agreedOfferAmount } from '../utils/offer-pricing';

export interface ExpireResult {
  checked: number;
  expired: number;
  skipped: number;
}

/**
 * Expires accepted offers whose payment window has closed.
 *
 * An accepted offer holds a number off the market. If the buyer never pays,
 * that hold has to end: the offer expires, the number goes back on sale, and
 * the buyer is told why.
 *
 * Safe to run concurrently and repeatedly. Each offer is claimed with a
 * conditional update, so two overlapping runs cannot expire the same offer
 * twice or send the buyer two emails.
 */
export async function expireUnpaidOffers(): Promise<ExpireResult> {
  const offersCol = await getOffersCollection();
  const numbersCol = await getNumbersCollection();
  const ordersCol = await getOrdersCollection();
  const now = new Date();

  const due = await offersCol
    .find({ status: 'accepted', paymentDueAt: { $lt: now }, paidAt: { $exists: false } })
    .limit(500)
    .toArray();

  let expired = 0;
  let skipped = 0;

  for (const offer of due) {
    // An order may have completed between the query above and this iteration.
    // Never expire an offer that has actually been paid.
    const paidOrder = await ordersCol.findOne({ offerId: offer._id, status: 'completed' });
    if (paidOrder) {
      await offersCol.updateOne(
        { _id: offer._id },
        { $set: { paidAt: paidOrder.completedAt || now, orderId: paidOrder._id, updatedAt: now } }
      );
      skipped++;
      continue;
    }

    const claimed = await offersCol.findOneAndUpdate(
      { _id: offer._id, status: 'accepted', paidAt: { $exists: false } },
      {
        $set: {
          status: 'expired' as const,
          expiredReason: 'payment_window' as const,
          sellerResponse: 'Expired — payment was not completed within the allowed time.',
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    if (!claimed) {
      skipped++;
      continue;
    }

    // Put the number back on sale if this buyer's unpaid checkout still holds
    // it. Scoped to this buyer so another buyer's live reservation, or an
    // already-sold number, is never disturbed.
    try {
      await numbersCol.updateOne(
        { _id: offer.numberId, status: 'reserved', reservedBy: offer.buyerId },
        {
          $set: { status: 'available' as const, updatedAt: now },
          $unset: { reservedBy: '', reservedAt: '', reservationExpiresAt: '' },
        }
      );
    } catch (err) {
      console.error(`[ExpireOffers] Could not release ${offer.numberId.toString()}:`, err);
    }

    try {
      await ordersCol.updateMany(
        { offerId: offer._id, status: { $in: ['pending', 'processing'] } },
        { $set: { status: 'failed' as const, lastPaymentError: 'Offer expired before payment', updatedAt: now } }
      );
    } catch (err) {
      console.error(`[ExpireOffers] Could not close orders for ${offer._id.toString()}:`, err);
    }

    try {
      const { createNotification } = await import('../utils/notifications');
      await createNotification({
        userId: offer.buyerId.toString(),
        title: 'Offer expired',
        message: `Your accepted offer on ${offer.formattedNumber || offer.number} expired because payment was not completed in time. The number is back on sale.`,
        type: 'offer',
        actionUrl: '/account/offers',
        entityType: 'offer',
        entityId: offer._id.toString(),
      });
    } catch (err) {
      console.error('[ExpireOffers] Notification failed:', err);
    }

    try {
      const users = await getUsersCollection();
      const buyer = await users.findOne({ _id: offer.buyerId }, { projection: { email: 1 } });
      if (buyer?.email) {
        const { sendOfferNotification } = await import('../resend');
        await sendOfferNotification(buyer.email, 'payment_expired', {
          number: offer.formattedNumber || offer.number,
          offerAmount: agreedOfferAmount(offer),
        });
      }
    } catch (err) {
      console.error('[ExpireOffers] Email failed:', err);
    }

    expired++;
  }

  if (expired > 0) {
    console.warn(`[ExpireOffers] Expired ${expired} unpaid offer(s).`);
  }

  return { checked: due.length, expired, skipped };
}

/** Releases cart reservations whose 15-minute hold has run out. */
export async function releaseExpiredReservations(): Promise<{ released: number }> {
  const numbersCol = await getNumbersCollection();
  const now = new Date();

  const result = await numbersCol.updateMany(
    { status: 'reserved', reservationExpiresAt: { $lt: now } },
    {
      $set: { status: 'available' as const, updatedAt: now },
      $unset: { reservedBy: '', reservedAt: '', reservationExpiresAt: '' },
    }
  );

  return { released: result.modifiedCount };
}
