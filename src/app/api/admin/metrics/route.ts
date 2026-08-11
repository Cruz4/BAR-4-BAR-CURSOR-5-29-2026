import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getAdminMetricsForDashboard } from '@/lib/server/admin-metrics-cache';
import { parseMetricsRangeKey } from '@/lib/admin-metrics-range';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === '1';
    const range = parseMetricsRangeKey(url.searchParams.get('range'));
    const metrics = await getAdminMetricsForDashboard(forceRefresh, range);
    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/metrics]', err);
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}
