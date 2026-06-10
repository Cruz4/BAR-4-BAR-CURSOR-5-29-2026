import 'server-only';

import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  FREE_MONTHLY_RESIDENCY_INK,
  FREE_RESIDENCY_POOL_CAP,
  SIGNUP_INK,
  isProUser,
} from '@/lib/subscription';
import { inkBalanceFirestorePatch, normalizeInkPools, totalInkBalance } from '@/lib/ink-balance';
import { isTrialActive } from '@/lib/trial';
import { getTrialInkGrantForVariant } from '@/lib/trial-ink-ab';

/** Server-side balance bootstrap — requires FIREBASE_SERVICE_ACCOUNT_KEY locally. */
export async function initializeUserUsage(idToken: string, userId: string): Promise<void> {
  if (!hasAdminFirestoreCredentials()) {
    return;
  }

  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (decoded.uid !== userId) return;

  const db = await getDb();
  const balanceRef = db.doc(`users/${userId}/usage/balance`);
  const userRef = db.doc(`users/${userId}`);
  const [snap, userSnap] = await Promise.all([balanceRef.get(), userRef.get()]);
  const userData = userSnap.data();
  const trialActive = isTrialActive(userData as { trialStartedAt?: string | null });
  const trialInkGrant = getTrialInkGrantForVariant(
    (userData as { trialInkAbVariant?: string })?.trialInkAbVariant
  );

  if (!snap.exists) {
    const trialInk = trialActive ? trialInkGrant : 0;
    await balanceRef.set({
      ...inkBalanceFirestorePatch({
        residencyBalance: SIGNUP_INK,
        trialInkBalance: trialInk,
        purchasedBalance: 0,
      }),
      signupGranted: true,
      trialInkGranted: trialActive,
    });
    return;
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  let data = snap.data()!;

  if (!trialActive && (data.trialInkBalance || 0) > 0) {
    const pools = normalizeInkPools(data);
    await balanceRef.set(
      inkBalanceFirestorePatch(
        { ...pools, trialInkBalance: 0 },
        { trialInkExpiredAt: new Date().toISOString() }
      ),
      { merge: true }
    );
    data = { ...data, trialInkBalance: 0, balance: totalInkBalance({ ...data, trialInkBalance: 0 }) };
  }

  if (trialActive && !data.trialInkGranted) {
    const pools = normalizeInkPools(data);
    const nextTrial = pools.trialInkBalance + trialInkGrant;
    await balanceRef.set(
      inkBalanceFirestorePatch(
        { ...pools, trialInkBalance: nextTrial },
        { trialInkGranted: true }
      ),
      { merge: true }
    );
    data = { ...data, trialInkBalance: nextTrial, trialInkGranted: true };
  }

  if (
    !isProUser(userData as { subscriptionStatus?: string }) &&
    data.lastFreeResidencyGrant !== monthKey
  ) {
    const pools = normalizeInkPools(data);
    const nextResidency = Math.min(
      FREE_RESIDENCY_POOL_CAP,
      pools.residencyBalance + FREE_MONTHLY_RESIDENCY_INK
    );
    const grantDelta = nextResidency - pools.residencyBalance;
    if (grantDelta > 0) {
      await balanceRef.set(
        inkBalanceFirestorePatch({ ...pools, residencyBalance: nextResidency }, {
          lastFreeResidencyGrant: monthKey,
        }),
        { merge: true }
      );
    } else {
      await balanceRef.set(
        {
          lastFreeResidencyGrant: monthKey,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }
}
