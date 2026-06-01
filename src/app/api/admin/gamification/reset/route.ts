import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { resetUserGamificationProgress } from '@/lib/server/gamification';

export const runtime = 'nodejs';

/** Admin: reset trophies, achievements, XP, streaks, and re-earn flags for a user. */
export async function POST(req: Request) {
  let admin: { uid: string; email: string };
  try {
    admin = await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  if (!hasAdminFirestoreCredentials()) {
    return NextResponse.json({ error: 'Admin credentials required' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';

  if (!targetUserId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const result = await resetUserGamificationProgress(targetUserId, admin.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Reset failed';
    const status = message === 'User not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
