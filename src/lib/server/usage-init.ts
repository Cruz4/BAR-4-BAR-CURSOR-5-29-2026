import 'server-only';

import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  FREE_MONTHLY_RESIDENCY_INK,
  FREE_RESIDENCY_POOL_CAP,
  SIGNUP_INK,
  isProUser,
} from '@/lib/subscription';
import { TRIAL_INK_GRANT, isTrialActive } from '@/lib/trial';

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

  if (!snap.exists) {
    const trialInk = trialActive ? TRIAL_INK_GRANT : 0;
    await balanceRef.set({
      residencyBalance: SIGNUP_INK,
      purchasedBalance: trialInk,
      balance: SIGNUP_INK + trialInk,
      signupGranted: true,
      trialInkGranted: trialActive,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const data = snap.data()!;

  if (trialActive && !data.trialInkGranted) {
    await balanceRef.set(
      {
        purchasedBalance: (data.purchasedBalance || 0) + TRIAL_INK_GRANT,
        balance: (data.balance || 0) + TRIAL_INK_GRANT,
        trialInkGranted: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  if (
    !isProUser(userData as { subscriptionStatus?: string }) &&
    data.lastFreeResidencyGrant !== monthKey
  ) {
    const nextResidency = Math.min(
      FREE_RESIDENCY_POOL_CAP,
      (data.residencyBalance || 0) + FREE_MONTHLY_RESIDENCY_INK
    );
    const grantDelta = nextResidency - (data.residencyBalance || 0);
    if (grantDelta > 0) {
      await balanceRef.set(
        {
          residencyBalance: nextResidency,
          balance: (data.balance || 0) + grantDelta,
          lastFreeResidencyGrant: monthKey,
          updatedAt: new Date().toISOString(),
        },
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
