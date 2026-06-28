import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { memoryStore } from '@/lib/store/memoryCache';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { providers } = body;

    if (!providers || !Array.isArray(providers)) {
      return NextResponse.json({ error: 'Providers list is required and must be an array' }, { status: 400 });
    }

    // Validate that merchant exists
    const merchant = await db.get('SELECT * FROM merchants WHERE id = ?', [id]);
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const cleanProviders = providers.map((p: string) => p.toLowerCase().trim());
    await db.run(
      'UPDATE merchants SET enabled_providers = ? WHERE id = ?',
      [JSON.stringify(cleanProviders), id]
    );

    memoryStore.publishEvent('merchant.providers_updated', `Merchant ${id} updated active providers`, {
      merchantId: id,
      enabledProviders: cleanProviders,
    });

    return NextResponse.json({
      message: 'Providers updated successfully',
      enabled_providers: cleanProviders
    });
  } catch (err: any) {
    console.error('Error updating merchant providers:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
