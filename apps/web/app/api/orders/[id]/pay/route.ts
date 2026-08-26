import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Collection, type WithId } from 'mongodb';
import { requireAuth } from '@/lib/auth-middleware';
import {
  getOrdersCollection,
  getNumbersCollection,
  getUserNumbersCollection,
  getPaymentsCollection,
  getUsersCollection,
} from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { centsToDollars } from '@/lib/utils/pricing';
import { extractAreaCode, toE164 } from '@/lib/utils/phone';
import { chargeCard, getEnv, isConfigured, type BillTo, type GatewayResult } from '@/lib/authorizenet';
import { serializeOrder } from '../../route';
import type { NumberDoc, OrderDoc, PaymentDoc, UserNumberDoc } from '@/lib/types/db';

/** An order older than this must be rebuilt — prices and fees may have moved. */
const ORDER_MAX_AGE_MS = 60 * 60 * 1000;

/** What a number looked like before we claimed it, so a failure can undo it. */
interface Claim {
  numberId: ObjectId;
  previous: Pick<NumberDoc, 'status' | 'reservedBy' | 'reservedAt' | 'reservationExpiresAt'>;
}

/**
 * Claim every inventory number on the order, atomically and before any money
 * moves. Each update only matches while the number is still reserved by this
 * user and the reservation has not lapsed, so two buyers racing on the last
 * number can never both succeed.
 */
async function claimNumbers(
  numbersCol: Collection<NumberDoc>,
  order: WithId<OrderDoc>,
  userId: ObjectId,
  now: Date
): Promise<{ claims: Claim[]; failed: string | null }> {
  const claims: Claim[] = [];

  for (const item of order.items) {
    if (item.source !== 'inventory' || !item.numberId) continue;

    const previous = await numbersCol.findOneAndUpdate(
      {
        _id: item.numberId,
        status: 'reserved',
        reservedBy: userId,
        reservationExpiresAt: { $gt: now },
      },
      {
        $set: {
          status: 'sold' as const,
          ownerId: userId,
          orderId: order._id,
          soldAt: now,
          updatedAt: now,
        },
        $unset: { reservedBy: '', reservedAt: '', reservationExpiresAt: '' },
      },
      { returnDocument: 'before' }
    );

    if (!previous) {
      return { claims, failed: item.number };
    }

    claims.push({
      numberId: item.numberId,
      previous: {
        status: previous.status,
        reservedBy: previous.reservedBy,
        reservedAt: previous.reservedAt,
        reservationExpiresAt: previous.reservationExpiresAt,
      },
    });
  }

  return { claims, failed: null };
}

/** Put claimed numbers back exactly as they were. Best effort, never throws. */
async function releaseClaims(
  numbersCol: Collection<NumberDoc>,
  claims: Claim[],
  now: Date
): Promise<void> {
  for (const claim of claims) {
    try {
      const set: Record<string, unknown> = { status: claim.previous.status, updatedAt: now };
      const unset: Record<string, ''> = { ownerId: '', orderId: '', soldAt: '' };

      // Only restore reservation fields that actually had a value — writing
      // `undefined` back would leave nulls behind.
      if (claim.previous.reservedBy) set.reservedBy = claim.previous.reservedBy;
      else unset.reservedBy = '';
      if (claim.previous.reservedAt) set.reservedAt = claim.previous.reservedAt;
      else unset.reservedAt = '';
      if (claim.previous.reservationExpiresAt) set.reservationExpiresAt = claim.previous.reservationExpiresAt;
      else unset.reservationExpiresAt = '';

      await numbersCol.updateOne({ _id: claim.numberId }, { $set: set, $unset: unset });
    } catch (err) {
      console.error(`[Pay] Failed to release claim on ${claim.numberId.toString()}:`, err);
    }
  }
}

/** Release the processing lock so the buyer can try a different card. */
async function unlockOrder(
  ordersCol: Collection<OrderDoc>,
  orderId: ObjectId,
  now: Date,
  paymentStatus: OrderDoc['paymentStatus'],
  errorMessage?: string
): Promise<void> {
  await ordersCol.updateOne(
    { _id: orderId },
    {
      $set: {
        status: 'pending' as const,
        paymentStatus,
        updatedAt: now,
        ...(errorMessage ? { lastPaymentError: errorMessage } : {}),
      },
    }
  );
}

