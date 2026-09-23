import type { InkPool } from '@/lib/ink-ledger';

/** Residency + trial + permanent Ink pools (Firestore `users/{uid}/usage/balance`). */

export type InkBalanceData = {
  residencyBalance?: number;
  trialInkBalance?: number;
  purchasedBalance?: number;
};

export type InkPools = {
  residencyBalance: number;
  trialInkBalance: number;
  purchasedBalance: number;
};

export function normalizeInkPools(data: InkBalanceData = {}): InkPools {
  return {
    residencyBalance: Math.max(0, data.residencyBalance || 0),
    trialInkBalance: Math.max(0, data.trialInkBalance || 0),
    purchasedBalance: Math.max(0, data.purchasedBalance || 0),
  };
}

export function totalInkBalance(data: InkBalanceData): number {
  const p = normalizeInkPools(data);
  return p.residencyBalance + p.trialInkBalance + p.purchasedBalance;
}

/** Spend residency first, then trial Ink, then permanent purchased Ink. */
export function deductFromInkPools(data: InkBalanceData, amount: number): InkPools {
  const pools = normalizeInkPools(data);
  let remaining = Math.max(1, Math.ceil(amount));
  let { residencyBalance, trialInkBalance, purchasedBalance } = pools;

  if (residencyBalance >= remaining) {
    return { residencyBalance: residencyBalance - remaining, trialInkBalance, purchasedBalance };
  }
  remaining -= residencyBalance;
  residencyBalance = 0;

  if (trialInkBalance >= remaining) {
    return { residencyBalance, trialInkBalance: trialInkBalance - remaining, purchasedBalance };
  }
  remaining -= trialInkBalance;
  trialInkBalance = 0;

  purchasedBalance = Math.max(0, purchasedBalance - remaining);
  return { residencyBalance, trialInkBalance, purchasedBalance };
}

/** How much each pool contributed to a spend (for ledger history lines). */
export function computeInkSpendBreakdown(
  before: InkPools,
  amount: number
): Array<{ pool: InkPool; amount: number }> {
  const after = deductFromInkPools(before, amount);
  const items: Array<{ pool: InkPool; amount: number }> = [];
  const res = before.residencyBalance - after.residencyBalance;
  const trial = before.trialInkBalance - after.trialInkBalance;
  const pur = before.purchasedBalance - after.purchasedBalance;
  if (res > 0) items.push({ pool: 'residency', amount: res });
  if (trial > 0) items.push({ pool: 'trial', amount: trial });
  if (pur > 0) items.push({ pool: 'permanent', amount: pur });
  return items;
}

/** Restore Ink to the same pools that funded a spend (render refunds). */
export function creditInkPools(
  data: InkPools,
  breakdown: Array<{ pool: InkPool; amount: number }>
): InkPools {
  let { residencyBalance, trialInkBalance, purchasedBalance } = normalizeInkPools(data);
  for (const line of breakdown) {
    if (line.pool === 'residency') residencyBalance += line.amount;
    else if (line.pool === 'trial') trialInkBalance += line.amount;
    else purchasedBalance += line.amount;
  }
  return {
    residencyBalance: Math.max(0, residencyBalance),
    trialInkBalance: Math.max(0, trialInkBalance),
    purchasedBalance: Math.max(0, purchasedBalance),
  };
}

export function inkBalanceFirestorePatch(pools: InkPools, extra: Record<string, unknown> = {}) {
  return {
    residencyBalance: pools.residencyBalance,
    trialInkBalance: pools.trialInkBalance,
    purchasedBalance: pools.purchasedBalance,
    balance: pools.residencyBalance + pools.trialInkBalance + pools.purchasedBalance,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}
