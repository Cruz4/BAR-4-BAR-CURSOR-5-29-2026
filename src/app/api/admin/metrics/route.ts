import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { computeAdminMetrics } from '@/lib/server/admin-metrics';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const metrics = await computeAdminMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/metrics]', err);
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}
