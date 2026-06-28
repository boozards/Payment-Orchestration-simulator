import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    // 1. Count blocked payments
    const blockedCount = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM payments WHERE failure_reason LIKE '%Blocked by Fraud%'`
    );

    // 2. Count active and total fraud rules
    const rulesCount = await db.get<{ total: number; active: number }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active
       FROM fraud_rules`
    );

    // 3. Count flagged transactions
    // Since we store flagged details in metadata JSON, let's search SQLite for flagged text
    const flaggedCount = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM payments WHERE metadata LIKE '%"flagged":true%'`
    );

    return NextResponse.json({
      blocked_payments: blockedCount?.count || 0,
      flagged_payments: flaggedCount?.count || 0,
      total_rules: rulesCount?.total || 0,
      active_rules: rulesCount?.active || 0,
    });
  } catch (err: any) {
    console.error('Fraud analytics error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
