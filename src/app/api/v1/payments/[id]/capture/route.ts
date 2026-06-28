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

    // Fetch the payment
    const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { status, amount, currency, merchant_id, provider } = payment as any;

    if (status !== 'AUTHORIZED') {
      return NextResponse.json({ error: `Cannot capture payment with status: ${status}. Expected: AUTHORIZED.` }, { status: 400 });
    }

    // Capture payment
    await db.run("UPDATE payments SET status = 'CAPTURED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

    // Calculate fees
    const computedFee = SmartRouter.calculateFee(provider, amount, currency);

    // Post to ledger
    await LedgerService.postLedgerEntries({
      paymentId: id,
      merchantId: merchant_id,
      provider: provider,
      amount,
      currency,
      fee: computedFee,
      type: 'CAPTURE'
    });

    // Move status to settled
    await db.run("UPDATE payments SET status = 'SETTLED' WHERE id = ?", [id]);

    memoryStore.publishEvent('payment.captured', `Authorized payment ${id} captured and settled via ${provider}`, {
      paymentId: id,
      amount,
      currency,
      provider
    });

    // Notify merchant via webhook
    const merchant = await db.get('SELECT webhook_url FROM merchants WHERE id = ?', [merchant_id]);
    if (merchant && (merchant as any).webhook_url) {
      // Trigger simple log, background webhook dispatched
      memoryStore.publishEvent('webhook.enqueued', `Webhook enqueued for payment capture event on ${id}`, { paymentId: id });
    }

    return NextResponse.json({
      id,
      merchant_id,
      amount,
      currency,
      status: 'SETTLED',
      provider
    });
  } catch (err: any) {
    console.error('Error capturing payment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
