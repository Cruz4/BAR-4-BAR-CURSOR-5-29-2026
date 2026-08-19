import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { computeProFeaturePreviewExpiresAt, PRO_FEATURE_PREVIEW_HOURS } from '@/lib/subscription';

export const runtime = 'nodejs';

/** Admin: start a fresh 48h Pro feature preview on an artist (bypasses identity registry). */
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

  const db = await getDb();
  const userRef = db.doc(`users/${targetUserId}`);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const expiresAt = computeProFeaturePreviewExpiresAt();
  await userRef.set(
    {
      proFeaturePreviewExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await db.collection('system/logs/entries').add({
    action: 'admin_pro_preview_grant',
    userId: targetUserId,
    userName: admin.email,
    type: 'system',
    timestamp: new Date().toISOString(),
    details: `${PRO_FEATURE_PREVIEW_HOURS}h Pro preview granted by ${admin.email}`,
  });

  return NextResponse.json({ ok: true, expiresAt, hours: PRO_FEATURE_PREVIEW_HOURS });
}
