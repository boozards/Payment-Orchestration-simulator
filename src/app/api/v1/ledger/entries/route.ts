import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');
    const limit = Number(searchParams.get('limit') || '100');

    let entries;
    if (paymentId) {
      entries = await db.all(
        'SELECT * FROM ledger_entries WHERE payment_id = ? ORDER BY created_at ASC',
        [paymentId]
      );
    } else {
      entries = await db.all(
        'SELECT * FROM ledger_entries ORDER BY created_at DESC, id DESC LIMIT ?',
        [limit]
      );
    }

    return NextResponse.json(entries);
  } catch (err: any) {
    console.error('Error fetching ledger entries:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
