import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

async function profileDocExists(db: Firestore, slug: string): Promise<boolean> {
  try {
    const snap = await db.doc(`publicProfiles/${slug}`).get();
    return snap.exists;
  } catch {
    return false;
  }
}

/**
 * Resolve Neomaiya Sol's live public slug for the Auth user that owns
 * {@link NEOMAIYA_SOL.email}.
 *
 * Always prefer the canonical Artist Home (`NEOMAIYA_SOL.slug`) when that
 * publicProfiles doc exists. Toggling public on/off can mint a new
 * `neomaiya-sol-{uid}` slug in gamification summary that 404s — never ship
 * those dead links to the guest sandbox or founder-friend chips.
 */
export async function resolveNeomaiyaPublicSlug(
  db: Firestore,
  neoUid: string
): Promise<string> {
  const canonical = NEOMAIYA_SOL.slug;

  if (await profileDocExists(db, canonical)) {
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

  if (summarySlug && (await profileDocExists(db, summarySlug))) {
    return summarySlug;
  }

  // Stable product URL even if the mirror is briefly missing.
  return canonical;
}
