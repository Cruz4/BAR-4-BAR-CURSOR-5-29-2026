import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

/**
 * Resolve Neomaiya Sol's live public slug for the Auth user that owns
 * {@link NEOMAIYA_SOL.email}. Prefers an existing publicProfiles doc owned by
 * her uid — especially the canonical slug — over a stale summary field.
 */
export async function resolveNeomaiyaPublicSlug(
  db: Firestore,
  neoUid: string
): Promise<string> {
  const canonical = NEOMAIYA_SOL.slug;
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

      // Prefer the newest mirror if she has orphaned slug docs from renames.
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

  if (summarySlug) {
    try {
      const exact = await db.doc(`publicProfiles/${summarySlug}`).get();
      if (exact.exists && exact.data()?.userId === neoUid) return summarySlug;
    } catch {
      /* ignore */
    }
  }

  try {
    const canonicalSnap = await db.doc(`publicProfiles/${canonical}`).get();
    if (canonicalSnap.exists && canonicalSnap.data()?.userId === neoUid) {
      return canonical;
    }
  } catch {
    /* ignore */
  }

  return summarySlug || canonical;
}
