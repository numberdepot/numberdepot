import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { centsToDollars } from '@/lib/utils/pricing';

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const status = params.get('status');
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');

    const db = await getDb();
    const orders = db.collection('orders');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (status === 'paid') {
      filter.status = 'completed';
    } else if (status === 'pending') {
      filter.status = { $in: ['pending', 'processing'] };
    } else if (status === 'cancelled') {
      filter.status = { $in: ['failed', 'refunded'] };
    } else {
      // All — only orders that generate commissions
      filter.status = { $in: ['pending', 'processing', 'completed', 'failed', 'refunded'] };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const settings = db.collection('settings');
    const rateDoc = await settings.findOne({ key: 'defaultCommissionRate' });
    const commissionRate = (rateDoc?.value ?? 10) / 100;

    const [results, total] = await Promise.all([
      orders.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      orders.countDocuments(filter),
    ]);

    // Look up user info for each order
    const userIds = [...new Set(results.map((o) => o.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await db.collection('users').find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }).toArray()
      : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const commissions = results.map((order) => {
      const user = userMap.get(order.userId);
      const commissionAmount = Math.round((order.totalAmount || 0) * commissionRate);
      const mapStatus = (s: string) => {
        if (s === 'completed') return 'paid';
        if (s === 'failed' || s === 'refunded') return 'cancelled';
        return 'pending';
      };

      return {
        id: order._id.toString(),
        orderId: order.orderNumber || order._id.toString(),
        sellerId: order.userId || '',
        sellerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A',
        sellerEmail: user?.email || '',
        amount: centsToDollars(commissionAmount),
        rate: commissionRate,
        status: mapStatus(order.status),
        createdAt: order.createdAt?.toISOString?.() || order.createdAt || '',
        paidAt: order.completedAt?.toISOString?.() || order.completedAt || null,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: commissions,
      pagination: { page, limit, total, totalPages },
    });
  });
}
