import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { repairMisattributedNeomaiyaIdentity } from '@/lib/server/default-founder-friend';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

export const runtime = 'nodejs';

/**
 * One-shot admin repair: strip founder friendships / guestbook lines that were
 * attributed to the legacy neomaiyasol@ account (now Mike Hills) and keep only
 * plotformaiplan@gmail.com as Neomaiya Sol.
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
    const result = await repairMisattributedNeomaiyaIdentity(db, auth);
    return NextResponse.json({
      ok: true,
      canonicalEmail: NEOMAIYA_SOL.email,
      ...result,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.warn('[admin/neomaiya/repair]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Repair failed' },
      { status: 500 }
    );
  }
}
