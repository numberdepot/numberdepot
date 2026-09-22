import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getOffersCollection } from '@/lib/collections';
import { getDb } from '@/lib/db';
import { centsToDollars } from '@/lib/utils/pricing';

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const status = params.get('status');
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const offersColl = await getOffersCollection();
    const db = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    // Expire old offers
    const now = new Date();
    await offersColl.updateMany(
      { status: 'pending', expiresAt: { $lt: now } },
      { $set: { status: 'expired', updatedAt: now } }
    );

    const [offers, total] = await Promise.all([
      offersColl.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      offersColl.countDocuments(filter),
    ]);

    // Get buyer + seller details
    const userIds = new Set<string>();
    offers.forEach((o) => {
      userIds.add(o.buyerId.toString());
      if (o.sellerId) userIds.add(o.sellerId.toString());
    });

    const users = userIds.size > 0
      ? await db.collection('users').find({ _id: { $in: [...userIds].map((id) => new ObjectId(id)) } }).toArray()
      : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const data = offers.map((o) => {
      const buyer = userMap.get(o.buyerId.toString());
      const seller = o.sellerId ? userMap.get(o.sellerId.toString()) : null;
      return {
        id: o._id!.toString(),
        numberId: o.numberId.toString(),
        number: o.formattedNumber || o.number,
        listingPrice: centsToDollars(o.listingPrice),
        offerAmount: centsToDollars(o.offerAmount),
        counterAmount: o.counterAmount ? centsToDollars(o.counterAmount) : null,
        buyerCounter: o.buyerCounter ? centsToDollars(o.buyerCounter) : null,
        buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : 'Unknown',
        buyerEmail: buyer?.email || '',
        sellerName: seller ? `${seller.firstName} ${seller.lastName}`.trim() : 'Platform',
        sellerEmail: seller?.email || '',
        buyerMessage: o.buyerMessage || '',
        sellerResponse: o.sellerResponse || '',
        status: o.status,
        createdAt: o.createdAt?.toISOString?.() || '',
        updatedAt: o.updatedAt?.toISOString?.() || '',
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  });
}
