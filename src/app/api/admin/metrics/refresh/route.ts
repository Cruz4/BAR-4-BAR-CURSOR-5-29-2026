import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { refreshAdminMetricsCache } from '@/lib/server/admin-metrics-cache';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    const metrics = await refreshAdminMetricsCache();
    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/metrics/refresh]', err);
    return NextResponse.json({ error: 'Failed to refresh metrics' }, { status: 500 });
  }
}
