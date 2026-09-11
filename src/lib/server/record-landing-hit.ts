import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';

const COLLECTION = 'studio_landing_hits';

/** Persist a tagged or organic landing visit for admin funnel metrics (server-only). */
export async function recordLandingHit(
  ref: string,
  path: string,
  guest?: {
    guestId?: string | null;
    guestAlias?: string | null;
    ipHash?: string | null;
    uaFamily?: string | null;
    botLikely?: boolean;
    sameOrigin?: boolean;
  }
): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;
  const normalizedRef =
    ref.trim().toLowerCase() === 'organic'
      ? 'organic'
      : normalizeMarketingRef(ref);
  if (!normalizedRef) return;

  try {
    const db = await getDb();
    await db.collection(COLLECTION).add({
      ref: normalizedRef,
      path: path.slice(0, 120),
      guestId: guest?.guestId || null,
      guestAlias: guest?.guestAlias || null,
      ipHash: guest?.ipHash || null,
      uaFamily: guest?.uaFamily || null,
      botLikely: Boolean(guest?.botLikely),
      sameOrigin: Boolean(guest?.sameOrigin),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[recordLandingHit] skipped:', (error as Error).message);
  }
}
