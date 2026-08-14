import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import type { StudioNameChrome } from '@/lib/studio-tier-chrome';

/** Mirror Pro/Visitor chrome onto live Artist Home docs so the feed can color names. */
export async function patchPublicStudioBadge(
  db: Firestore,
  userId: string,
  studioBadge: StudioNameChrome
): Promise<void> {
  if (!userId) return;
  try {
    const snap = await db.collection('publicProfiles').where('userId', '==', userId).get();
    if (snap.empty) return;
    await Promise.all(
      snap.docs.map((docSnap) => docSnap.ref.set({ studioBadge }, { merge: true }))
    );
  } catch (error) {
    console.warn('[public-studio-badge] skipped:', (error as Error).message);
  }
}
