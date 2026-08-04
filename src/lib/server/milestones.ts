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

  // Read-check-write must be atomic: concurrent requests (double-click, retry,
  // duplicate webhook-style calls) could otherwise both observe
  // `completionBurstGranted: false` before either write lands, double-granting
  // the one-time 500 Ink burst.
  const grantAmount = await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const data = snap.data() || {};
    if (data.completionBurstGranted) {
      return 0;
    }

    const pools = normalizeInkPools(data);
    const headroom = Math.max(0, FREE_RESIDENCY_POOL_CAP - pools.residencyBalance);
    const amount = Math.min(COMPLETION_BURST_INK, headroom);

    if (amount <= 0) {
      tx.set(balanceRef, { completionBurstGranted: true }, { merge: true });
      return 0;
    }

    const nextResidency = pools.residencyBalance + amount;
    tx.set(
      balanceRef,
      inkBalanceFirestorePatch(
        { ...pools, residencyBalance: nextResidency },
        { completionBurstGranted: true }
      ),
      { merge: true }
    );
    return amount;
  });

  if (grantAmount <= 0) {
    return { granted: false, amount: 0 };
  }

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
