import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { LedgerService } from '@/lib/services/ledger';
import { SmartRouter } from '@/lib/services/router';
import { memoryStore } from '@/lib/store/memoryCache';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { amount: requestedRefundAmount } = body;

    // Fetch payment
    const payment = await db.get<any>('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { status, amount, currency, merchant_id, provider, refunded_amount = 0, version = 1 } = payment;

    if (status !== 'CAPTURED' && status !== 'SETTLED' && status !== 'PARTIALLY_REFUNDED') {
      return NextResponse.json(
        { error: `Cannot refund payment with status: ${status}. Expected: CAPTURED, SETTLED, or PARTIALLY_REFUNDED.` },
        { status: 400 }
      );
    }

    const currentRefunded = Number(refunded_amount || 0);
    const totalAmount = Number(amount);
    const remainingRefundable = totalAmount - currentRefunded;

    const finalRefundAmount = requestedRefundAmount ? Number(requestedRefundAmount) : remainingRefundable;

    if (finalRefundAmount <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than 0.' }, { status: 400 });
    }

    if (finalRefundAmount > remainingRefundable) {
      return NextResponse.json(
        {
          error: `Requested refund of $${finalRefundAmount.toFixed(2)} exceeds remaining refundable balance of $${remainingRefundable.toFixed(2)} (Total: $${totalAmount.toFixed(2)}, Previously Refunded: $${currentRefunded.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const newRefundedTotal = currentRefunded + finalRefundAmount;
    const isFullRefund = Math.abs(newRefundedTotal - totalAmount) < 0.001;
    const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    // Optimistic locking update
    const updateResult = await db.run(
      `UPDATE payments 
       SET status = ?, refunded_amount = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND version = ?`,
      [newStatus, newRefundedTotal, id, version]
    );

    if (updateResult.changes === 0) {
      return NextResponse.json(
        { error: 'Concurrent refund modification detected. Please retry.' },
        { status: 409 }
      );
    }

    // Calculate proportional fee reversal
    const computedFee = SmartRouter.calculateFee(provider, finalRefundAmount, currency);

    // Post to atomic double-entry ledger
    await LedgerService.postLedgerEntries({
      paymentId: id,
      merchantId: merchant_id,
      provider,
      amount: finalRefundAmount,
      currency,
      fee: computedFee,
      type: isFullRefund ? 'REFUND' : 'PARTIAL_REFUND',
    });

    memoryStore.publishEvent('payment.refunded', `Payment ${id} refunded ($${finalRefundAmount.toFixed(2)} / Total Refunded: $${newRefundedTotal.toFixed(2)}) via ${provider}`, {
      paymentId: id,
      refundAmount: finalRefundAmount,
      totalRefunded: newRefundedTotal,
      currency,
      provider,
      status: newStatus,
    });

    return NextResponse.json({
      id,
      merchant_id,
      amount: totalAmount,
      refunded_amount: newRefundedTotal,
      refund_amount: finalRefundAmount,
      currency,
      status: newStatus,
      provider,
    });
  } catch (err: any) {
    console.error('Error refunding payment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