function sanitizeBillTo(input: unknown): BillTo | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const out: BillTo = {};
  const keys: (keyof BillTo)[] = [
    'firstName', 'lastName', 'company', 'address',
    'city', 'state', 'zip', 'country', 'phoneNumber',
  ];
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Persist the attempt whether it succeeded or not — declines matter too. */
async function recordPayment(
  order: WithId<OrderDoc>,
  userId: ObjectId,
  userEmail: string,
  userName: string,
  status: PaymentDoc['status'],
  result: GatewayResult | null,
  billTo: BillTo | undefined,
  message: string,
  now: Date
): Promise<ObjectId | null> {
  try {
    const paymentsCol = await getPaymentsCollection();
    const doc: PaymentDoc = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId,
      userEmail,
      userName,
      gateway: 'authorizenet',
      environment: getEnv(),
      amount: order.totalAmount,
      currency: 'USD',
      status,
      transactionId: result?.transactionId ?? null,
      authCode: result?.authCode ?? null,
      responseCode: result?.responseCode ?? null,
      reasonCode: result?.reasonCode ?? null,
      message,
      avsResultCode: result?.avsResultCode ?? null,
      cvvResultCode: result?.cvvResultCode ?? null,
      cardLast4: result?.cardLast4 ?? null,
      cardType: result?.cardType ?? null,
      billTo,
      items: order.items.map((i) => ({
        number: i.number,
        numberType: i.numberType,
        source: i.source,
        price: i.price,
        planType: i.planType,
      })),
      raw: result?.raw ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await paymentsCol.insertOne(doc);
    return inserted.insertedId;
  } catch (err) {
    console.error('[Pay] Failed to record payment attempt:', err);
    return null;
  }
}

