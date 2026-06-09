import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';

const COLLECTION = 'studio_landing_hits';

/** Persist a tagged landing visit for admin funnel metrics (server-only). */
export async function recordLandingHit(ref: string, path: string): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;
  const normalizedRef = normalizeMarketingRef(ref);
  if (!normalizedRef) return;

  try {
    const db = await getDb();
    await db.collection(COLLECTION).add({
      ref: normalizedRef,
      path: path.slice(0, 120),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[recordLandingHit] skipped:', (error as Error).message);
  }
}
