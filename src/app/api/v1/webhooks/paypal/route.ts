import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryCache';
import { db } from '@/lib/db/connection';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const eventType = body.event_type || 'UNKNOWN';
    const resource = body.resource || {};
    // PayPal custom_id often maps to our internal payment_id
    const paymentId = resource.custom_id || resource.invoice_number || '';

    memoryStore.publishEvent('webhook.received', `PayPal Webhook received: ${eventType}`, {
      eventType,
      paymentId,
      payload: body
    });

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && paymentId) {
      const payment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
      if (payment && (payment as any).status === 'AUTHORIZED') {
        await db.run("UPDATE payments SET status = 'CAPTURED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [paymentId]);
        memoryStore.publishEvent('payment.webhook_captured', `Payment ${paymentId} settled via PayPal Webhook update`, { paymentId });
      }
    }

    return NextResponse.json({ received: true, event: eventType }, { status: 200 });
  } catch (err: any) {
    console.error('Error processing PayPal webhook:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
