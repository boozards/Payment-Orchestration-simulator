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
    const payment = await db.get<any>('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { status, amount, currency, merchant_id, provider, version = 1 } = payment;

    if (status !== 'AUTHORIZED') {
      return NextResponse.json(
        { error: `Cannot capture payment with status: ${status}. Expected: AUTHORIZED.` },
        { status: 400 }
      );
    }

    // Optimistic locking guard
    const updateResult = await db.run(
      "UPDATE payments SET status = 'CAPTURED', version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'AUTHORIZED' AND version = ?",
      [id, version]
    );

    if (updateResult.changes === 0) {
      return NextResponse.json(
        { error: 'Concurrent modification detected during payment capture. Please retry.' },
        { status: 409 }
      );
    }

    // Calculate gateway fees
    const computedFee = SmartRouter.calculateFee(provider, amount, currency);

    // Post to atomic double-entry ledger
    await LedgerService.postLedgerEntries({
      paymentId: id,
      merchantId: merchant_id,
      provider: provider,
      amount,
      currency,
      fee: computedFee,
      type: 'CAPTURE',
    });

    // Move status to SETTLED
    await db.run("UPDATE payments SET status = 'SETTLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

    memoryStore.publishEvent('payment.captured', `Authorized payment ${id} captured and settled via ${provider}`, {
      paymentId: id,
      amount,
      currency,
      provider,
    });

    return NextResponse.json({
      id,
      merchant_id,
      amount,
      currency,
      status: 'SETTLED',
      provider,
    });
  } catch (err: any) {
    console.error('Error capturing payment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
