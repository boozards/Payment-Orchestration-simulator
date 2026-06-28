import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Parse metadata
    try {
      (payment as any).metadata = JSON.parse((payment as any).metadata);
    } catch {
      (payment as any).metadata = {};
    }

    // Fetch attempts
    const attempts = await db.all(
      'SELECT * FROM payment_attempts WHERE payment_id = ? ORDER BY attempt_number ASC',
      [id]
    );

    const parsedAttempts = attempts.map((a: any) => {
      try { a.provider_response = JSON.parse(a.provider_response); } catch { a.provider_response = {}; }
      return a;
    });

    return NextResponse.json({
      ...payment,
      attempts: parsedAttempts
    });
  } catch (err: any) {
    console.error('Error fetching payment details:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
