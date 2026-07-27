import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export const runtime = 'nodejs';

/**
 * Admin: fill blank displayName / email on user docs from Firebase Auth.
 * Fixes roster rows that lost identity after the usage-init vs profile-sync race.
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

  const db = await getDb();
  const auth = await getAuth();
  const usersSnap = await db.collection('users').get();

  let scanned = 0;
  let patched = 0;
  let missingAuth = 0;
  const samples: Array<{ id: string; displayName?: string; email?: string }> = [];

  for (const docSnap of usersSnap.docs) {
    scanned += 1;
    const data = docSnap.data() || {};
    const existingEmail = typeof data.email === 'string' ? data.email.trim() : '';
    const existingName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
    if (existingEmail && existingName) continue;

    let authEmail = '';
    let authName = '';
    try {
      const record = await auth.getUser(docSnap.id);
      authEmail = record.email?.trim() || '';
      authName = record.displayName?.trim() || '';
    } catch {
      missingAuth += 1;
      continue;
    }

    const patch: Record<string, unknown> = {};
    if (!existingEmail && authEmail) patch.email = authEmail.toLowerCase();
    if (!existingName) patch.displayName = authName || 'Anonymous Artist';
    if (!data.status) patch.status = 'active';
    if (Object.keys(patch).length === 0) continue;

    patch.updatedAt = new Date().toISOString();
    await docSnap.ref.set(patch, { merge: true });
    patched += 1;
    if (samples.length < 10) {
      samples.push({
        id: docSnap.id,
        displayName: (patch.displayName as string) || existingName || undefined,
        email: (patch.email as string) || existingEmail || undefined,
      });
    }
  }

  return NextResponse.json({ ok: true, scanned, patched, missingAuth, samples });
}
