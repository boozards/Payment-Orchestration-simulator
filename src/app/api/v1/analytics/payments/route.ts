import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    // 1. Calculate General Aggregates
    const stats = await db.get<{
      total_count: number;
      settled_volume: number;
      refunded_volume: number;
    }>(
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status IN ('SETTLED', 'CAPTURED') THEN amount ELSE 0 END) as settled_volume,
        SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END) as refunded_volume
       FROM payments`
    );

    // 2. Count Status Distributions
    const distributions = await db.all<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM payments GROUP BY status'
    );

    // 3. Success Rate
    // Count successful states: SETTLED, CAPTURED, AUTHORIZED
    const successStats = await db.get<{ success_count: number; total_count: number }>(
      `SELECT 
        SUM(CASE WHEN status IN ('SETTLED', 'CAPTURED', 'AUTHORIZED') THEN 1 ELSE 0 END) as success_count,
        COUNT(*) as total_count
       FROM payments`
    );

    const totalCount = successStats?.total_count || 0;
    const successCount = successStats?.success_count || 0;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100;

    // 4. Daily Chart Data (Group by date)
    const dailyVolume = await db.all<{ date: string; volume: number; count: number }>(
      `SELECT 
        SUBSTR(created_at, 1, 10) as date,
        SUM(CASE WHEN status IN ('SETTLED', 'CAPTURED') THEN amount ELSE 0 END) as volume,
        COUNT(*) as count
       FROM payments
       GROUP BY date
       ORDER BY date ASC
       LIMIT 30`
    );

    return NextResponse.json({
      total_payments: stats?.total_count || 0,
      settled_volume: stats?.settled_volume || 0,
      refunded_volume: stats?.refunded_volume || 0,
      success_rate: successRate,
      status_distribution: distributions,
      daily_volume: dailyVolume
    });

  } catch (err: any) {
    console.error('Payments analytics error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
