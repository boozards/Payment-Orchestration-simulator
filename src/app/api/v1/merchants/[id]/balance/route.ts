import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { LedgerService } from '@/lib/services/ledger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate that merchant exists
    const merchant = await db.get('SELECT * FROM merchants WHERE id = ?', [id]);
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const merchantAccount = `merchant:${id}`;
    const balance = await LedgerService.getAccountBalance(merchantAccount);

    // Get currency (default to merchant default currency)
    const currency = (merchant as any).default_currency || 'USD';

    return NextResponse.json({
      merchant_id: id,
      account_id: merchantAccount,
      balance,
      currency
    });
  } catch (err: any) {
    console.error('Error fetching merchant balance:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
