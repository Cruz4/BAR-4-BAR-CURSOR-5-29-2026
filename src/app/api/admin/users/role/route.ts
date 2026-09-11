import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { isMasterAdminEmail } from '@/lib/server/master-admin';
import { notifyAdminRoleChange } from '@/lib/server/security-alerts';

export const runtime = 'nodejs';

/** Admin: promote or demote a user's studio role. */
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

  try {
    const { hasAdminFirestoreCredentials } = await import('@/lib/firebase/admin-sdk-credentials');
    const { getAuth, getDb } = await import('@/lib/firebase/server');
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Admin credentials required' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    const role = body.role === 'admin' ? 'admin' : 'artist';

    if (!targetUserId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (role === 'artist' && targetUserId === admin.uid) {
      return NextResponse.json({ error: 'You cannot demote yourself.' }, { status: 400 });
    }

    const db = await getDb();
    const auth = await getAuth();

    let targetEmail = '';
    try {
      const targetAuth = await auth.getUser(targetUserId);
      targetEmail = (targetAuth.email || '').trim().toLowerCase();
    } catch {
      /* may still have users doc */
    }
    if (!targetEmail) {
      try {
        const snap = await db.doc(`users/${targetUserId}`).get();
        targetEmail = String(snap.data()?.email || '')
          .trim()
          .toLowerCase();
      } catch {
        /* ignore */
      }
    }

    if (role === 'artist' && isMasterAdminEmail(targetEmail)) {
      return NextResponse.json(
        { error: 'Master admin cannot be demoted.' },
        { status: 400 }
      );
    }

    await db.doc(`users/${targetUserId}`).set({ role }, { merge: true });

    await notifyAdminRoleChange({
      actorEmail: admin.email,
      targetUserId,
      targetEmail: targetEmail || null,
      role,
    });

    return NextResponse.json({ ok: true, role, targetUserId });
  } catch (err) {
    console.warn('[admin/users/role]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Role update failed' },
      { status: 500 }
    );
  }
}
