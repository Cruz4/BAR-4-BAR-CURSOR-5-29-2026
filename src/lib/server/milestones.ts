import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import {
  COMPLETION_BURST_INK,
  FREE_RESIDENCY_POOL_CAP,
} from '@/lib/subscription';
import { inkBalanceFirestorePatch, normalizeInkPools } from '@/lib/ink-balance';
import { recordInkLedgerEntries } from '@/lib/server/ink-ledger';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { recordStudioEvent } from '@/lib/server/studio-analytics';

export async function grantCompletionBurstIfEligible(
  db: Firestore,
  userId: string,
  userName?: string
): Promise<{ granted: boolean; amount: number }> {
  const balanceRef = db.doc(`users/${userId}/usage/balance`);
  const snap = await balanceRef.get();
  const data = snap.data() || {};
  if (data.completionBurstGranted) {
    return { granted: false, amount: 0 };
  }

  const pools = normalizeInkPools(data);
  const headroom = Math.max(0, FREE_RESIDENCY_POOL_CAP - pools.residencyBalance);
  const grantAmount = Math.min(COMPLETION_BURST_INK, headroom);
  if (grantAmount <= 0) {
    await balanceRef.set({ completionBurstGranted: true }, { merge: true });
    return { granted: false, amount: 0 };
  }

  const nextResidency = pools.residencyBalance + grantAmount;
  await balanceRef.set(
    inkBalanceFirestorePatch(
      { ...pools, residencyBalance: nextResidency },
      { completionBurstGranted: true }
    ),
    { merge: true }
  );
  await recordInkLedgerEntries(db, userId, [
    {
      type: 'credit',
      pool: 'residency',
      amount: grantAmount,
      reason: 'achievement_bonus',
      details: 'first_track_complete_burst',
    },
  ]);

  return { granted: true, amount: grantAmount };
}

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
  const snap = await userRef.get();
  if (snap.data()?.activatedAt) return false;

  const now = new Date().toISOString();
  await userRef.set({ activatedAt: now, updatedAt: now }, { merge: true });
  await recordStudioEvent(userId, ANALYTICS_EVENTS.USER_ACTIVATED, { activatedAt: now }, userName);
  return true;
}
