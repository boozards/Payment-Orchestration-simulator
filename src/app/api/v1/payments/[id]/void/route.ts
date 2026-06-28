import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { memoryStore } from '@/lib/store/memoryCache';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch payment
    const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { status, amount, currency, merchant_id, provider } = payment as any;

    if (status !== 'AUTHORIZED') {
      return NextResponse.json({ error: `Cannot void payment with status: ${status}. Expected: AUTHORIZED.` }, { status: 400 });
    }

    // Set status to VOIDED
    await db.run("UPDATE payments SET status = 'VOIDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

    memoryStore.publishEvent('payment.voided', `Payment authorization ${id} voided successfully`, {
      paymentId: id,
      amount,
      currency,
      provider
    });

    // Notify merchant via webhook
    const merchant = await db.get('SELECT webhook_url FROM merchants WHERE id = ?', [merchant_id]);
    if (merchant && (merchant as any).webhook_url) {
      memoryStore.publishEvent('webhook.enqueued', `Webhook enqueued for payment void event on ${id}`, { paymentId: id });
    }

    return NextResponse.json({
      id,
      merchant_id,
      amount,
      currency,
      status: 'VOIDED',
      provider
    });

  } catch (err: any) {
    console.error('Error voiding payment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
