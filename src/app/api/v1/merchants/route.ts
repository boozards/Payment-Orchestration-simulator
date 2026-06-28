import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import crypto from 'crypto';
import { memoryStore } from '@/lib/store/memoryCache';

// POST /api/v1/merchants - Onboard a new merchant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, default_currency = 'USD', webhook_url } = body;

    if (!name) {
      return NextResponse.json({ error: 'Merchant name is required' }, { status: 400 });
    }

    const merchantId = 'mch_' + crypto.randomBytes(8).toString('hex');
    const rawApiKey = 'api_key_' + crypto.randomBytes(12).toString('hex');
    const enabledProviders = JSON.stringify(['stripe', 'paypal', 'razorpay']); // default all enabled

    await db.run(
      `INSERT INTO merchants (id, name, api_key_hash, enabled_providers, default_currency, webhook_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [merchantId, name, rawApiKey, enabledProviders, default_currency, webhook_url || null]
    );

    memoryStore.publishEvent('merchant.onboarded', `Merchant ${name} onboarded successfully`, {
      merchantId,
      name,
      defaultCurrency: default_currency,
    });

    return NextResponse.json({
      id: merchantId,
      name,
      api_key: rawApiKey,
      enabled_providers: ['stripe', 'paypal', 'razorpay'],
      default_currency,
      webhook_url,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error onboarding merchant:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// GET /api/v1/merchants - List all merchants (helper endpoint for simulator dashboard)
export async function GET() {
  try {
    const merchants = await db.all('SELECT * FROM merchants ORDER BY created_at DESC');
    const parsedMerchants = merchants.map((m: any) => {
      try {
        m.enabled_providers = JSON.parse(m.enabled_providers);
      } catch {
        m.enabled_providers = ['stripe', 'paypal', 'razorpay'];
      }
      return m;
    });
    return NextResponse.json(parsedMerchants);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
