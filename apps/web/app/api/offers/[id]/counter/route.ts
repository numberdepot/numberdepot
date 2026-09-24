import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth, isAdminRole, ADMIN_CANNOT_SHOP } from '@/lib/auth-middleware';
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

    // Buyer can only counter-back a countered offer
    if (isBuyer && offer.status !== 'countered') {
      return NextResponse.json({ error: 'You can only counter a counter offer' }, { status: 400 });
    }
    if (!isAdmin && !isSeller && !isBuyer) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const now = new Date();

    // Every counter restarts the response clock. `expiresAt` is set once when
    // the offer is created, and the list routes expire any *pending* offer past
    // it — so without this, a negotiation still going on day 8 would be swept
    // away mid-conversation because the original 7 days had run out.
    const RESPONSE_WINDOW_DAYS = 7;
    const expiresAt = new Date(now.getTime() + RESPONSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const updateFields: Record<string, unknown> = { updatedAt: now, expiresAt };

    // The two sides write to two DIFFERENT fields. An earlier version set
    // `counterAmount` on every counter, so a buyer countering back overwrote
    // the admin's counter — the admin panel then showed its own counter as the
    // buyer's figure, and checkout charged whatever the buyer had typed.
    if (isBuyer) {
      updateFields.buyerCounter = counterCents;
      // Keep the opening message intact; the counter's note is its own field.
      updateFields.buyerCounterMessage = typeof sellerResponse === 'string' ? sellerResponse.slice(0, 1000) : '';
      // Back to the admin's court.
      updateFields.status = 'pending';
    } else {
      updateFields.counterAmount = counterCents;
      updateFields.sellerResponse = typeof sellerResponse === 'string' ? sellerResponse.slice(0, 1000) : '';
      updateFields.status = 'countered';
    }

    // The buyer's previous counter-back is answered once the admin replies, so
    // it stops being the live figure. Clearing it keeps the admin list from
    // flagging this offer as still awaiting a response.
    await offersColl.updateOne(
      { _id: new ObjectId(id) },
      isBuyer
        ? { $set: updateFields }
        : { $set: updateFields, $unset: { buyerCounter: '' as const, buyerCounterMessage: '' as const } }
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
