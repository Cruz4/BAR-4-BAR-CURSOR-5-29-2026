import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { getAdminGamificationRoster } from '@/lib/server/gamification';

export const runtime = 'nodejs';

/** Admin: XP, rank, streaks, and trophy progress for all artists. */
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

  try {
    const stats = await getAdminGamificationRoster();
    return NextResponse.json({ stats });
  } catch (err) {
    console.error('[admin/gamification/roster]', err);
    return NextResponse.json({ error: 'Failed to load roster gamification' }, { status: 500 });
  }
}
