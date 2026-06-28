import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    const rules = await db.all('SELECT * FROM fraud_rules ORDER BY id ASC');
    const parsedRules = rules.map((r: any) => {
      try { r.parameters = JSON.parse(r.parameters); } catch { r.parameters = {}; }
      return r;
    });
    return NextResponse.json(parsedRules);
  } catch (err: any) {
    console.error('Error fetching fraud rules:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
