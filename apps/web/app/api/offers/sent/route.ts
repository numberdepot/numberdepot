import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getOffersCollection } from '@/lib/collections';
import { centsToDollars } from '@/lib/utils/pricing';
import { liveOfferAmount } from '@/lib/utils/offer-pricing';

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const payload = requireAuth(req);

    const params = req.nextUrl.searchParams;
    const status = params.get('status');

    const offersColl = await getOffersCollection();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { buyerId: new ObjectId(payload.userId) };
    if (status) filter.status = status;

    // Expire old offers inline
    const now = new Date();
    await offersColl.updateMany(
      { status: 'pending', expiresAt: { $lt: now } },
      { $set: { status: 'expired', updatedAt: now } }
    );

    const offers = await offersColl.find(filter).sort({ createdAt: -1 }).limit(50).toArray();

    const data = offers.map((o) => ({
      id: o._id!.toString(),
      numberId: o.numberId.toString(),
      number: o.formattedNumber || o.number,
      listingPrice: centsToDollars(o.listingPrice),
      amount: centsToDollars(o.offerAmount),
      counterAmount: o.counterAmount != null ? centsToDollars(o.counterAmount) : null,
      buyerCounter: o.buyerCounter != null ? centsToDollars(o.buyerCounter) : null,
      agreedAmount: o.agreedAmount != null ? centsToDollars(o.agreedAmount) : null,
      paymentDueAt: o.paymentDueAt?.toISOString?.() || null,
      paidAt: o.paidAt?.toISOString?.() || null,
      expiredReason: o.expiredReason || null,
      // The figure currently on the table, and whose it is.
      liveAmount: centsToDollars(liveOfferAmount(o).amount),
      liveFrom: liveOfferAmount(o).from,
      buyerMessage: o.buyerMessage || '',
      sellerResponse: o.sellerResponse || '',
      status: o.status,
      createdAt: o.createdAt?.toISOString?.() || '',
      updatedAt: o.updatedAt?.toISOString?.() || '',
      phoneNumber: { formatted: o.formattedNumber || o.number, numberType: 'local' },
      listing: { salePrice: centsToDollars(o.listingPrice) },
    }));

    return NextResponse.json({ success: true, data });
  });
}
