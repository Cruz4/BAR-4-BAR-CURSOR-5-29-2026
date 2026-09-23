import 'server-only';

import { getDb } from '@/lib/firebase/server';
import { inkBalanceFirestorePatch, normalizeInkPools } from '@/lib/ink-balance';

/** One-time 10× permanent Ink migration for legacy pack buyers (idempotent). */
export async function migrateInkEconomyV2IfNeeded(uid: string): Promise<void> {
  const db = await getDb();
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;
  if (userSnap.data()?.inkEconomyMigrationV2At) return;

  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  await db.runTransaction(async (tx) => {
    const userTx = await tx.get(userRef);
    if (userTx.data()?.inkEconomyMigrationV2At) return;
    const balSnap = await tx.get(balanceRef);
    const pools = normalizeInkPools(balSnap.data() || {});
    if (pools.purchasedBalance > 0) {
      pools.purchasedBalance = pools.purchasedBalance * 10;
      tx.set(balanceRef, inkBalanceFirestorePatch(pools), { merge: true });
    }
    tx.set(
      userRef,
      { inkEconomyMigrationV2At: new Date().toISOString() },
      { merge: true }
    );
  });
}
