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

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const data = snap.data() || { residencyBalance: 0, purchasedBalance: 0 };
    const res = data.residencyBalance || 0;
    const pur = data.purchasedBalance || 0;
    const total = res + pur;

    if (total < finalAmount) {
      throw new AiGateError('Insufficient Ink balance.', 'INSUFFICIENT_INK');
    }

    let newRes = res;
    let newPur = pur;
    if (res >= finalAmount) {
      newRes -= finalAmount;
    } else {
      const deficit = finalAmount - res;
      newRes = 0;
      newPur -= deficit;
    }

    tx.set(
      balanceRef,
      {
        residencyBalance: newRes,
        purchasedBalance: newPur,
        balance: newRes + newPur,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  const logsRef = db.collection('system').doc('logs').collection('entries');
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: uid,
    userName: userName || 'Artist',
    action: actionName,
    inkUsed: finalAmount,
    usdCost: estimateAiCost(actionName),
    type: 'ai_request',
  };
  await logsRef.add(logEntry);
  await db.collection('users').doc(uid).collection('usageLogs').add(logEntry);

  const { recordStudioEvent } = await import('@/lib/server/studio-analytics');
  await recordStudioEvent(uid, 'ai_action', { actionName }, userName);

  return { finalAmount };
}

export async function refundInkTransaction(uid: string, amount: number): Promise<void> {
  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    if (!snap.exists) return;
    const data = snap.data()!;
    const res = (data.residencyBalance || 0) + amount;
    tx.set(
      balanceRef,
      {
        residencyBalance: res,
        balance: res + (data.purchasedBalance || 0),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });
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
