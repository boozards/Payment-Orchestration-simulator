import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || '20');

    const reports = await db.all(
      'SELECT * FROM reconciliation_reports ORDER BY generated_at DESC LIMIT ?',
      [limit]
    );

    const parsedReports = reports.map((r: any) => {
      try { r.details = JSON.parse(r.details); } catch { r.details = {}; }
      return r;
    });

    return NextResponse.json(parsedReports);
  } catch (err: any) {
    console.error('Error fetching reconciliation reports:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
