import 'server-only';

import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { estimateAiCost } from '@/lib/billing';
import { resolveFixedActionCost } from '@/lib/studio-costs';
import { getStudioCosts } from '@/lib/server/studio-costs';
import { isMasterAdminEmail } from '@/lib/server/master-admin';
import { checkRateLimit } from '@/lib/server/rate-limit';
import {
  applyByoInkDiscount,
  isValidGoogleApiKey,
  isYearlyProFromData,
} from '@/lib/byo-api';
import { runWithGenkitContext } from '@/lib/server/genkit-request';
import {
  computeInkSpendBreakdown,
  deductFromInkPools,
  inkBalanceFirestorePatch,
  normalizeInkPools,
  totalInkBalance,
} from '@/lib/ink-balance';
import { recordInkLedgerEntries } from '@/lib/server/ink-ledger';
import { isProOrTrial } from '@/lib/subscription';
import type { User } from '@/lib/types';

export class AiGateError extends Error {
  constructor(
    message: string,
    public readonly code: 'AUTH' | 'INSUFFICIENT_INK' | 'RATE_LIMIT' = 'AUTH'
  ) {
    super(message);
    this.name = 'AiGateError';
  }
}

export type SecuredAiContext = {
  idToken: string;
  userId: string;
  actionName: string;
  inkCost: number;
  customApiKey?: string;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

/** High-cost / studio-grade AI — Pro catalog workflow only. */
const PRO_ONLY_AI_ACTIONS = new Set([
  'generateCoverArt',
  'improveMyStyle',
  'aiVideoDirector',
  'aiMusicCowriter',
  'extractAlbumDna',
]);

async function enforceProOnlyAiAction(uid: string, actionName: string): Promise<void> {
  if (!PRO_ONLY_AI_ACTIONS.has(actionName)) return;
  if (!hasAdminFirestoreCredentials()) return;

  const db = await getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data() as Pick<User, 'subscriptionStatus' | 'proFeaturePreviewExpiresAt'> | undefined;
  if (!isProOrTrial(userData)) {
    throw new AiGateError('This AI tool requires Studio Pro.', 'AUTH');
  }
}

function enforceAiRateLimit(uid: string) {
  const { allowed } = checkRateLimit(`ai:${uid}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    throw new AiGateError('Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }
}

export async function verifyAiToken(idToken: string, claimedUserId: string): Promise<string> {
  if (!idToken?.trim() || !claimedUserId?.trim()) {
    throw new AiGateError('Sign in required for AI actions.', 'AUTH');
  }
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (decoded.uid !== claimedUserId) {
    throw new AiGateError('Authentication mismatch.', 'AUTH');
  }
  if (isMasterAdminEmail(decoded.email)) return decoded.uid;

  if (hasAdminFirestoreCredentials() || process.env.NODE_ENV === 'production') {
    try {
      const db = await getDb();
      const userSnap = await db.doc(`users/${decoded.uid}`).get();
      if (userSnap.exists && userSnap.data()?.status === 'blocked') {
        throw new AiGateError('Account suspended.', 'AUTH');
      }
    } catch (error) {
      if (error instanceof AiGateError) throw error;
      console.warn('[verifyAiToken] blocked-user check skipped:', (error as Error).message);
    }
  }
  return decoded.uid;
}

export async function deductInkTransaction(
  uid: string,
  amount: number,
  actionName: string,
  userName?: string
): Promise<{ finalAmount: number }> {
  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  const finalAmount = Math.max(1, Math.ceil(amount));

  let depletedAfterSpend = false;
  let insufficientInk = false;
  let balanceBefore = 0;
  let spendBreakdown: ReturnType<typeof computeInkSpendBreakdown> = [];

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const data = snap.data() || {};
    const pools = normalizeInkPools(data);
    const total = totalInkBalance(pools);
    balanceBefore = total;

    if (total < finalAmount) {
      insufficientInk = true;
      return;
    }

    spendBreakdown = computeInkSpendBreakdown(pools, finalAmount);
    const nextPools = deductFromInkPools(pools, finalAmount);
    depletedAfterSpend = totalInkBalance(nextPools) === 0;

    const prevSpent = typeof data.lifetimeInkSpent === 'number' ? data.lifetimeInkSpent : 0;
    tx.set(
      balanceRef,
      inkBalanceFirestorePatch(nextPools, {
        lifetimeInkSpent: prevSpent + finalAmount,
      }),
      { merge: true }
    );
  });

  if (insufficientInk) {
    const { recordStudioEvent } = await import('@/lib/server/studio-analytics');
    await recordStudioEvent(
      uid,
      'low_ink_hit',
      { actionName, inkNeeded: finalAmount, inkBalance: balanceBefore },
      userName
    );
    throw new AiGateError('Insufficient Ink balance.', 'INSUFFICIENT_INK');
  }

  const logsRef = db.collection('system').doc('logs').collection('entries');
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: uid,
    userName: userName || 'Artist',
    action: actionName,
    inkUsed: finalAmount,
    inkDelta: -finalAmount,
    usdCost: estimateAiCost(actionName),
    type: 'ai_request' as const,
  };
  await logsRef.add(logEntry);

  await recordInkLedgerEntries(
    db,
    uid,
    spendBreakdown.map((line) => ({
      type: 'debit' as const,
      pool: line.pool,
      amount: line.amount,
      reason: 'ai_spend' as const,
      action: actionName,
    })),
    userName
  );

  const { recordStudioEvent } = await import('@/lib/server/studio-analytics');
  await recordStudioEvent(uid, 'ai_action', { actionName }, userName);
  if (depletedAfterSpend) {
    await recordStudioEvent(uid, 'ink_depletion', { actionName }, userName);
  }

  try {
    const { markUserActivatedIfNeeded } = await import('@/lib/server/milestones');
    await markUserActivatedIfNeeded(db, uid, userName);
  } catch (activationErr) {
    console.warn('[ai-gate] activation milestone failed', activationErr);
  }

  try {
    const { fulfillPendingReferralRewards } = await import('@/lib/server/referrals');
    await fulfillPendingReferralRewards(db, uid);
  } catch (referralErr) {
    console.warn('[ai-gate] referral fulfillment check failed', referralErr);
  }

  return { finalAmount };
}

export async function refundInkTransaction(uid: string, amount: number): Promise<void> {
  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  const refundAmount = Math.max(1, Math.ceil(amount));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    if (!snap.exists) return;
    const data = snap.data()!;
    const pools = normalizeInkPools(data);
    const nextRes = pools.residencyBalance + refundAmount;
    tx.set(
      balanceRef,
      inkBalanceFirestorePatch({ ...pools, residencyBalance: nextRes }),
      { merge: true }
    );
  });
  await recordInkLedgerEntries(db, uid, [
    { type: 'credit', pool: 'residency', amount: refundAmount, reason: 'ai_refund' },
  ]);
}

async function resolveByoApiKey(
  uid: string,
  customApiKey?: string
): Promise<string | undefined> {
  const trimmed = customApiKey?.trim();
  if (!trimmed) return undefined;
  if (!isValidGoogleApiKey(trimmed)) {
    throw new AiGateError('Invalid Google AI API key format.', 'AUTH');
  }

  if (!hasAdminFirestoreCredentials()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[BYO] dev mode: Yearly Pro verification skipped');
      return trimmed;
    }
    throw new AiGateError('Studio billing is not configured. BYO-API is unavailable.', 'AUTH');
  }

  const db = await getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!isYearlyProFromData(userSnap.data())) {
    throw new AiGateError('BYO API key requires an active Yearly Pro membership.', 'AUTH');
  }

  return trimmed;
}

export async function runSecuredAiAction<T>(
  ctx: SecuredAiContext,
  fn: () => Promise<T>,
  userName?: string
): Promise<T> {
  const uid = await verifyAiToken(ctx.idToken, ctx.userId);
  enforceAiRateLimit(uid);
  await enforceProOnlyAiAction(uid, ctx.actionName);
  const byoApiKey = await resolveByoApiKey(uid, ctx.customApiKey);

  const studioCosts = await getStudioCosts();
  const baseCost =
    ctx.actionName === 'generateSongDraft' || ctx.actionName === 'generateRelayDraft'
      ? ctx.inkCost
      : resolveFixedActionCost(ctx.actionName, studioCosts, ctx.inkCost);
  const chargedCost = byoApiKey ? applyByoInkDiscount(baseCost) : baseCost;

  if (process.env.NODE_ENV === 'production' && !hasAdminFirestoreCredentials()) {
    throw new AiGateError(
      'Studio billing is not configured. Please try again later.',
      'AUTH'
    );
  }

  const serverInkEnabled = hasAdminFirestoreCredentials();
  let finalAmount = 0;

  if (serverInkEnabled && chargedCost > 0) {
    try {
      const deducted = await deductInkTransaction(uid, chargedCost, ctx.actionName, userName);
      finalAmount = deducted.finalAmount;
    } catch (error) {
      if (error instanceof AiGateError) throw error;
      console.error('[runSecuredAiAction] ink deduction failed:', error);
      throw new AiGateError(
        'Studio billing is temporarily unavailable. Please try again in a moment.',
        'AUTH'
      );
    }
  } else {
    console.warn('[runSecuredAiAction] dev mode: ink gate skipped (no Admin SDK credentials)');
  }

  try {
    return await runWithGenkitContext(byoApiKey, fn);
  } catch (error) {
    if (serverInkEnabled && finalAmount > 0) {
      await refundInkTransaction(uid, finalAmount).catch(() => undefined);
    }
    throw error;
  }
}

/** Strip auth fields before passing to Genkit flows */
export function stripAiAuth<T extends { idToken?: string; userId?: string; customApiKey?: string }>(
  input: T
): Omit<T, 'idToken' | 'userId' | 'customApiKey'> {
  const { idToken: _t, userId: _u, customApiKey: _k, ...rest } = input;
  return rest;
}
