import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryCache';
import { db } from '@/lib/db/connection';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const signature = req.headers.get('Stripe-Signature') || 'unsigned';
    
    const eventType = body.type || 'unknown';
    const object = body.data?.object || {};
    const paymentId = object.metadata?.payment_id || object.metadata?.paymentId || '';

    memoryStore.publishEvent('webhook.received', `Stripe Webhook received: ${eventType} (Signature: ${signature.substring(0, 10)}...)`, {
      eventType,
      paymentId,
      payload: body
    });

    // If it's a charge.succeeded, update payment status in SQLite if it's pending (simulating async 3DS flow)
    if (eventType === 'charge.succeeded' && paymentId) {
      const payment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
      if (payment && (payment as any).status === 'AUTHORIZED') {
        // Update to CAPTURED / SETTLED
        await db.run("UPDATE payments SET status = 'CAPTURED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [paymentId]);
        memoryStore.publishEvent('payment.webhook_captured', `Payment ${paymentId} settled via Stripe Webhook update`, { paymentId });
      }
    }

    return NextResponse.json({ received: true, event: eventType }, { status: 200 });
  } catch (err: any) {
    console.error('Error processing Stripe webhook:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
