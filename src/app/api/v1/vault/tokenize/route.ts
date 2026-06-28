import { NextRequest, NextResponse } from 'next/server';
import { TokenizationVault } from '@/lib/services/vault';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { number, expiry, cvv, holder } = body;

    if (!number || !expiry || !cvv || !holder) {
      return NextResponse.json({ error: 'Missing card details (number, expiry, cvv, holder are required)' }, { status: 400 });
    }

    const cleanNumber = number.replace(/\s+/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return NextResponse.json({ error: 'Invalid card number length' }, { status: 400 });
    }

    const result = TokenizationVault.tokenize({
      number: cleanNumber,
      expiry,
      cvv,
      holder
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('Vault tokenization error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
