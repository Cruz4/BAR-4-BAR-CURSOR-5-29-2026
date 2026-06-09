import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { listAdminAlertsSince } from '@/lib/server/admin-alerts';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const url = new URL(req.url);
    const since = url.searchParams.get('since') || new Date(Date.now() - 60_000).toISOString();
    const alerts = await listAdminAlertsSince(since);
    return NextResponse.json({ alerts });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[admin/alerts]', e);
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
  }
}
