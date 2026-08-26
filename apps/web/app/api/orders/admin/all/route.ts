import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getOrdersCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { centsToDollars } from '@/lib/utils/pricing';
import type { OrderDoc, OrderItem, UserDoc } from '@/lib/types/db';

type OrderWithBuyer = OrderDoc & { _id: import('mongodb').ObjectId; buyer?: UserDoc[] };

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = params.get('status');

    const col = await getOrdersCollection();
    const filter: Partial<Pick<OrderDoc, 'status'>> = {};
    if (status) filter.status = status as OrderDoc['status'];

    // The admin table shows the buyer's name and email, so join the user in
    // rather than sending a bare userId the UI can only render as "N/A".
    const [orders, total] = await Promise.all([
      col
        .aggregate<OrderWithBuyer>([
          { $match: filter },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'buyer',
              pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
            },
          },
        ])
        .toArray(),
      col.countDocuments(filter),
    ]);

    const data = orders.map((o) => {
      const buyer = o.buyer?.[0];
      return {
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        userId: o.userId.toString(),
        userEmail: buyer?.email || o.userEmail || '',
        userName: [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ') || '',
        status: o.status,
        paymentStatus: o.paymentStatus || 'unpaid',
        paymentMethod: o.paymentMethod || null,
        paymentId: o.paymentId || null,
        totalAmount: centsToDollars(o.totalAmount),
        subtotal: centsToDollars(o.subtotal),
        feesTotal: centsToDollars(o.feesTotal ?? 0),
        setupFees: centsToDollars(o.setupFees ?? 0),
        monthlyTotal: centsToDollars(o.monthlyTotal ?? 0),
        itemCount: o.items.length,
        items: o.items.map((i: OrderItem) => ({
          id: i.numberId?.toString() || i.numberbarnTn || i.number,
          number: i.number,
          type: i.numberType,
          source: i.source,
          planType: i.planType,
          price: centsToDollars(i.price),
          fulfillmentStatus: i.fulfillmentStatus || 'pending',
        })),
        lastPaymentError: o.lastPaymentError || null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt?.toISOString() || null,
        completedAt: o.completedAt?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  });
}
