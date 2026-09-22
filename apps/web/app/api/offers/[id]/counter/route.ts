import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { getOffersCollection } from '@/lib/collections';
import { dollarsToCents } from '@/lib/utils/pricing';
import { createNotification } from '@/lib/utils/notifications';
import { sendOfferNotification } from '@/lib/resend';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const payload = requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    const { counterAmount, sellerResponse } = body;
    if (!counterAmount) return NextResponse.json({ error: 'Counter amount required' }, { status: 400 });

    const counterCents = dollarsToCents(parseFloat(counterAmount));
    if (counterCents <= 0) return NextResponse.json({ error: 'Counter amount must be positive' }, { status: 400 });

    const offersColl = await getOffersCollection();
    const offer = await offersColl.findOne({ _id: new ObjectId(id) });
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    if (offer.status !== 'pending' && offer.status !== 'countered') {
      return NextResponse.json({ error: 'Only pending or countered offers can be countered' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });
    const isAdmin = user?.role === 'admin';
    const isSeller = offer.sellerId?.toString() === payload.userId;
    const isBuyer = offer.buyerId?.toString() === payload.userId;

    // Buyer can only counter-back a countered offer
    if (isBuyer && offer.status !== 'countered') {
      return NextResponse.json({ error: 'You can only counter a counter offer' }, { status: 400 });
    }
    if (!isAdmin && !isSeller && !isBuyer) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const now = new Date();
    const updateFields: Record<string, unknown> = {
      status: 'countered',
      counterAmount: counterCents,
      updatedAt: now,
    };

    // If buyer is countering back, store as buyerCounter; if admin/seller, store as sellerResponse
    if (isBuyer) {
      updateFields.buyerCounter = counterCents;
      updateFields.buyerMessage = sellerResponse || '';
      // Reset status to pending so admin sees the new counter from buyer
      updateFields.status = 'pending';
    } else {
      updateFields.sellerResponse = sellerResponse || '';
    }

    await offersColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (isBuyer) {
      // Notify admins about buyer's counter
      const admins = await db.collection('users').find({ role: 'admin' }).toArray();
      const buyerName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Buyer';
      for (const admin of admins) {
        await createNotification({
          userId: admin._id.toString(),
          title: 'Buyer Counter Offer',
          message: `${buyerName} countered with $${(counterCents / 100).toFixed(2)} for ${offer.formattedNumber || offer.number}.`,
          type: 'offer',
          actionUrl: '/admin/offers',
          entityType: 'offer',
          entityId: id,
        });

        if (admin.email) {
          sendOfferNotification(admin.email, 'counter', {
            number: offer.formattedNumber || offer.number,
            offerAmount: offer.offerAmount,
            counterAmount: counterCents,
          }).catch(() => {});
        }
      }
    } else {
      // Notify buyer about seller/admin counter
      const buyer = await db.collection('users').findOne({ _id: offer.buyerId });
      await createNotification({
        userId: offer.buyerId.toString(),
        title: 'Counter Offer Received',
        message: `A counter offer of $${(counterCents / 100).toFixed(2)} has been made on ${offer.formattedNumber || offer.number}.`,
        type: 'offer',
        actionUrl: '/account/offers',
        entityType: 'offer',
        entityId: id,
      });

      if (buyer?.email) {
        sendOfferNotification(buyer.email, 'counter', {
          number: offer.formattedNumber || offer.number,
          offerAmount: offer.offerAmount,
          counterAmount: counterCents,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, data: { message: 'Counter offer sent' } });
  });
}
