import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getOffersCollection, getNumbersCollection, getOrdersCollection } from '@/lib/collections';
import { getFees } from '@/lib/utils/fees';
import { dollarsToCents } from '@/lib/utils/pricing';
import { insertOrderWithNumber } from '@/lib/utils/order-number';
import { serializeOrder } from '@/app/api/orders/route';
import type { OrderDoc, OrderFeeLine } from '@/lib/types/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const auth = requireAuth(req);
    const { id } = await params;

    const offersColl = await getOffersCollection();
    let offerId: ObjectId;
    try {
      offerId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });
    }

    const offer = await offersColl.findOne({ _id: offerId });
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (offer.buyerId.toString() !== auth.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (offer.status !== 'accepted') {
      return NextResponse.json({ error: 'Only accepted offers can be checked out' }, { status: 400 });
    }

    // Agreed price is the counter amount (if admin countered) or the original offer amount
    const agreedPriceCents = offer.counterAmount || offer.offerAmount;

    // Verify the number still exists and is available
    const numbersColl = await getNumbersCollection();
    const numberDoc = await numbersColl.findOne({ _id: offer.numberId });
    if (!numberDoc) {
      return NextResponse.json({ error: 'Number no longer exists' }, { status: 409 });
    }
    if (numberDoc.status === 'sold') {
      return NextResponse.json({ error: 'Number has already been sold' }, { status: 409 });
    }

    // Reserve the number for this buyer (30 min)
    const now = new Date();
    const reservationExpires = new Date(now.getTime() + 30 * 60 * 1000);
    await numbersColl.updateOne(
      { _id: offer.numberId },
      {
        $set: {
          status: 'reserved',
          reservedBy: new ObjectId(auth.userId),
          reservedAt: now,
          reservationExpiresAt: reservationExpires,
          updatedAt: now,
        },
      }
    );

    // Calculate fees
    const fees = await getFees();
    const feeLines: OrderFeeLine[] = fees
      .filter((f) => f.amount > 0)
      .map((f) => {
        const quantity = f.perItem ? 1 : 1;
        const unitAmount = dollarsToCents(f.amount);
        return {
          id: f.id,
          label: f.label,
          unitAmount,
          perItem: f.perItem,
          quantity,
          total: unitAmount * quantity,
        };
      });

    const feesTotal = feeLines.reduce((sum, f) => sum + f.total, 0);
    const totalAmount = agreedPriceCents + feesTotal;

    // Create the pending order
    const userId = new ObjectId(auth.userId);
    const ordersCol = await getOrdersCollection();

    const { insertedId } = await insertOrderWithNumber(ordersCol, (orderNumber) => ({
      orderNumber,
      userId,
      userEmail: auth.email,
      offerId: offerId,
      items: [{
        numberId: numberDoc._id,
        number: numberDoc.formattedNumber,
        rawNumber: numberDoc.number,
        numberType: numberDoc.numberType,
        source: 'inventory' as const,
        price: agreedPriceCents,
        setupFee: 0,
        monthlyPrice: numberDoc.monthlyPrice || 0,
        planType: 'park',
        fulfillmentStatus: 'pending' as const,
      }],
      feeLines,
      subtotal: agreedPriceCents,
      feesTotal,
      setupFees: 0,
      monthlyTotal: numberDoc.monthlyPrice || 0,
      totalAmount,
      status: 'pending' as const,
      paymentStatus: 'unpaid' as const,
      paymentAttempts: 0,
      createdAt: now,
      updatedAt: now,
    }));

    const created = await ordersCol.findOne({ _id: insertedId });
    if (!created) {
      return NextResponse.json({ error: 'Order could not be created' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: serializeOrder(created as OrderDoc & { _id: ObjectId }),
    });
  });
}
