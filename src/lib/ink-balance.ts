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
