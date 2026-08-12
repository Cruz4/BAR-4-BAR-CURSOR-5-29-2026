import { NextResponse } from 'next/server';
import { JORDIE_CRUZ } from '@/lib/profile/jordie-cruz';

export const runtime = 'nodejs';

/**
 * Public lookup for Jordie Cruz's live Artist Home slug
 * (guest landing guestbook / friends links).
 */
export async function GET() {
  const fallback = {
    slug: JORDIE_CRUZ.slug,
    displayName: JORDIE_CRUZ.displayName,
  };

  try {
    const { hasAdminFirestoreCredentials } = await import('@/lib/firebase/admin-sdk-credentials');
    const { getAuth, getDb } = await import('@/lib/firebase/server');
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json(fallback);
    }
    const auth = await getAuth();
    const db = await getDb();
    let jordie;
    try {
      jordie = await auth.getUserByEmail(JORDIE_CRUZ.email);
    } catch {
      return NextResponse.json(fallback);
    }

    let slug = JORDIE_CRUZ.slug;
    try {
      const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');
      const live = await resolveLiveUnderscoreProfileSlug(db, jordie.uid, {
        displayName: JORDIE_CRUZ.displayName,
        currentSlugHint: JORDIE_CRUZ.slug,
      });
      if (live) slug = live;
    } catch {
      /* keep preferred */
    }

    return NextResponse.json({
      slug,
      displayName: JORDIE_CRUZ.displayName,
      userId: jordie.uid,
    });
  } catch (err) {
    console.warn('[profile/jordie]', err);
    return NextResponse.json(fallback);
  }
}
