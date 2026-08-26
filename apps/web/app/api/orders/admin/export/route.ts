import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getOrdersCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { centsToDollars } from '@/lib/utils/pricing';

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const status = params.get('status');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const col = await getOrdersCollection();
    const orders = await col.find(filter).sort({ createdAt: -1 }).limit(50000).toArray();

    // Quote any field that could contain a comma so the CSV stays parseable.
    const csvCell = (value: string | number) => {
      const s = String(value ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = [
      'Order Number', 'User ID', 'Buyer Email', 'Status', 'Payment Status',
      'Transaction ID', 'Subtotal', 'Fees', 'Monthly Total', 'Total Amount',
      'Items', 'Numbers', 'Payment Method', 'Created', 'Completed',
    ].join(',');

    const rows = orders.map((o) => [
      o.orderNumber || o._id.toString(),
      o.userId.toString(),
      o.userEmail || '',
      o.status,
      o.paymentStatus || 'unpaid',
      o.paymentId || '',
      centsToDollars(o.subtotal ?? 0).toFixed(2),
      centsToDollars(o.feesTotal ?? o.setupFees ?? 0).toFixed(2),
      centsToDollars(o.monthlyTotal ?? 0).toFixed(2),
      centsToDollars(o.totalAmount ?? 0).toFixed(2),
      o.items?.length || 0,
      (o.items || []).map((i) => i.number).join(' | '),
      o.paymentMethod || '',
      o.createdAt?.toISOString?.() || '',
      o.completedAt?.toISOString?.() || '',
    ].map(csvCell).join(','));

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  });
}
