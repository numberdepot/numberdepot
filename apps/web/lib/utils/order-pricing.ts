import { ObjectId } from 'mongodb';
import { getNumbersCollection } from '../collections';
import { dollarsToCents } from './pricing';
import { getFees } from './fees';
import { HttpError } from '../http-error';
import type { OrderFeeLine, OrderItem } from '../types/db';

/**
 * The single source of truth for what an order costs.
 *
 * Everything the browser sends is treated as a *request*, never as a price.
 * Inventory numbers are priced from their MongoDB document; NumberBarn numbers
 * are re-fetched live from NumberBarn and re-marked-up here. This is what stops
 * a tampered request body ({ price: 0.01 }) from becoming a real charge, and
 * what keeps the total shown at checkout identical to the total charged.
 */

export interface RequestedItem {
  phoneNumberId?: string;
  source?: string;
  planType?: string;
  numberbarnTn?: string;
  rawNumber?: string;
}

export interface PricedOrder {
  items: OrderItem[];
  feeLines: OrderFeeLine[];
  subtotal: number; // cents
  feesTotal: number; // cents
  monthlyTotal: number; // cents — recurring, not part of today's charge
  totalAmount: number; // cents — the amount to charge
}

export class PricingError extends HttpError {
  constructor(message: string, status = 400) {
    super(message, status);
    this.name = 'PricingError';
  }
}

interface PriceOptions {
  userId: ObjectId;
  /**
   * When true (order creation and payment), an inventory number must be held by
   * an unexpired reservation belonging to this user. When false (quote), a
   * still-available number is accepted too, so the checkout page can render a
   * total without failing on a reservation that lapsed a second ago.
   */
  requireReservation: boolean;
}

const VALID_PLANS = new Set(['park', 'forward', 'unlimited', 'business']);

function normalisePlan(plan: unknown): string {
  const p = String(plan || 'park').toLowerCase();
  return VALID_PLANS.has(p) ? p : 'park';
}

export async function priceOrder(
  requested: RequestedItem[],
  options: PriceOptions
): Promise<PricedOrder> {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new PricingError('No items to price');
  }
  if (requested.length > 25) {
    throw new PricingError('A single order can contain at most 25 numbers');
  }

  const numbersCol = await getNumbersCollection();
  const now = new Date();
  const items: OrderItem[] = [];

  // Reject duplicates up front — the same number twice would double-charge and
  // then fail to claim on the second pass.
  const seen = new Set<string>();

  for (const raw of requested) {
    const source = raw.source === 'numberbarn' ? 'numberbarn' : 'inventory';
    const planType = normalisePlan(raw.planType);

    if (source === 'numberbarn') {
      const tn = String(raw.numberbarnTn || raw.rawNumber || '').replace(/\D/g, '');
      if (!tn) {
        throw new PricingError('A NumberBarn item is missing its telephone number');
      }
      if (seen.has(tn)) {
        throw new PricingError('The same number appears twice in your cart');
      }
      seen.add(tn);

      // Price from NumberBarn directly. If the lookup fails we must abort — we
      // will never fall back to a price supplied by the browser.
      const { getNumberInfo, toOurFormat } = await import('../numberbarn');
      let nbNumber;
      try {
        nbNumber = await getNumberInfo(tn);
      } catch (err) {
        throw new PricingError(
          `Could not verify the price of ${tn} with NumberBarn. Please try again.`,
          502
        );
      }
      if (!nbNumber) {
        throw new PricingError(`${tn} is no longer available on NumberBarn`, 409);
      }

      const formatted = await toOurFormat(nbNumber);

      items.push({
        number: formatted.number,
        rawNumber: tn,
        numberType: formatted.numberType,
        source: 'numberbarn',
        price: dollarsToCents(formatted.salePrice),
        setupFee: 0,
        monthlyPrice: dollarsToCents(formatted.monthlyPrice || 0),
        planType,
        numberbarnTn: tn,
        fulfillmentStatus: 'pending',
      });
      continue;
    }

    // ── Inventory number ──
    const id = String(raw.phoneNumberId || '');
    if (!ObjectId.isValid(id)) {
      throw new PricingError(`Invalid number id: ${id || '(missing)'}`);
    }
    if (seen.has(id)) {
      throw new PricingError('The same number appears twice in your cart');
    }
    seen.add(id);

    const doc = await numbersCol.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      throw new PricingError('One of the numbers in your cart no longer exists', 409);
    }

    const heldByUser =
      doc.status === 'reserved' &&
      doc.reservedBy?.equals(options.userId) &&
      !!doc.reservationExpiresAt &&
      doc.reservationExpiresAt > now;

    if (options.requireReservation) {
      if (!heldByUser) {
        throw new PricingError(
          `${doc.formattedNumber} is no longer reserved for you. Please add it to your cart again.`,
          409
        );
      }
    } else if (!heldByUser && doc.status !== 'available') {
      throw new PricingError(`${doc.formattedNumber} is no longer available`, 409);
    }

    items.push({
      numberId: doc._id,
      number: doc.formattedNumber,
      rawNumber: doc.number,
      numberType: doc.numberType,
      source: 'inventory',
      price: doc.price,
      setupFee: 0,
      monthlyPrice: doc.monthlyPrice || 0,
      planType,
      fulfillmentStatus: 'pending',
    });
  }

  // ── Fees ──
  // The cart shows subtotal + admin-configured fees, so that is exactly what we
  // charge. Per-number `setupFee`/`monthlyPrice` on the number document are not
  // added on top; doing so would double-count and charge more than was shown.
  const fees = await getFees();
  const feeLines: OrderFeeLine[] = fees
    .filter((f) => f.amount > 0)
    .map((f) => {
      const quantity = f.perItem ? items.length : 1;
      const unitAmount = dollarsToCents(f.amount);
      return {
        id: f.id,
        label: f.label,
        unitAmount,
        perItem: f.perItem,
        quantity,
        total: unitAmount * quantity,
      };
    });

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const feesTotal = feeLines.reduce((sum, f) => sum + f.total, 0);
  const monthlyTotal = items.reduce((sum, i) => sum + i.monthlyPrice, 0);
  const totalAmount = subtotal + feesTotal;

  if (totalAmount <= 0) {
    throw new PricingError('Order total must be greater than zero');
  }

  return { items, feeLines, subtotal, feesTotal, monthlyTotal, totalAmount };
}
