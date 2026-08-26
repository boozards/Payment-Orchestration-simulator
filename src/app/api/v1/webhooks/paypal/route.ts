import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryCache';
import { db } from '@/lib/db/connection';
import { LedgerService } from '@/lib/services/ledger';
import { SmartRouter } from '@/lib/services/router';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventType = body.event_type || 'UNKNOWN';
    const resource = body.resource || {};
    const paymentId = resource.custom_id || resource.invoice_number || '';

    memoryStore.publishEvent('webhook.received', `PayPal Webhook received: ${eventType} for payment ${paymentId || 'N/A'}`, {
      eventType,
      paymentId,
      payload: body,
    });

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && paymentId) {
      const payment = await db.get<any>('SELECT * FROM payments WHERE id = ?', [paymentId]);

      if (payment && payment.status === 'AUTHORIZED') {
        const { merchant_id, amount, currency } = payment;
        const computedFee = SmartRouter.calculateFee('paypal', Number(amount), currency);

        // Atomic Double-Entry Ledger Post
        await LedgerService.postLedgerEntries({
          paymentId,
          merchantId: merchant_id,
          provider: 'paypal',
          amount: Number(amount),
          currency,
          fee: computedFee,
          type: 'CAPTURE',
        });

        // Move to settled
        await db.run("UPDATE payments SET status = 'SETTLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [paymentId]);

        memoryStore.publishEvent('payment.webhook_settled', `Payment ${paymentId} settled via PayPal Webhook with balanced ledger posting`, {
          paymentId,
          amount,
          currency,
        });
      }
    }

    return NextResponse.json({ received: true, event: eventType }, { status: 200 });
  } catch (err: any) {
    console.error('Error processing PayPal webhook:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
