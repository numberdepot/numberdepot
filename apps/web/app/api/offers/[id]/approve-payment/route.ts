import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import {
  getOffersCollection,
  getNumbersCollection,
  getOrdersCollection,
  getUserNumbersCollection,
  getPaymentsCollection,
  getUsersCollection,
} from '@/lib/collections';
import { agreedOfferAmount } from '@/lib/utils/offer-pricing';
import { centsToDollars, dollarsToCents } from '@/lib/utils/pricing';
import { extractAreaCode, toE164 } from '@/lib/utils/phone';
import { getFees } from '@/lib/utils/fees';
import { insertOrderWithNumber } from '@/lib/utils/order-number';
import { getEnv } from '@/lib/authorizenet';
import type { OrderFeeLine, UserNumberDoc } from '@/lib/types/db';

const METHODS = ['bank_transfer', 'cash', 'cheque', 'card_in_person', 'other'] as const;
type ManualMethod = (typeof METHODS)[number];

const METHOD_LABEL: Record<ManualMethod, string> = {
  bank_transfer: 'bank transfer',
  cash: 'cash',
  cheque: 'cheque',
  card_in_person: 'card in person',
  other: 'other',
};

/**
 * POST /api/offers/[id]/approve-payment
 * body: { method, reference?, note? }
 *
 * Records a payment the buyer made OUTSIDE the gateway — bank transfer, cash,
 * a cheque — and completes the sale exactly as a card payment would: the number
 * transfers to the buyer, an order is completed, and a payment row is written
 * so the figure still appears in revenue.
 *
 * This is bookkeeping, not a charge. No money moves here; the admin is
 * asserting that it already has. Every approval records which admin did it and
 * their reference, because there is no gateway transaction to point at later.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const admin = requireAdmin(req);
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const method: ManualMethod = METHODS.includes(body?.method) ? body.method : 'other';
    const reference = typeof body?.reference === 'string' ? body.reference.trim().slice(0, 200) : '';

    // A reference is what makes this auditable later — there is no transaction
    // id to fall back on.
    if (!reference) {
      return NextResponse.json(
        { error: 'Add a reference (transfer id, cheque number, receipt no.) so this payment can be traced later.' },
        { status: 400 }
      );
    }

    const offersCol = await getOffersCollection();
    const numbersCol = await getNumbersCollection();
    const ordersCol = await getOrdersCollection();
    const now = new Date();

    const offer = await offersCol.findOne({ _id: new ObjectId(id) });
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    if (offer.paidAt) {
      return NextResponse.json({ error: 'This offer has already been paid.' }, { status: 409 });
    }
    // An offer that lapsed on its payment window is still fair game — the money
    // arriving late is exactly why this endpoint exists.
    if (offer.status !== 'accepted' && offer.status !== 'expired') {
      return NextResponse.json(
        { error: `Only an accepted offer can be marked paid (this one is ${offer.status}).` },
        { status: 400 }
      );
    }

    const agreedPriceCents = agreedOfferAmount(offer);
    if (!(agreedPriceCents > 0)) {
      return NextResponse.json({ error: 'This offer has no agreed price.' }, { status: 409 });
    }

    const numberDoc = await numbersCol.findOne({ _id: offer.numberId });
    if (!numberDoc) {
      return NextResponse.json({ error: 'That number no longer exists.' }, { status: 409 });
    }

    // ── Claim the number before writing anything else ──
    // Guarded so a number already sold to someone else can never be handed over
    // twice. Everything after this is rolled back if it fails.
    const claimed = await numbersCol.findOneAndUpdate(
      { _id: offer.numberId, status: { $ne: 'sold' } },
      {
        $set: {
          status: 'sold' as const,
          ownerId: offer.buyerId,
          soldAt: now,
          updatedAt: now,
        },
        $unset: { reservedBy: '', reservedAt: '', reservationExpiresAt: '' },
      },
      { returnDocument: 'before' }
    );

    if (!claimed) {
      return NextResponse.json(
        { error: 'That number has already been sold, so this payment cannot be applied.' },
        { status: 409 }
      );
    }

    const releaseNumber = async () => {
      try {
        await numbersCol.updateOne(
          { _id: offer.numberId },
          {
            $set: { status: claimed.status, updatedAt: now },
            $unset: { ownerId: '', orderId: '', soldAt: '' },
          }
        );
      } catch (err) {
        console.error('[ApprovePayment] Rollback failed for', offer.numberId.toString(), err);
      }
    };

    try {
      // ── Order ──
      // Reuse the pending order the buyer already raised at checkout, if any,
      // so one sale never shows up as two orders.
      const fees = await getFees();
      const feeLines: OrderFeeLine[] = fees
        .filter((f) => f.amount > 0)
        .map((f) => {
          const unitAmount = dollarsToCents(f.amount);
          return { id: f.id, label: f.label, unitAmount, perItem: f.perItem, quantity: 1, total: unitAmount };
        });
      const feesTotal = feeLines.reduce((sum, f) => sum + f.total, 0);
      const totalAmount = agreedPriceCents + feesTotal;

      const users = await getUsersCollection();
      const buyer = await users.findOne({ _id: offer.buyerId });
      const buyerEmail = buyer?.email || offer.buyerId.toString();
      const buyerName = [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ').trim();

      const existing = await ordersCol.findOne({
        offerId: offer._id,
        status: { $in: ['pending', 'processing', 'failed'] },
      });

      const orderFields = {
        status: 'completed' as const,
        paymentStatus: 'paid' as const,
        paymentMethod: `manual:${method}`,
        paymentId: reference,
        completedAt: now,
        updatedAt: now,
        items: [{
          numberId: numberDoc._id,
          number: numberDoc.formattedNumber,
          rawNumber: numberDoc.number,
          numberType: numberDoc.numberType,
          source: 'inventory' as const,
          price: agreedPriceCents,
          setupFee: 0,
          monthlyPrice: numberDoc.monthlyPrice || 0,
          planType: 'park',
          fulfillmentStatus: 'provisioned' as const,
        }],
        feeLines,
        subtotal: agreedPriceCents,
        feesTotal,
        setupFees: 0,
        monthlyTotal: numberDoc.monthlyPrice || 0,
        totalAmount,
      };

      let orderId: ObjectId;
      let orderNumber: string;

      if (existing) {
        await ordersCol.updateOne(
          { _id: existing._id },
          { $set: orderFields, $unset: { lastPaymentError: '' } }
        );
        orderId = existing._id;
        orderNumber = existing.orderNumber;
      } else {
        const inserted = await insertOrderWithNumber(ordersCol, (num) => ({
          orderNumber: num,
          userId: offer.buyerId,
          userEmail: buyerEmail,
          offerId: offer._id,
          paymentAttempts: 0,
          createdAt: now,
          ...orderFields,
        }));
        orderId = inserted.insertedId;
        orderNumber = inserted.orderNumber;
      }

      await ordersCol.updateOne({ _id: orderId }, { $set: { updatedAt: now } });
      await numbersCol.updateOne({ _id: offer.numberId }, { $set: { orderId } });

      // ── Payment record, so manual sales still count in revenue ──
      try {
        const paymentsCol = await getPaymentsCollection();
        await paymentsCol.insertOne({
          orderId,
          orderNumber,
          userId: offer.buyerId,
          userEmail: buyerEmail,
          userName: buyerName,
          gateway: 'manual',
          environment: getEnv(),
          amount: totalAmount,
          currency: 'USD',
          status: 'approved',
          message: `Recorded manually by ${admin.email} — ${METHOD_LABEL[method]} — ref ${reference}`,
          manualMethod: method,
          manualReference: reference,
          recordedBy: new ObjectId(admin.userId),
          items: [{
            number: numberDoc.formattedNumber,
            numberType: numberDoc.numberType,
            source: 'inventory' as const,
            price: agreedPriceCents,
            planType: 'park',
          }],
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.error('[ApprovePayment] Could not write the payment record:', err);
      }

      // ── Hand the number to the buyer ──
      try {
        const userNumsCol = await getUserNumbersCollection();
        const e164 = toE164(numberDoc.number);
        const already = await userNumsCol.findOne({ orderId, number: e164 });
        if (!already) {
          const doc: UserNumberDoc = {
            userId: offer.buyerId,
            numberId: numberDoc._id,
            number: e164,
            formattedNumber: numberDoc.formattedNumber,
            numberType: numberDoc.numberType,
            areaCode: extractAreaCode(e164),
            source: 'inventory',
            plan: 'park',
            monthlyPrice: numberDoc.monthlyPrice || 0,
            status: 'active',
            forwardingEnabled: false,
            voicemailEnabled: false,
            orderId,
            purchasedAt: now,
            createdAt: now,
            updatedAt: now,
          };
          await userNumsCol.insertOne(doc);
        }
      } catch (err) {
        console.error('[ApprovePayment] Could not create the user_numbers record:', err);
      }

      // ── Close the offer ──
      await offersCol.updateOne(
        { _id: offer._id },
        {
          $set: {
            status: 'accepted' as const,
            paidAt: now,
            paidManually: true,
            orderId,
            sellerResponse: `Payment received via ${METHOD_LABEL[method]} (ref ${reference}).`,
            updatedAt: now,
          },
          $unset: { expiredReason: '' },
        }
      );

      // ── Tell the buyer ──
      try {
        const { createNotification } = await import('@/lib/utils/notifications');
        await createNotification({
          userId: offer.buyerId.toString(),
          title: 'Payment confirmed',
          message: `We have recorded your ${METHOD_LABEL[method]} payment for ${numberDoc.formattedNumber}. The number is now active on your account.`,
          type: 'billing',
          actionUrl: '/account/numbers',
          entityType: 'order',
          entityId: orderId.toString(),
        });
      } catch (err) {
        console.error('[ApprovePayment] Notification failed:', err);
      }

      try {
        if (buyer?.email) {
          const { sendOrderConfirmation } = await import('@/lib/resend');
          await sendOrderConfirmation(
            buyer.email,
            orderNumber,
            [{ number: numberDoc.formattedNumber, price: agreedPriceCents, monthlyPrice: numberDoc.monthlyPrice || 0 }],
            centsToDollars(totalAmount)
          );
        }
      } catch (err) {
        console.error('[ApprovePayment] Email failed:', err);
      }

      return NextResponse.json({
        success: true,
        data: {
          orderId: orderId.toString(),
          orderNumber,
          amount: centsToDollars(totalAmount),
          method,
          reference,
          message: `Payment recorded. ${numberDoc.formattedNumber} is now active for ${buyerEmail}.`,
        },
      });
    } catch (err) {
      // The number was claimed but the sale did not complete — give it back
      // rather than leaving it sold to someone who owns no record of it.
      await releaseNumber();
      console.error('[ApprovePayment] Failed, number released:', err);
      return NextResponse.json(
        { error: 'Could not complete the manual payment. Nothing was changed — please try again.' },
        { status: 500 }
      );
    }
  });
}
