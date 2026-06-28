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
    const { enabled, parameters } = body;

    // Validate that rule exists
    const rule = await db.get('SELECT * FROM fraud_rules WHERE id = ?', [id]);
    if (!rule) {
      return NextResponse.json({ error: 'Fraud rule not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const sqlParams: any[] = [];

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      sqlParams.push(enabled ? 1 : 0);
    }

    if (parameters !== undefined) {
      updates.push('parameters = ?');
      sqlParams.push(JSON.stringify(parameters));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No properties to update provided' }, { status: 400 });
    }

    sqlParams.push(id);
    await db.run(
      `UPDATE fraud_rules SET ${updates.join(', ')} WHERE id = ?`,
      sqlParams
    );

    memoryStore.publishEvent('fraud.rule_updated', `Fraud rule ${id} updated: Enabled=${enabled}`, {
      ruleId: id,
      enabled,
      parameters
    });

    return NextResponse.json({
      message: 'Fraud rule updated successfully',
      id,
      enabled,
      parameters
    });
  } catch (err: any) {
    console.error('Error updating fraud rule:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
