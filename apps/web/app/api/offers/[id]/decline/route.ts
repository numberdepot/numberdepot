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

    let body: { reason?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    const offersColl = await getOffersCollection();
    const offer = await offersColl.findOne({ _id: new ObjectId(id) });
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    if (offer.status !== 'pending' && offer.status !== 'countered') return NextResponse.json({ error: 'Only pending or countered offers can be declined' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });
    const isAdmin = user?.role === 'admin';
    const isSeller = offer.sellerId?.toString() === payload.userId;
    if (!isAdmin && !isSeller) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const now = new Date();
    await offersColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'declined', declinedAt: now, sellerResponse: body.reason || '', updatedAt: now } }
    );

    const buyer = await db.collection('users').findOne({ _id: offer.buyerId });
    await createNotification({
      userId: offer.buyerId.toString(),
      title: 'Offer Declined',
      message: `Your offer on ${offer.formattedNumber || offer.number} has been declined.`,
      type: 'offer',
      actionUrl: '/account/offers',
      entityType: 'offer',
      entityId: id,
    });

    if (buyer?.email) {
      sendOfferNotification(buyer.email, 'declined', {
        number: offer.formattedNumber || offer.number,
        offerAmount: offer.offerAmount,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { message: 'Offer declined' } });
  });
}
