import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getOrdersCollection, getUserNumbersCollection } from '@/lib/collections';
import { centsToDollars } from '@/lib/utils/pricing';
import { toE164 } from '@/lib/utils/phone';

/**
 * The queue of paid-for numbers that still need a human.
 *
 * NumberBarn has no purchase API, so those numbers are bought by an operator on
 * numberbarn.com and then marked provisioned here. Until that happens the buyer
 * sees the number as "porting" rather than active.
 */

/** GET /api/admin/fulfillment — paid items still awaiting provisioning. */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const state = params.get('state') || 'pending'; // pending | done | all
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25')));
    const skip = (page - 1) * limit;
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');

    const ordersCol = await getOrdersCollection();

    const statuses =
      state === 'done'
        ? ['provisioned', 'failed']
        : state === 'all'
          ? ['awaiting_fulfillment', 'provisioned', 'failed']
          : ['awaiting_fulfillment'];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      status: 'completed' as const,
      items: { $elemMatch: { source: 'numberbarn', fulfillmentStatus: { $in: statuses } } },
    };
    if (dateFrom || dateTo) {
      filter.completedAt = {};
      if (dateFrom) filter.completedAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo) filter.completedAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [orders, total] = await Promise.all([
      ordersCol.find(filter).sort({ completedAt: -1 }).skip(skip).limit(limit).toArray(),
      ordersCol.countDocuments(filter),
    ]);

    // Flatten to one row per number — that is the unit of work.
    const rows = orders.flatMap((o) =>
      o.items
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) =>
            item.source === 'numberbarn' &&
            statuses.includes(item.fulfillmentStatus || 'awaiting_fulfillment')
        )
        .map(({ item, index }) => ({
          orderId: o._id.toString(),
          orderNumber: o.orderNumber,
          itemIndex: index,
          buyerEmail: o.userEmail || '',
          buyerId: o.userId.toString(),
          number: item.number,
          numberbarnTn: item.numberbarnTn || item.rawNumber || '',
          numberType: item.numberType,
          planType: item.planType,
          price: centsToDollars(item.price),
          fulfillmentStatus: item.fulfillmentStatus || 'awaiting_fulfillment',
          paidAt: o.completedAt?.toISOString() || o.createdAt.toISOString(),
          numberbarnUrl: `https://www.numberbarn.com/number/${item.numberbarnTn || ''}`,
        }))
    );

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  });
}

/**
 * PUT /api/admin/fulfillment
 * body: { orderId, itemIndex, status: "provisioned" | "failed", note? }
 *
 * Marks one number as handed over (or as failed, when NumberBarn sold it first
 * and the buyer needs a refund).
 */
export async function PUT(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));

    const { orderId, itemIndex, status } = body || {};

    if (!orderId || !ObjectId.isValid(String(orderId))) {
      return NextResponse.json({ error: 'Valid orderId is required' }, { status: 400 });
    }
    const index = Number(itemIndex);
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: 'Valid itemIndex is required' }, { status: 400 });
    }
    if (status !== 'provisioned' && status !== 'failed') {
      return NextResponse.json(
        { error: 'status must be "provisioned" or "failed"' },
        { status: 400 }
      );
    }

    const ordersCol = await getOrdersCollection();
    const order = await ordersCol.findOne({ _id: new ObjectId(String(orderId)) });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const item = order.items[index];
    if (!item) {
      return NextResponse.json({ error: 'Item not found on this order' }, { status: 404 });
    }
    if (item.source !== 'numberbarn') {
      return NextResponse.json(
        { error: 'Only NumberBarn items need manual fulfillment' },
        { status: 400 }
      );
    }

    const now = new Date();

    await ordersCol.updateOne(
      { _id: order._id },
      {
        $set: {
          [`items.${index}.fulfillmentStatus`]: status,
          updatedAt: now,
        },
      }
    );

    // Bring the buyer's copy of the number in line.
    try {
      const userNumsCol = await getUserNumbersCollection();
      const e164 = toE164(item.rawNumber || item.numberbarnTn || item.number);
      await userNumsCol.updateOne(
        { orderId: order._id, number: e164 },
        {
          $set:
            status === 'provisioned'
              ? {
                  status: 'active' as const,
                  portingStatus: 'completed' as const,
                  updatedAt: now,
                }
              : {
                  status: 'cancelled' as const,
                  portingNotes: typeof body.note === 'string' ? body.note.slice(0, 500) : 'Fulfillment failed',
                  updatedAt: now,
                },
        }
      );
    } catch (err) {
      console.error('[Fulfillment] Could not update user_numbers:', err);
    }

    try {
      const { createNotification } = await import('@/lib/utils/notifications');
      await createNotification({
        userId: order.userId.toString(),
        title: status === 'provisioned' ? 'Your number is ready' : 'A number could not be provisioned',
        message:
          status === 'provisioned'
            ? `${item.number} is now active on your account.`
            : `We could not secure ${item.number}. Our team will contact you about a refund.`,
        type: 'order',
        actionUrl: '/account/numbers',
        entityType: 'order',
        entityId: order._id.toString(),
      });
    } catch (err) {
      console.error('[Fulfillment] Notification failed:', err);
    }

    return NextResponse.json({ success: true, data: { orderId, itemIndex: index, status } });
  });
}
