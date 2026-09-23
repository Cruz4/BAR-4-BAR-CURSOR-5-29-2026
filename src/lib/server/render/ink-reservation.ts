import 'server-only';

import {
  computeInkSpendBreakdown,
  creditInkPools,
  deductFromInkPools,
  inkBalanceFirestorePatch,
  normalizeInkPools,
} from '@/lib/ink-balance';
import { recordInkLedgerEntries } from '@/lib/server/ink-ledger';
import { getDb } from '@/lib/firebase/server';
import type { RenderInkReservation } from '@/lib/song-generation/types';

export async function reserveRenderInk(
  uid: string,
  amount: number,
  actionName: string
): Promise<RenderInkReservation> {
  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  const inkAmount = Math.max(1, Math.ceil(amount));
  let breakdown: RenderInkReservation['inkBreakdown'] = [];
  let insufficient = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const pools = normalizeInkPools(snap.data() || {});
    const total = pools.residencyBalance + pools.trialInkBalance + pools.purchasedBalance;
    if (total < inkAmount) {
      insufficient = true;
      return;
    }
    breakdown = computeInkSpendBreakdown(pools, inkAmount).map((line) => ({
      pool: line.pool,
      amount: line.amount,
    }));
    const next = deductFromInkPools(pools, inkAmount);
    tx.set(balanceRef, inkBalanceFirestorePatch(next), { merge: true });
  });

  if (insufficient) {
    throw new Response(JSON.stringify({ error: 'Insufficient Ink.' }), { status: 402 });
  }

  await recordInkLedgerEntries(
    db,
    uid,
    breakdown.map((line) => ({
      type: 'debit' as const,
      pool: line.pool,
      amount: line.amount,
      reason: 'ai_spend' as const,
      action: actionName,
    }))
  );

  return {
    inkAmount,
    inkBreakdown: breakdown,
    reservedAt: new Date().toISOString(),
  };
}

export async function refundRenderInk(uid: string, reservation: RenderInkReservation): Promise<void> {
  if (!reservation.inkAmount) return;
  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const pools = normalizeInkPools(snap.data() || {});
    const next = creditInkPools(pools, reservation.inkBreakdown);
    tx.set(balanceRef, inkBalanceFirestorePatch(next), { merge: true });
  });
  await recordInkLedgerEntries(
    db,
    uid,
    reservation.inkBreakdown.map((line) => ({
      type: 'credit' as const,
      pool: line.pool,
      amount: line.amount,
      reason: 'ai_refund' as const,
    }))
  );
}
