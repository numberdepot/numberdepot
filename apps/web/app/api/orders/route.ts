import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth, requireCustomer } from '@/lib/auth-middleware';
import { getOrdersCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { priceOrder, type RequestedItem } from '@/lib/utils/order-pricing';
import { insertOrderWithNumber } from '@/lib/utils/order-number';
import { serializeOrder } from '@/lib/utils/order-serialize';
import type { OrderDoc } from '@/lib/types/db';


/**
 * POST /api/orders — create a pending order from the cart.
 *
 * Every price is recomputed here from our own database and from NumberBarn.
 * Nothing the browser sends about money is trusted.
 */
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const auth = await requireCustomer(req);
    const body = await req.json();
    const requested = body?.items as RequestedItem[];

    const userId = new ObjectId(auth.userId);
    const priced = await priceOrder(requested, { userId, requireReservation: true });

    const ordersCol = await getOrdersCollection();
    const now = new Date();

    const { orderNumber, insertedId } = await insertOrderWithNumber(ordersCol, (num) => ({
      orderNumber: num,
      userId,
      userEmail: auth.email,
      items: priced.items,
      feeLines: priced.feeLines,
      subtotal: priced.subtotal,
      feesTotal: priced.feesTotal,
      setupFees: 0,
      monthlyTotal: priced.monthlyTotal,
      totalAmount: priced.totalAmount,
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

/** GET /api/orders — the signed-in user's own orders. */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const auth = requireAuth(req);
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(params.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const ordersCol = await getOrdersCollection();
    const userId = new ObjectId(auth.userId);

    const [orders, total] = await Promise.all([
      ordersCol.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      ordersCol.countDocuments({ userId }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders.map((o) => serializeOrder(o as OrderDoc & { _id: ObjectId })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  });
}
