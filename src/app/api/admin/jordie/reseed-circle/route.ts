import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { reseedJordieCruzCircleForAllArtists } from '@/lib/server/default-founder-friend';
import { JORDIE_CRUZ } from '@/lib/profile/jordie-cruz';

export const runtime = 'nodejs';

/**
 * Force-restore Jordie ↔ every artist friendship + Jordie guestbook welcome.
 * Removes Neo founder guestbook lines (welcome is Jordie's now). Keeps Neo friendships.
 */
export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    const { hasAdminFirestoreCredentials } = await import('@/lib/firebase/admin-sdk-credentials');
    const { getAuth, getDb } = await import('@/lib/firebase/server');
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
    }
    const auth = await getAuth();
    const db = await getDb();
    const result = await reseedJordieCruzCircleForAllArtists(db, auth);
    return NextResponse.json({
      ok: true,
      canonicalEmail: JORDIE_CRUZ.email,
      ...result,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.warn('[admin/jordie/reseed-circle]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reseed failed' },
      { status: 500 }
    );
  }
}
