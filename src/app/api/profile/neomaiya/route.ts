import { NextResponse } from 'next/server';
import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

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

    const displayName = neo.displayName?.trim() || NEOMAIYA_SOL.displayName;
    let slug: string = NEOMAIYA_SOL.slug;
    try {
      const gamSnap = await db.doc(`users/${neo.uid}/gamification/summary`).get();
      const fromSummary = gamSnap.data()?.profileSlug;
      if (typeof fromSummary === 'string' && fromSummary.trim()) {
        slug = fromSummary.trim();
      }
    } catch {
      /* keep fallback slug */
    }

    // Prefer a publicProfiles doc that actually exists for this user.
    try {
      const byUser = await db
        .collection('publicProfiles')
        .where('userId', '==', neo.uid)
        .limit(1)
        .get();
      if (!byUser.empty) {
        slug = byUser.docs[0].id;
      } else {
        const exact = await db.doc(`publicProfiles/${slug}`).get();
        if (!exact.exists) {
          return NextResponse.json({ slug: NEOMAIYA_SOL.slug, displayName });
        }
      }
    } catch {
      /* keep slug from summary */
    }

    return NextResponse.json({ slug, displayName });
  } catch (err) {
    console.warn('[profile/neomaiya]', err);
    return NextResponse.json(fallback);
  }
}
