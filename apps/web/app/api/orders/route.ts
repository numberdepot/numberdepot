import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { getOrdersCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { centsToDollars } from '@/lib/utils/pricing';
import { priceOrder, type RequestedItem } from '@/lib/utils/order-pricing';
import { insertOrderWithNumber } from '@/lib/utils/order-number';
import type { OrderDoc } from '@/lib/types/db';

/** Shapes an order document for the client. All money is returned in dollars. */
export function serializeOrder(o: OrderDoc & { _id: ObjectId }) {
  return {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus || 'unpaid',
    paymentMethod: o.paymentMethod || null,
    paymentId: o.paymentId || null,
    subtotal: centsToDollars(o.subtotal),
    feesTotal: centsToDollars(o.feesTotal ?? 0),
    monthlyTotal: centsToDollars(o.monthlyTotal ?? 0),
    totalAmount: centsToDollars(o.totalAmount),
    feeLines: (o.feeLines || []).map((f) => ({
      id: f.id,
      label: f.label,
      perItem: f.perItem,
      quantity: f.quantity,
      unitAmount: centsToDollars(f.unitAmount),
      total: centsToDollars(f.total),
    })),
    items: o.items.map((i) => ({
      numberId: i.numberId?.toString() || null,
      number: i.number,
      rawNumber: i.rawNumber || null,
      numberType: i.numberType,
      source: i.source,
      planType: i.planType,
      price: centsToDollars(i.price),
      monthlyPrice: centsToDollars(i.monthlyPrice),
      fulfillmentStatus: i.fulfillmentStatus || 'pending',
      numberbarnTn: i.numberbarnTn || null,
    })),
    lastPaymentError: o.lastPaymentError || null,
    createdAt: o.createdAt.toISOString(),
    completedAt: o.completedAt?.toISOString() || null,
  };
}

/**
 * POST /api/orders — create a pending order from the cart.
 *
 * Every price is recomputed here from our own database and from NumberBarn.
 * Nothing the browser sends about money is trusted.
 */
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const auth = requireAuth(req);
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
