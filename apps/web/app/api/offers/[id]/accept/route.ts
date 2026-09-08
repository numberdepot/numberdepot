import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { getOffersCollection } from '@/lib/collections';
import { createNotification } from '@/lib/utils/notifications';
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
    const isAdmin = user?.role === 'admin';
    const isSeller = offer.sellerId?.toString() === payload.userId;
    if (!isAdmin && !isSeller) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const now = new Date();
    await offersColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'accepted', acceptedAt: now, updatedAt: now } }
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
    const agreedPrice = offer.counterAmount || offer.offerAmount;
    await createNotification({
      userId: offer.buyerId.toString(),
      title: 'Offer Accepted!',
      message: `Your offer of $${(agreedPrice / 100).toFixed(2)} on ${offer.formattedNumber || offer.number} has been accepted. Click "Pay Now" to complete your purchase.`,
      type: 'offer',
      actionUrl: '/account/offers',
      entityType: 'offer',
      entityId: id,
    });

    if (buyer?.email) {
      sendOfferNotification(buyer.email, 'accepted', {
        number: offer.formattedNumber || offer.number,
        offerAmount: agreedPrice,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { message: 'Offer accepted' } });
  });
}
