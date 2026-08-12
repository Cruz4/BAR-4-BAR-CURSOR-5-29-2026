import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { reseedNeomaiyaCircleForAllArtists } from '@/lib/server/default-founder-friend';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

export const runtime = 'nodejs';

/**
 * Force-restore Neo ↔ every artist friendship.
 * Guestbook welcome is Jordie's — Neo reseed only restores friendships.
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
    const result = await reseedNeomaiyaCircleForAllArtists(db, auth);
    return NextResponse.json({
      ok: true,
      canonicalEmail: NEOMAIYA_SOL.email,
      ...result,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.warn('[admin/neomaiya/reseed-circle]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reseed failed' },
      { status: 500 }
    );
  }
}
