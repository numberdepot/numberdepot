import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import {
  getPaymentsCollection,
  getOrdersCollection,
  getNumbersCollection,
  getUserNumbersCollection,
} from '@/lib/collections';
import { centsToDollars, dollarsToCents } from '@/lib/utils/pricing';
import { refundTransaction, voidTransaction, isConfigured } from '@/lib/authorizenet';

/**
 * POST /api/payments/admin/[id]/refund
 * body: { action: "refund" | "void", amount?: number }
 *
 * Void cancels a transaction that has not settled yet (same day); refund
 * returns money on one that has. Authorize.Net rejects a void once the batch
 * has settled, so the error message steers the admin to the other action.
 *
 * On success the numbers go back on sale and the buyer's records are removed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    requireAdmin(req);
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
    }
    if (!isConfigured()) {
      return NextResponse.json({ error: 'Authorize.Net is not configured' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'void' ? 'void' : 'refund';

    const paymentsCol = await getPaymentsCollection();
    const payment = await paymentsCol.findOne({ _id: new ObjectId(id) });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (!payment.transactionId) {
      return NextResponse.json(
        { error: 'This attempt never produced a transaction, so there is nothing to reverse' },
        { status: 400 }
      );
    }
    if (payment.status === 'refunded' || payment.status === 'voided') {
      return NextResponse.json(
        { error: `This payment has already been ${payment.status}` },
        { status: 409 }
      );
    }
    if (payment.status !== 'approved' && payment.status !== 'held') {
      return NextResponse.json(
        { error: `Only an approved payment can be reversed (this one is ${payment.status})` },
        { status: 400 }
      );
    }

    const alreadyRefunded = payment.refundedAmount ?? 0;
    const maxRefundable = payment.amount - alreadyRefunded;
    const requested = body?.amount != null ? dollarsToCents(Number(body.amount)) : maxRefundable;

    if (action === 'refund') {
      if (!(requested > 0) || requested > maxRefundable) {
        return NextResponse.json(
          { error: `Refund must be between $0.01 and $${centsToDollars(maxRefundable).toFixed(2)}` },
          { status: 400 }
        );
      }
      if (!payment.cardLast4) {
        return NextResponse.json(
          { error: 'Cannot refund — the card details for this transaction were not recorded' },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const refId = `${payment.orderNumber}-${action}`.slice(0, 20);

    const result =
      action === 'void'
        ? await voidTransaction(payment.transactionId, refId)
        : await refundTransaction(
            payment.transactionId,
            centsToDollars(requested),
            payment.cardLast4 as string,
            refId
          );

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            action === 'void'
              ? `Void failed: ${result.message}. If the transaction has already settled, issue a refund instead.`
              : `Refund failed: ${result.message}. If the transaction has not settled yet, void it instead.`,
        },
        { status: 402 }
      );
    }

    const fullyReversed = action === 'void' || alreadyRefunded + requested >= payment.amount;

    await paymentsCol.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: action === 'void' ? ('voided' as const) : ('refunded' as const),
          ...(action === 'void'
            ? { voidedAt: now }
            : { refundedAmount: alreadyRefunded + requested, refundedAt: now }),
          updatedAt: now,
        },
      }
    );

    // Only put the numbers back when the whole payment has been reversed — a
    // partial refund is a price adjustment, not a cancelled sale.
    if (fullyReversed) {
      const ordersCol = await getOrdersCollection();
      const numbersCol = await getNumbersCollection();
      const userNumsCol = await getUserNumbersCollection();

      const order = await ordersCol.findOne({ _id: payment.orderId });

      if (order) {
        for (const item of order.items) {
          if (item.source !== 'inventory' || !item.numberId) continue;
          try {
            await numbersCol.updateOne(
              { _id: item.numberId, orderId: order._id },
              {
                $set: { status: 'available' as const, updatedAt: now },
                $unset: { ownerId: '', orderId: '', soldAt: '' },
              }
            );
          } catch (err) {
            console.error(`[Refund] Could not relist ${item.numberId.toString()}:`, err);
          }
        }

        try {
          await userNumsCol.deleteMany({ orderId: order._id });
        } catch (err) {
          console.error('[Refund] Could not remove user_numbers records:', err);
        }

        await ordersCol.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'refunded' as const,
              paymentStatus: action === 'void' ? ('voided' as const) : ('refunded' as const),
              items: order.items.map((i) => ({ ...i, fulfillmentStatus: 'refunded' as const })),
              updatedAt: now,
            },
          }
        );

        try {
          const { createNotification } = await import('@/lib/utils/notifications');
          await createNotification({
            userId: order.userId.toString(),
            title: action === 'void' ? 'Payment cancelled' : 'Refund issued',
            message: `Order ${order.orderNumber} — $${centsToDollars(
              action === 'void' ? payment.amount : requested
            ).toFixed(2)} has been returned to your card.`,
            type: 'billing',
            actionUrl: '/account/orders',
            entityType: 'order',
            entityId: order._id.toString(),
          });
        } catch (err) {
          console.error('[Refund] Notification failed:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        transactionId: result.transactionId,
        amount: centsToDollars(action === 'void' ? payment.amount : requested),
        fullyReversed,
        message: result.message,
      },
    });
  });
}
