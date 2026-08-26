import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getPaymentsCollection } from '@/lib/collections';
import { centsToDollars } from '@/lib/utils/pricing';
import type { PaymentDoc } from '@/lib/types/db';

/**
 * GET /api/payments/admin
 *
 * Every gateway attempt, newest first — who paid, how much, for which numbers.
 * Buyer name/email and the item list are denormalised onto the payment record,
 * so this renders without a join and stays accurate even if the user later
 * changes their details.
 */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25')));
    const skip = (page - 1) * limit;
    const status = params.get('status');
    const search = params.get('q')?.trim();
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');

    const col = await getPaymentsCollection();

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;
    if (dateFrom || dateTo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateFilter: any = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo) dateFilter.$lte = new Date(dateTo + 'T23:59:59.999Z');
      filter.createdAt = dateFilter;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = { $regex: escaped, $options: 'i' };
      filter.$or = [
        { userEmail: rx },
        { userName: rx },
        { orderNumber: rx },
        { transactionId: rx },
        { 'items.number': rx },
      ];
    }

    const [payments, total, summary] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
      // Totals are computed across every payment, not just this page.
      col
        .aggregate<{ _id: PaymentDoc['status']; count: number; amount: number }>([
          { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
        ])
        .toArray(),
    ]);

    const byStatus: Record<string, { count: number; amount: number }> = {};
    for (const row of summary) {
      byStatus[row._id] = { count: row.count, amount: centsToDollars(row.amount) };
    }

    const approved = byStatus.approved || { count: 0, amount: 0 };
    const refunded = byStatus.refunded || { count: 0, amount: 0 };

    return NextResponse.json({
      success: true,
      data: payments.map((p) => ({
        id: p._id.toString(),
        orderId: p.orderId.toString(),
        orderNumber: p.orderNumber,
        userId: p.userId.toString(),
        userName: p.userName || '',
        userEmail: p.userEmail,
        amount: centsToDollars(p.amount),
        currency: p.currency,
        status: p.status,
        gateway: p.gateway,
        environment: p.environment,
        transactionId: p.transactionId || null,
        authCode: p.authCode || null,
        message: p.message,
        responseCode: p.responseCode || null,
        avsResultCode: p.avsResultCode || null,
        cvvResultCode: p.cvvResultCode || null,
        cardLast4: p.cardLast4 || null,
        cardType: p.cardType || null,
        billTo: p.billTo || null,
        items: p.items.map((i) => ({
          number: i.number,
          numberType: i.numberType,
          source: i.source,
          planType: i.planType,
          price: centsToDollars(i.price),
        })),
        refundedAmount: p.refundedAmount ? centsToDollars(p.refundedAmount) : 0,
        refundedAt: p.refundedAt?.toISOString() || null,
        voidedAt: p.voidedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: {
        byStatus,
        grossRevenue: approved.amount,
        approvedCount: approved.count,
        refundedAmount: refunded.amount,
        netRevenue: Math.round((approved.amount - refunded.amount) * 100) / 100,
        totalAttempts: summary.reduce((sum, row) => sum + row.count, 0),
      },
    });
  });
}
