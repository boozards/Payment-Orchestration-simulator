import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    // Aggregate attempts and latencies per provider
    const providerStats = await db.all<{
      provider: string;
      total_attempts: number;
      successes: number;
      failures: number;
      avg_latency: number;
    }>(
      `SELECT 
        provider,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successes,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failures,
        AVG(latency_ms) as avg_latency
       FROM payment_attempts
       GROUP BY provider`
    );

    // Format output
    const formattedStats = providerStats.map((row: any) => {
      const attempts = Number(row.total_attempts || 0);
      const successes = Number(row.successes || 0);
      const successRate = attempts > 0 ? (successes / attempts) * 100 : 100;
      return {
        provider: row.provider,
        total_attempts: attempts,
        successes,
        failures: Number(row.failures || 0),
        success_rate: successRate,
        avg_latency_ms: Math.round(row.avg_latency || 0)
      };
    });

    // Make sure we always include Stripe, PayPal, Razorpay in comparisons even if they have 0 attempts
    const providersList = ['stripe', 'paypal', 'razorpay'];
    const finalComparison = providersList.map((p) => {
      const existing = formattedStats.find((s) => s.provider === p);
      if (existing) return existing;
      return {
        provider: p,
        total_attempts: 0,
        successes: 0,
        failures: 0,
        success_rate: 100,
        avg_latency_ms: 0
      };
    });

    return NextResponse.json(finalComparison);

  } catch (err: any) {
    console.error('Providers analytics error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
