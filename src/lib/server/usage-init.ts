import 'server-only';

import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { FREE_MONTHLY_RESIDENCY_INK, SIGNUP_INK, isProUser } from '@/lib/subscription';

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
  const snap = await balanceRef.get();

  if (!snap.exists) {
    await balanceRef.set({
      residencyBalance: SIGNUP_INK,
      purchasedBalance: 0,
      balance: SIGNUP_INK,
      signupGranted: true,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const userSnap = await userRef.get();
  const userData = userSnap.data();
  const monthKey = new Date().toISOString().slice(0, 7);
  const data = snap.data()!;

  if (
    !isProUser(userData as { subscriptionStatus?: string }) &&
    data.lastFreeResidencyGrant !== monthKey
  ) {
    await balanceRef.set(
      {
        residencyBalance: (data.residencyBalance || 0) + FREE_MONTHLY_RESIDENCY_INK,
        balance: (data.balance || 0) + FREE_MONTHLY_RESIDENCY_INK,
        lastFreeResidencyGrant: monthKey,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}
