import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export const runtime = 'nodejs';

/** Admin: promote or demote a user's studio role. */
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

  const body = await req.json().catch(() => ({}));
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
  const role = body.role === 'admin' ? 'admin' : 'artist';

  if (!targetUserId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const db = await getDb();
  await db.doc(`users/${targetUserId}`).set({ role }, { merge: true });

  return NextResponse.json({ ok: true, role });
}
