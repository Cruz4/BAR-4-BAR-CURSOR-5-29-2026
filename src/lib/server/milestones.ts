import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { recordStudioEvent } from '@/lib/server/studio-analytics';

/**
 * Marks first meaningful studio activity.
 * Fired from song-draft complete and (server-side) the first successful AI spend.
 */
export async function markUserActivatedIfNeeded(
  db: Firestore,
  userId: string,
  userName?: string
): Promise<boolean> {
  const userRef = db.doc(`users/${userId}`);
  const now = new Date().toISOString();

  const didActivate = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (snap.data()?.activatedAt) return false;
    tx.set(userRef, { activatedAt: now, updatedAt: now }, { merge: true });
    return true;
  });

  if (!didActivate) return false;
  await recordStudioEvent(userId, ANALYTICS_EVENTS.USER_ACTIVATED, { activatedAt: now }, userName);
  return true;
}
