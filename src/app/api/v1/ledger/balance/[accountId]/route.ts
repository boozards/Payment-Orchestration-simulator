import { NextRequest, NextResponse } from 'next/server';
import { LedgerService } from '@/lib/services/ledger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    
    // Decode the accountId parameter (e.g. "merchant:mch_001" which might be URL encoded)
    const decodedAccountId = decodeURIComponent(accountId);
    const balance = await LedgerService.getAccountBalance(decodedAccountId);

    return NextResponse.json({
      account_id: decodedAccountId,
      balance
    });
  } catch (err: any) {
    console.error('Error fetching account balance:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
