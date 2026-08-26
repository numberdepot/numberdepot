import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { centsToDollars } from '@/lib/utils/pricing';
import { priceOrder, type RequestedItem } from '@/lib/utils/order-pricing';

/**
 * POST /api/orders/quote — server-computed totals for the checkout page.
 *
 * Nothing is written to the database. The checkout page renders these numbers
 * rather than adding anything up itself, so the amount on screen is by
 * construction the amount that will be charged.
 */
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const auth = requireAuth(req);
    const body = await req.json();
    const requested = body?.items as RequestedItem[];

    const priced = await priceOrder(requested, {
      userId: new ObjectId(auth.userId),
      requireReservation: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: priced.items.map((i) => ({
          numberId: i.numberId?.toString() || null,
          number: i.number,
          rawNumber: i.rawNumber || null,
          numberType: i.numberType,
          source: i.source,
          planType: i.planType,
          price: centsToDollars(i.price),
          monthlyPrice: centsToDollars(i.monthlyPrice),
          numberbarnTn: i.numberbarnTn || null,
        })),
        feeLines: priced.feeLines.map((f) => ({
          id: f.id,
          label: f.label,
          perItem: f.perItem,
          quantity: f.quantity,
          unitAmount: centsToDollars(f.unitAmount),
          total: centsToDollars(f.total),
        })),
        subtotal: centsToDollars(priced.subtotal),
        feesTotal: centsToDollars(priced.feesTotal),
        monthlyTotal: centsToDollars(priced.monthlyTotal),
        totalAmount: centsToDollars(priced.totalAmount),
      },
    });
  });
}
