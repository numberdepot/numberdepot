import type { ObjectId } from 'mongodb';
import { centsToDollars } from './pricing';
import type { OrderDoc } from '../types/db';

/**
 * Shapes an order document for the client. All money is returned in dollars.
 *
 * Lives in lib/ rather than next to the route handler on purpose: Next.js only
 * permits route files to export handlers and config, and the build's type check
 * rejects any other export — so sharing this from api/orders/route.ts broke the
 * production build.
 */
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
