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
    const { amount: refundAmount } = body;

    // Fetch payment
    const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { status, amount, currency, merchant_id, provider } = payment as any;

    if (status !== 'CAPTURED' && status !== 'SETTLED') {
      return NextResponse.json({ error: `Cannot refund payment with status: ${status}. Expected: CAPTURED or SETTLED.` }, { status: 400 });
    }

    const finalRefundAmount = refundAmount ? Number(refundAmount) : amount;
    if (finalRefundAmount <= 0 || finalRefundAmount > amount) {
      return NextResponse.json({ error: `Invalid refund amount: ${finalRefundAmount}. Original payment amount was: ${amount}.` }, { status: 400 });
    }

    // Set status to REFUNDED in DB
    await db.run("UPDATE payments SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

    // Calculate fee refund portion
    const computedFee = SmartRouter.calculateFee(provider, finalRefundAmount, currency);

    // Post to double-entry ledger (reverse capture)
    await LedgerService.postLedgerEntries({
      paymentId: id,
      merchantId: merchant_id,
      provider: provider,
      amount: finalRefundAmount,
      currency,
      fee: computedFee,
      type: 'REFUND'
    });

    memoryStore.publishEvent('payment.refunded', `Payment ${id} refunded successfully via ${provider}`, {
      paymentId: id,
      refundAmount: finalRefundAmount,
      currency,
      provider
    });

    // Notify merchant via webhook
    const merchant = await db.get('SELECT webhook_url FROM merchants WHERE id = ?', [merchant_id]);
    if (merchant && (merchant as any).webhook_url) {
      memoryStore.publishEvent('webhook.enqueued', `Webhook enqueued for payment refund event on ${id}`, { paymentId: id });
    }

    return NextResponse.json({
      id,
      merchant_id,
      amount: finalRefundAmount,
      currency,
      status: 'REFUNDED',
      provider
    });

  } catch (err: any) {
    console.error('Error refunding payment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
