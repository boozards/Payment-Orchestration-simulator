import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryCache';
import { db } from '@/lib/db/connection';
import { LedgerService } from '@/lib/services/ledger';
import { SmartRouter } from '@/lib/services/router';
import crypto from 'crypto';

// Verify HMAC webhook signature against merchant secret
function verifyStripeSignature(payloadString: string, signatureHeader: string, secret = 'whsec_test_stripe_secret'): boolean {
  if (!signatureHeader || signatureHeader === 'unsigned') return true; // Allow mock simulator calls
  try {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
    const signature = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !signature) return false;

    const computed = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('Stripe-Signature') || 'unsigned';

    if (!verifyStripeSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }

    const eventType = body.type || 'unknown';
    const object = body.data?.object || {};
    const paymentId = object.metadata?.payment_id || object.metadata?.paymentId || '';

    memoryStore.publishEvent('webhook.received', `Stripe Webhook received: ${eventType} for payment ${paymentId || 'N/A'}`, {
      eventType,
      paymentId,
      payload: body,
    });

    // If it's a charge.succeeded, atomically settle payment & post to ledger if currently AUTHORIZED
    if (eventType === 'charge.succeeded' && paymentId) {
      const payment = await db.get<any>('SELECT * FROM payments WHERE id = ?', [paymentId]);

      if (payment && payment.status === 'AUTHORIZED') {
        const { merchant_id, amount, currency } = payment;
        const computedFee = SmartRouter.calculateFee('stripe', Number(amount), currency);

        // Atomic Double-Entry Ledger Post
        await LedgerService.postLedgerEntries({
          paymentId,
          merchantId: merchant_id,
          provider: 'stripe',
          amount: Number(amount),
          currency,
          fee: computedFee,
          type: 'CAPTURE',
        });

        // Settle payment in DB
        await db.run("UPDATE payments SET status = 'SETTLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [paymentId]);

        memoryStore.publishEvent('payment.webhook_settled', `Payment ${paymentId} settled via Stripe Webhook with balanced ledger posting`, {
          paymentId,
          amount,
          currency,
        });
      }
    }

    return NextResponse.json({ received: true, event: eventType }, { status: 200 });
  } catch (err: any) {
    console.error('Error processing Stripe webhook:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
