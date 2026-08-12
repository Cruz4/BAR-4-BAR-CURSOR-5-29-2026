import { NextResponse } from 'next/server';
import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';
import { resolveNeomaiyaPublicSlug } from '@/lib/server/neomaiya-profile';

export const runtime = 'nodejs';

/**
 * Public lookup for Neomaiya Sol's live Artist Home slug
 * (guest landing guestbook / friends links).
 */
export async function GET() {
  const fallback = {
    slug: NEOMAIYA_SOL.slug,
    displayName: NEOMAIYA_SOL.displayName,
  };

  try {
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json(fallback);
    }
    const auth = await getAuth();
    const db = await getDb();
    let neo;
    try {
      neo = await auth.getUserByEmail(NEOMAIYA_SOL.email);
    } catch {
      return NextResponse.json(fallback);
    }

    const displayName = NEOMAIYA_SOL.displayName;
    const slug = await resolveNeomaiyaPublicSlug(db, neo.uid);
    return NextResponse.json({ slug, displayName, userId: neo.uid });
  } catch (err) {
    console.warn('[profile/neomaiya]', err);
    return NextResponse.json(fallback);
  }
}