/**
 * POST /api/orders/[id]/pay
 *
 * Charges the order through Authorize.Net using an Accept.js nonce. The number
 * is claimed before the charge and released again if the charge does not go
 * through, so a buyer is never charged for a number someone else got first, and
 * a number is never marked sold without a matching approved transaction.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const auth = requireAuth(req);
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Payments are not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const opaqueData = body?.opaqueData;
    if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
      return NextResponse.json(
        { error: 'Missing payment information. Please re-enter your card details.' },
        { status: 400 }
      );
    }
    const billTo = sanitizeBillTo(body?.billTo);

    const ordersCol = await getOrdersCollection();
    const numbersCol = await getNumbersCollection();
    const userNumsCol = await getUserNumbersCollection();
    const userId = new ObjectId(auth.userId);
    const now = new Date();
    const orderId = new ObjectId(id);

    const existing = await ordersCol.findOne({ _id: orderId, userId });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Already paid — answer idempotently rather than charging again.
    if (existing.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          alreadyPaid: true,
          order: serializeOrder(existing as OrderDoc & { _id: ObjectId }),
        },
      });
    }
    if (existing.status === 'processing') {
      return NextResponse.json(
        { error: 'This order is already being processed. Please wait a moment.' },
        { status: 409 }
      );
    }
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `This order is ${existing.status} and cannot be paid.` },
        { status: 400 }
      );
    }
    if (now.getTime() - existing.createdAt.getTime() > ORDER_MAX_AGE_MS) {
      return NextResponse.json(
        { error: 'This order has expired. Please return to your cart and check out again.' },
        { status: 410 }
      );
    }

    // ── Idempotency lock ──
    // Flipping pending → processing atomically means a double-clicked Pay
    // button, or two tabs, can only ever get one charge through.
    const order = await ordersCol.findOneAndUpdate(
      { _id: orderId, userId, status: 'pending' },
      {
        $set: { status: 'processing' as const, updatedAt: now },
        $inc: { paymentAttempts: 1 },
        $unset: { lastPaymentError: '' },
      },
      { returnDocument: 'before' }
    );

    if (!order) {
      return NextResponse.json(
        { error: 'This order is already being processed. Please wait a moment.' },
        { status: 409 }
      );
    }

    if (!(order.totalAmount > 0)) {
      await unlockOrder(ordersCol, orderId, now, 'unpaid', 'Order total is zero');
      return NextResponse.json({ error: 'Order total is invalid' }, { status: 400 });
    }

    // ── Claim the numbers before charging ──
    const { claims, failed } = await claimNumbers(numbersCol, order, userId, now);
    if (failed) {
      await releaseClaims(numbersCol, claims, now);
      await unlockOrder(ordersCol, orderId, now, 'unpaid');
      return NextResponse.json(
        {
          error: `${failed} is no longer available — your reservation expired or someone else bought it. You have not been charged.`,
        },
        { status: 409 }
      );
    }

    // Denormalised buyer details for the admin payments table.
    let userName = '';
    try {
      const usersCol = await getUsersCollection();
      const user = await usersCol.findOne({ _id: userId });
      userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    } catch {
      // Non-fatal — the email alone still identifies the buyer.
    }

    // ── Charge ──
    const amount = centsToDollars(order.totalAmount);
    let result: GatewayResult;
    try {
      result = await chargeCard({
        amount,
        opaqueData: {
          dataDescriptor: String(opaqueData.dataDescriptor),
          dataValue: String(opaqueData.dataValue),
        },
        invoiceNumber: order.orderNumber,
        description: `NumberDepot ${order.items.length} number${order.items.length > 1 ? 's' : ''}`,
        email: auth.email,
        customerId: userId.toString(),
        billTo,
        customerIp:
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          req.headers.get('x-real-ip') ||
          undefined,
        lineItems: order.items.map((item, index) => ({
          itemId: `num-${index + 1}`,
          name: item.number,
          description: `${item.numberType} · ${item.planType}`,
          quantity: 1,
          unitPrice: centsToDollars(item.price),
        })),
        refId: `${order.orderNumber}-${(order.paymentAttempts ?? 0) + 1}`,
      });
    } catch (err) {
      // Network failure or misconfiguration — no charge was made.
      const message = err instanceof Error ? err.message : 'Payment gateway unreachable';
      console.error('[Pay] Gateway call failed:', err);
      await releaseClaims(numbersCol, claims, now);
      await unlockOrder(ordersCol, orderId, now, 'unpaid', message);
      await recordPayment(order, userId, auth.email, userName, 'error', null, billTo, message, now);
      return NextResponse.json(
        { error: 'We could not reach the payment processor. You have not been charged — please try again.' },
        { status: 502 }
      );
    }

    // ── Declined or errored ──
    if (!result.ok && result.status !== 'held') {
      await releaseClaims(numbersCol, claims, now);
      await unlockOrder(ordersCol, orderId, now, 'declined', result.message);
      await recordPayment(
        order, userId, auth.email, userName,
        result.status === 'declined' ? 'declined' : 'error',
        result, billTo, result.message, now
      );

      // A decline message from the gateway is written for the cardholder and is
      // safe to pass through. An `error` is a technical fault — "Invalid OTS
      // Token" means nothing to a buyer — so show something actionable and keep
      // the gateway wording on the payment record for the admin.
      const userMessage =
        result.status === 'declined'
          ? result.message || 'Your card was declined. Please try a different payment method.'
          : 'We could not process that card. Please check the details and try again, or use a different card.';

      console.error(
        `[Pay] ${order.orderNumber} ${result.status} — code=${result.responseCode} reason=${result.reasonCode}: ${result.message}`
      );

      return NextResponse.json({ error: userMessage }, { status: 402 });
    }

    // ── Held for review ──
    // Authorize.Net may still capture this. The numbers stay claimed so nobody
    // else can buy them, but nothing is provisioned until an admin resolves it.
    if (result.status === 'held') {
      const paymentRef = await recordPayment(
        order, userId, auth.email, userName, 'held', result, billTo, result.message, now
      );
      await ordersCol.updateOne(
        { _id: orderId },
        {
          $set: {
            status: 'processing' as const,
            paymentStatus: 'held' as const,
            paymentMethod: 'authorizenet',
            paymentId: result.transactionId || undefined,
            ...(paymentRef ? { paymentRef } : {}),
            billTo,
            updatedAt: now,
            lastPaymentError: result.message,
          },
        }
      );
      return NextResponse.json({
        success: true,
        data: {
          held: true,
          status: 'processing',
          message:
            'Your payment is being reviewed by our processor. We will email you as soon as it clears — no further action is needed.',
        },
      });
    }

    // ── Approved ──
    const paymentRef = await recordPayment(
      order, userId, auth.email, userName, 'approved', result, billTo, result.message, now
    );

    const userNumbers: UserNumberDoc[] = order.items.map((item) => {
      const e164 = toE164(item.rawNumber || item.number);
      const isInventory = item.source === 'inventory';
      return {
        userId,
        numberId: item.numberId,
        number: e164,
        formattedNumber: item.number,
        numberType: item.numberType,
        areaCode: extractAreaCode(e164),
        source: item.source,
        plan: item.planType as UserNumberDoc['plan'],
        monthlyPrice: item.monthlyPrice,
        // Inventory numbers are ours to hand over immediately. NumberBarn
        // numbers have to be fulfilled by an admin first (their public API has
        // no purchase endpoint), so they start as porting, not active.
        status: isInventory ? ('active' as const) : ('porting' as const),
        forwardingEnabled: false,
        voicemailEnabled: false,
        portingStatus: isInventory ? undefined : ('pending' as const),
        orderId: order._id,
        purchasedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (userNumbers.length > 0) {
      try {
        await userNumsCol.insertMany(userNumbers);
      } catch (err) {
        // The customer has paid — never fail the request over this. Surfaced in
        // the admin order view so it can be fixed by hand.
        console.error('[Pay] Failed to create user_numbers records:', err);
      }
    }

    const hasNumberBarnItems = order.items.some((i) => i.source === 'numberbarn');

    await ordersCol.updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'completed' as const,
          paymentStatus: 'paid' as const,
          paymentMethod: 'authorizenet',
          paymentId: result.transactionId || undefined,
          ...(paymentRef ? { paymentRef } : {}),
          billTo,
          items: order.items.map((item) => ({
            ...item,
            fulfillmentStatus:
              item.source === 'inventory'
                ? ('provisioned' as const)
                : ('awaiting_fulfillment' as const),
          })),
          completedAt: now,
          updatedAt: now,
        },
        $unset: { lastPaymentError: '' },
      }
    );

    // ── Best-effort notifications ──
    try {
      const { createNotification } = await import('@/lib/utils/notifications');
      await createNotification({
        userId: auth.userId,
        title: 'Payment successful',
        message: `Order ${order.orderNumber} — $${amount.toFixed(2)} paid. ${
          hasNumberBarnItems
            ? 'Some numbers are being provisioned and will appear shortly.'
            : 'Your numbers are ready.'
        }`,
        type: 'order',
        actionUrl: '/account/orders',
        entityType: 'order',
        entityId: order._id.toString(),
      });
    } catch (err) {
      console.error('[Pay] Notification failed:', err);
    }

    try {
      const { sendOrderConfirmation } = await import('@/lib/resend');
      await sendOrderConfirmation(
        auth.email,
        order.orderNumber,
        order.items.map((i) => ({
          number: i.number,
          price: i.price,
          monthlyPrice: i.monthlyPrice,
        })),
        amount
      );
    } catch (err) {
      console.error('[Pay] Confirmation email failed:', err);
    }

    const updated = await ordersCol.findOne({ _id: orderId });

    return NextResponse.json({
      success: true,
      data: {
        status: 'completed',
        transactionId: result.transactionId,
        authCode: result.authCode,
        cardLast4: result.cardLast4,
        cardType: result.cardType,
        amount,
        orderNumber: order.orderNumber,
        hasPendingFulfillment: hasNumberBarnItems,
        order: updated ? serializeOrder(updated as OrderDoc & { _id: ObjectId }) : null,
      },
    });
  });
}
