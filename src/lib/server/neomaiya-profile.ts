import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

async function profileOwnedBy(
  db: Firestore,
  slug: string,
  neoUid: string
): Promise<boolean> {
  try {
    const snap = await db.doc(`publicProfiles/${slug}`).get();
    if (!snap.exists) return false;
    return String(snap.data()?.userId || '') === neoUid;
  } catch {
    return false;
  }
}

/**
 * Resolve Neomaiya Sol's live public slug for the Auth user that owns
 * {@link NEOMAIYA_SOL.email} (plotformaiplan@gmail.com).
 *
 * Never return a slug owned by a different uid (e.g. legacy neomaiyasol@
 * account that still holds `neomaiya-sol-paQXxm`).
 */
export async function resolveNeomaiyaPublicSlug(
  db: Firestore,
  neoUid: string
): Promise<string> {
  const canonical = NEOMAIYA_SOL.slug;

  if (await profileOwnedBy(db, canonical, neoUid)) {
    return canonical;
  }

  let summarySlug: string | undefined;
  try {
    const gamSnap = await db.doc(`users/${neoUid}/gamification/summary`).get();
    const fromSummary = gamSnap.data()?.profileSlug;
    if (typeof fromSummary === 'string' && fromSummary.trim()) {
      summarySlug = fromSummary.trim();
    }
  } catch {
    /* ignore */
  }

  // Summary already points at the clean Neo link — prefer it even if mirror lags.
  if (summarySlug === canonical) {
    return canonical;
  }

  try {
    const byUser = await db.collection('publicProfiles').where('userId', '==', neoUid).get();
    if (!byUser.empty) {
      const docs = byUser.docs;
      const canonicalDoc = docs.find((d) => d.id === canonical);
      if (canonicalDoc) return canonicalDoc.id;

      if (summarySlug) {
        const summaryDoc = docs.find((d) => d.id === summarySlug);
        if (summaryDoc) return summaryDoc.id;
      }

      const sorted = [...docs].sort((a, b) => {
        const aAt = String(a.data()?.updatedAt || '');
        const bAt = String(b.data()?.updatedAt || '');
        return bAt.localeCompare(aAt);
      });
      return sorted[0]!.id;
    }
  } catch {
    /* fall through */
  }

  if (summarySlug && (await profileOwnedBy(db, summarySlug, neoUid))) {
    return summarySlug;
  }

  // Stable product URL — /profile/neomaiya_sol — even if the mirror is briefly missing.
  return canonical;
}
