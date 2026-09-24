import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getOffersCollection, getNumbersCollection, getUsersCollection } from '@/lib/collections';
import { agreedOfferAmount } from '@/lib/utils/offer-pricing';
import { addHours, getPaymentWindowHours } from '@/lib/utils/offer-window';
import { createNotification } from '@/lib/utils/notifications';
import { sendOfferNotification } from '@/lib/resend';

/**
 * PUT /api/offers/[id]/extend-payment
 * body: { hours?: number }
 *
 * Gives the buyer more time to pay. Two cases, one endpoint:
 *
 *   accepted, still in window → push the deadline out
 *   expired on its payment window → revive it and start a fresh window
 *
 * Reviving only works while the number is still free. Once it has been sold to
 * someone else there is nothing to give back, and saying so plainly beats
 * quietly reinstating an offer the buyer can never complete.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const admin = requireAdmin(req);
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const requested = Number(body?.hours);
    const hours = Number.isFinite(requested) && requested >= 1 && requested <= 24 * 30
      ? requested
      : await getPaymentWindowHours();

    const offersCol = await getOffersCollection();
    const offer = await offersCol.findOne({ _id: new ObjectId(id) });
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (offer.paidAt) {
      return NextResponse.json({ error: 'This offer has already been paid' }, { status: 400 });
    }

    const reviving = offer.status === 'expired';
    if (!reviving && offer.status !== 'accepted') {
      return NextResponse.json(
        { error: `Only an accepted or expired offer can be given more time (this one is ${offer.status}).` },
        { status: 400 }
      );
    }
    if (reviving && offer.expiredReason !== 'payment_window') {
      return NextResponse.json(
        { error: 'This offer expired because it was never answered, not because payment was missed. Ask the buyer to place a new offer.' },
        { status: 400 }
      );
    }

    // Reviving is only honest if the number is still gettable.
    if (reviving) {
      const numbersCol = await getNumbersCollection();
      const numberDoc = await numbersCol.findOne({ _id: offer.numberId });
      if (!numberDoc) {
        return NextResponse.json({ error: 'That number no longer exists' }, { status: 409 });
      }
      if (numberDoc.status === 'sold') {
        return NextResponse.json(
          { error: 'That number has already been sold to someone else, so this offer cannot be reopened.' },
          { status: 409 }
        );
      }
    }

    const now = new Date();
    const paymentDueAt = addHours(now, hours);

    await offersCol.updateOne(
      { _id: offer._id },
      {
        $set: {
          status: 'accepted' as const,
          paymentDueAt,
          paymentExtendedAt: now,
          paymentExtendedBy: new ObjectId(admin.userId),
          updatedAt: now,
        },
        $inc: { paymentExtensionCount: 1 },
        $unset: { expiredReason: '', sellerResponse: '' },
      }
    );

    const amount = agreedOfferAmount(offer);

    try {
      await createNotification({
        userId: offer.buyerId.toString(),
        title: reviving ? 'Your offer has been reopened' : 'More time to pay',
        message: reviving
          ? `Good news — your offer on ${offer.formattedNumber || offer.number} has been reopened. You have ${hours} more hours to pay.`
          : `You now have ${hours} more hours to pay for ${offer.formattedNumber || offer.number}.`,
        type: 'offer',
        actionUrl: '/account/offers',
        entityType: 'offer',
        entityId: id,
      });
    } catch (err) {
      console.error('[ExtendPayment] Notification failed:', err);
    }

    try {
      const users = await getUsersCollection();
      const buyer = await users.findOne({ _id: offer.buyerId }, { projection: { email: 1 } });
      if (buyer?.email) {
        sendOfferNotification(buyer.email, 'payment_extended', {
          number: offer.formattedNumber || offer.number,
          offerAmount: amount,
          paymentDueAt,
          windowHours: hours,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[ExtendPayment] Email failed:', err);
    }

    return NextResponse.json({
      success: true,
      data: {
        reopened: reviving,
        hours,
        paymentDueAt: paymentDueAt.toISOString(),
        message: reviving
          ? `Offer reopened — the buyer has ${hours}h to pay.`
          : `Deadline extended — the buyer has ${hours}h to pay.`,
      },
    });
  });
}
