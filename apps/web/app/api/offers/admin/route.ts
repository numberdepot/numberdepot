import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getOffersCollection } from '@/lib/collections';
import { getDb } from '@/lib/db';
import { centsToDollars } from '@/lib/utils/pricing';
import { liveOfferAmount } from '@/lib/utils/offer-pricing';

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const status = params.get('status');
    const search = params.get('q')?.trim();
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const offersColl = await getOffersCollection();
    const db = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    // ── Search by phone number or by the person who made the offer ──
    if (search) {
      const escapeRx = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escaped = escapeRx(search);
      const digits = search.replace(/\D/g, '');

      // The number is stored twice: E.164 digits ("12012496789") and formatted
      // ("(201) 249-6789"). Match whichever the admin happened to type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const or: Record<string, any>[] = [
        { formattedNumber: { $regex: escaped, $options: 'i' } },
      ];
      if (digits.length >= 2) or.push({ number: { $regex: digits } });

      // People live in another collection, so resolve them to ids first.
      // Every word typed must match somewhere on the user, which is what makes
      // "scott klein" work when the two halves sit in different fields.
      const tokens = search.split(/\s+/).filter(Boolean).slice(0, 5);
      const userFilter = {
        $and: tokens.map((t) => {
          const rx = { $regex: escapeRx(t), $options: 'i' };
          return { $or: [{ firstName: rx }, { lastName: rx }, { email: rx }] };
        }),
      };
      const matchedUsers = await db
        .collection('users')
        .find(userFilter, { projection: { _id: 1 } })
        .limit(200)
        .toArray();

      if (matchedUsers.length > 0) {
        const ids = matchedUsers.map((u) => u._id);
        or.push({ buyerId: { $in: ids } }, { sellerId: { $in: ids } });
      }

      filter.$or = or;
    }

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
        counterAmount: o.counterAmount != null ? centsToDollars(o.counterAmount) : null,
        buyerCounter: o.buyerCounter != null ? centsToDollars(o.buyerCounter) : null,
        agreedAmount: o.agreedAmount != null ? centsToDollars(o.agreedAmount) : null,
        paymentDueAt: o.paymentDueAt?.toISOString?.() || null,
        paidAt: o.paidAt?.toISOString?.() || null,
        paidManually: !!o.paidManually,
        expiredReason: o.expiredReason || null,
        paymentExtensionCount: o.paymentExtensionCount || 0,
        buyerCounterMessage: o.buyerCounterMessage || '',
        // Whose figure is live right now, so the UI never has to guess.
        liveAmount: centsToDollars(liveOfferAmount(o).amount),
        liveFrom: liveOfferAmount(o).from,
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
