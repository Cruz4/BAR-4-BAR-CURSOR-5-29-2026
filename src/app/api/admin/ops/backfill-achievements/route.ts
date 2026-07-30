import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { backfillAchievementOpsLogs } from '@/lib/server/backfill-achievement-ops-logs';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Admin: write Neural Operation Stream rows for trophies already unlocked.
 * Does not re-grant Ink — display/history only. Safe to re-run (skips duplicates).
 */
export async function POST(req: Request) {
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

  try {
    const result = await backfillAchievementOpsLogs();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[admin/ops/backfill-achievements]', err);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
