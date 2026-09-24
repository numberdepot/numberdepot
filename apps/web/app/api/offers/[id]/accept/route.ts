import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth, isAdminRole, ADMIN_CANNOT_SHOP } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { getOffersCollection } from '@/lib/collections';
import { createNotification } from '@/lib/utils/notifications';
import { liveOfferAmount } from '@/lib/utils/offer-pricing';
import { getPaymentWindowHours, addHours } from '@/lib/utils/offer-window';
import { sendOfferNotification } from '@/lib/resend';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const payload = requireAuth(req);
    const { id } = await params;

    const offersColl = await getOffersCollection();
    const offer = await offersColl.findOne({ _id: new ObjectId(id) });
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    if (offer.status !== 'pending' && offer.status !== 'countered') {
      return NextResponse.json({ error: 'Only pending or countered offers can be accepted' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });
    const isAdmin = isAdminRole(user?.role);
    const isSeller = offer.sellerId?.toString() === payload.userId;
    const isBuyer = offer.buyerId?.toString() === payload.userId;


    // An admin runs the marketplace and must never be a party to a purchase.
    // Their seller-side powers below are untouched; this only stops them acting
    // as the buyer, which can only happen on a legacy offer made before the
    // account was promoted.
    if (isBuyer && isAdmin) {
      return NextResponse.json({ error: ADMIN_CANNOT_SHOP }, { status: 403 });
    }

    // Buyer can only accept a countered offer (accepting the counter price)
    if (isBuyer && offer.status !== 'countered') {
      return NextResponse.json({ error: 'You can only accept a counter offer' }, { status: 400 });
    }
    if (!isAdmin && !isSeller && !isBuyer) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // Freeze the agreed figure now, while we still know whose number was on the
    // table. Deriving it later at checkout is how a buyer's counter-back ended
    // up being charged as though the admin had agreed to it.
    const live = liveOfferAmount(offer);

    // Whoever accepts is accepting the OTHER side's number. Accepting your own
    // standing figure is not a deal — it means the UI offered an action it
    // should not have.
    if (isBuyer && live.from === 'buyer') {
      return NextResponse.json(
        { error: 'Wait for a counter offer before accepting.' },
        { status: 400 }
      );
    }
    if (!isBuyer && live.from === 'seller') {
      return NextResponse.json(
        { error: 'You already countered — wait for the buyer to respond.' },
        { status: 400 }
      );
    }

    const now = new Date();

    // The buyer now has a limited window to pay. Past it, a cron expires the
    // offer and the number goes back on sale, so an accepted offer can no
    // longer sit on a number indefinitely.
    const windowHours = await getPaymentWindowHours();
    const paymentDueAt = addHours(now, windowHours);

    await offersColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'accepted',
          agreedAmount: live.amount,
          acceptedAt: now,
          paymentDueAt,
          updatedAt: now,
        },
        $unset: { expiredReason: '' },
      }
    );

    // Auto-decline all other pending/countered offers on the same number
    const competingOffers = await offersColl.find({
      numberId: offer.numberId,
      _id: { $ne: new ObjectId(id) },
      status: { $in: ['pending', 'countered'] },
    }).toArray();

    if (competingOffers.length > 0) {
      await offersColl.updateMany(
        {
          numberId: offer.numberId,
          _id: { $ne: new ObjectId(id) },
          status: { $in: ['pending', 'countered'] },
        },
        { $set: { status: 'declined', declinedAt: now, sellerResponse: 'Another offer was accepted for this number.', updatedAt: now } }
      );

      // Notify each declined buyer
      for (const competing of competingOffers) {
        const competingBuyer = await db.collection('users').findOne({ _id: competing.buyerId });

        await createNotification({
          userId: competing.buyerId.toString(),
          title: 'Offer Declined',
          message: `Your offer on ${competing.formattedNumber || competing.number} has been declined — another offer was accepted.`,
          type: 'offer',
          actionUrl: '/account/offers',
          entityType: 'offer',
          entityId: competing._id!.toString(),
        });

        if (competingBuyer?.email) {
          sendOfferNotification(competingBuyer.email, 'declined', {
            number: competing.formattedNumber || competing.number,
            offerAmount: competing.offerAmount,
          }).catch(() => {});
        }
      }
    }

    // Notify the accepted buyer
    const buyer = await db.collection('users').findOne({ _id: offer.buyerId });
    const agreedPrice = live.amount;
    await createNotification({
      userId: offer.buyerId.toString(),
      title: 'Offer Accepted!',
      message: `Your offer of $${(agreedPrice / 100).toFixed(2)} on ${offer.formattedNumber || offer.number} has been accepted. Pay within ${windowHours} hours to secure it — after that the offer expires and the number goes back on sale.`,
      type: 'offer',
      actionUrl: '/account/offers',
      entityType: 'offer',
      entityId: id,
    });

    if (buyer?.email) {
      sendOfferNotification(buyer.email, 'accepted', {
        number: offer.formattedNumber || offer.number,
        offerAmount: agreedPrice,
        paymentDueAt,
        windowHours,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { message: 'Offer accepted' } });
  });
}
