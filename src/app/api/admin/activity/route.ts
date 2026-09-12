import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { listAdminActivity, type AdminActivitySource } from '@/lib/server/admin-activity-ledger';
import { listVisitorClusters } from '@/lib/server/visitor-clusters';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  if (!hasAdminFirestoreCredentials()) {
    return NextResponse.json({ error: 'Admin credentials required' }, { status: 503 });
  }

  const url = new URL(req.url);
  const sourceParam = url.searchParams.get('source');
  if (sourceParam === 'clusters') {
    try {
      const { clusters } = await listVisitorClusters();
      return NextResponse.json(
        { source: 'clusters', clusters },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    } catch (err) {
      console.error('[admin/activity] clusters', err);
      return NextResponse.json({ error: 'Failed to load visitor clusters' }, { status: 500 });
    }
  }

  const source: AdminActivitySource = sourceParam === 'visits' ? 'visits' : 'studio';
  const cursor = url.searchParams.get('cursor');
  const limitRaw = Number.parseInt(url.searchParams.get('limit') || '', 10);

  try {
    const { rows, nextCursor } = await listAdminActivity({
      source,
      cursor,
      limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
    });
    return NextResponse.json(
      { source, rows, nextCursor },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[admin/activity]', err);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}
