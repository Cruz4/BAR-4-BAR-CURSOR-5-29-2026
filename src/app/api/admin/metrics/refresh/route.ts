import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { refreshAdminMetricsCache } from '@/lib/server/admin-metrics-cache';
import { parseMetricsRangeKey } from '@/lib/admin-metrics-range';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    const url = new URL(req.url);
    let rangeParam = url.searchParams.get('range');
    try {
      const body = await req.json();
      if (body && typeof body.range === 'string') rangeParam = body.range;
    } catch {
      // no JSON body
    }
    const range = parseMetricsRangeKey(rangeParam);
    const metrics = await refreshAdminMetricsCache(range);
    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/metrics/refresh]', err);
    return NextResponse.json({ error: 'Failed to refresh metrics' }, { status: 500 });
  }
}
