import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { getOffersCollection, getNumbersCollection } from '@/lib/collections';
import { dollarsToCents, centsToDollars } from '@/lib/utils/pricing';
import { createNotification } from '@/lib/utils/notifications';
import { sendOfferNotification } from '@/lib/resend';

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const payload = requireAuth(req);
    const body = await req.json();

    const { numberId, amount, message } = body;

    if (!numberId || !amount) {
      return NextResponse.json({ error: 'Number ID and offer amount are required' }, { status: 400 });
    }

    const offerAmountCents = dollarsToCents(parseFloat(amount));
    if (offerAmountCents <= 0) {
      return NextResponse.json({ error: 'Offer amount must be positive' }, { status: 400 });
    }

    const numbersColl = await getNumbersCollection();

    // Handle both regular MongoDB IDs and nb_ prefixed IDs
    let numberDoc;
    if (numberId.startsWith('nb_')) {
      return NextResponse.json({ error: 'Offers are not available for NumberBarn numbers' }, { status: 400 });
    }

    try {
      numberDoc = await numbersColl.findOne({ _id: new ObjectId(numberId) });
    } catch {
      return NextResponse.json({ error: 'Invalid number ID' }, { status: 400 });
    }

    if (!numberDoc) {
      return NextResponse.json({ error: 'Number not found' }, { status: 404 });
    }

    if (numberDoc.status !== 'available' && numberDoc.status !== 'reserved') {
      return NextResponse.json({ error: 'Number is not available for offers' }, { status: 400 });
    }

    // Server-side minimum offer validation
    if (numberDoc.minimumOffer && offerAmountCents < numberDoc.minimumOffer) {
      const minDollars = (numberDoc.minimumOffer / 100).toFixed(2);
      return NextResponse.json(
        { error: `Minimum offer for this number is $${minDollars}` },
        { status: 400 }
      );
    }

    // Check for existing pending offer from this buyer on this number
    const offersColl = await getOffersCollection();
    const existingOffer = await offersColl.findOne({
      buyerId: new ObjectId(payload.userId),
      numberId: new ObjectId(numberId),
      status: { $in: ['pending', 'countered'] },
    });

    if (existingOffer) {
      return NextResponse.json({ error: 'You already have an active offer on this number' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const offerDoc = {
      buyerId: new ObjectId(payload.userId),
      sellerId: numberDoc.ownerId || null,
      numberId: numberDoc._id!,
      number: numberDoc.number,
      formattedNumber: numberDoc.formattedNumber,
      listingPrice: numberDoc.price,
      offerAmount: offerAmountCents,
      buyerMessage: message || '',
      status: 'pending' as const,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const result = await offersColl.insertOne(offerDoc);

    // Create notification for admin (since inventory numbers are admin-owned)
    const db = await getDb();
    const buyer = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });
    const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : 'A buyer';

    // Notify admins
    const admins = await db.collection('users').find({ role: 'admin' }).toArray();
    for (const admin of admins) {
      await createNotification({
        userId: admin._id.toString(),
        title: 'New Offer Received',
        message: `${buyerName} offered $${(offerAmountCents / 100).toFixed(2)} for ${numberDoc.formattedNumber}`,
        type: 'offer',
        actionUrl: '/admin/offers',
        entityType: 'offer',
        entityId: result.insertedId.toString(),
      });

      // Email notification
      if (admin.email) {
        sendOfferNotification(admin.email, 'new_offer', {
          number: numberDoc.formattedNumber,
          offerAmount: offerAmountCents,
          buyerName,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...offerDoc,
        offerAmount: centsToDollars(offerDoc.offerAmount),
        listingPrice: centsToDollars(offerDoc.listingPrice),
      },
    });
  });
}
