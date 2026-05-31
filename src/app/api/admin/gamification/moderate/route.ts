import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export const runtime = 'nodejs';

/** Admin: hide a user from public leaderboard */
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

  const { targetUserId, hidden } = await req.json();
  if (!targetUserId || typeof hidden !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const db = await getDb();
  await db.doc(`users/${targetUserId}/gamification/summary`).set(
    { leaderboardHidden: hidden, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
