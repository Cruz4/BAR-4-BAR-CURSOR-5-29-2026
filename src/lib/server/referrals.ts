import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { REFERRAL_INK_REWARD, MAX_REFERRAL_REWARDS } from '@/lib/referrals';
import { REFERRAL_INK_SPEND_THRESHOLD } from '@/lib/subscription';
import { buildInkLedgerDocument } from '@/lib/ink-ledger';
import { FREE_RESIDENCY_POOL_CAP } from '@/lib/subscription';
import { inkBalanceFirestorePatch, normalizeInkPools } from '@/lib/ink-balance';
import { loadIdentityEntitlements } from '@/lib/server/identity-registry';

function referralCodeFromUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '0');
}

function isProFromUserData(data: Record<string, unknown> | undefined): boolean {
  return data?.subscriptionStatus === 'active';
}

export async function ensureReferralCode(db: Firestore, userId: string): Promise<string> {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  const existing = snap.data()?.referralCode as string | undefined;
  if (existing) return existing;

  let code = referralCodeFromUserId(userId);
  let suffix = 0;
  while (suffix < 20) {
    const candidate = suffix === 0 ? code : `${code.slice(0, 6)}${suffix}`;
    const clash = await db.collection('users').where('referralCode', '==', candidate).limit(1).get();
    if (clash.empty || clash.docs[0]?.id === userId) {
      code = candidate;
      break;
    }
    suffix += 1;
  }

  await userRef.set({ referralCode: code }, { merge: true });
  return code;
}

export type ReferralClaimResult =
  | { ok: true; rewarded: true; referrerId: string }
  | { ok: true; rewarded: false; reason: string }
  | { ok: false; error: string };

type ReferralInkGrant = {
  pool: 'residency' | 'permanent';
  amount: number;
};

async function resolveReferralInkGrant(
  db: Firestore,
  userId: string,
  userData: Record<string, unknown> | undefined
): Promise<ReferralInkGrant> {
  if (isProFromUserData(userData)) {
    return { pool: 'permanent', amount: REFERRAL_INK_REWARD };
  }

  const usageRef = db.collection('users').doc(userId).collection('usage').doc('balance');
  const balanceSnap = await usageRef.get();
  const pools = normalizeInkPools(balanceSnap.data());
  const headroom = Math.max(0, FREE_RESIDENCY_POOL_CAP - pools.residencyBalance);
  return { pool: 'residency', amount: Math.min(REFERRAL_INK_REWARD, headroom) };
}

async function applyReferralInkGrant(
  db: Firestore,
  userId: string,
  grant: ReferralInkGrant,
  reason: string
): Promise<void> {
  if (grant.amount <= 0) return;

  const usageRef = db.collection('users').doc(userId).collection('usage').doc('balance');

  if (grant.pool === 'permanent') {
    await usageRef.set(
      {
        purchasedBalance: FieldValue.increment(grant.amount),
        balance: FieldValue.increment(grant.amount),
        lastRewardReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const pools = normalizeInkPools(snap.data());
    const nextResidency = Math.min(FREE_RESIDENCY_POOL_CAP, pools.residencyBalance + grant.amount);
    const delta = nextResidency - pools.residencyBalance;
    if (delta <= 0) return;

    tx.set(
      usageRef,
      inkBalanceFirestorePatch(
        { ...pools, residencyBalance: nextResidency },
        { lastRewardReason: reason, updatedAt: new Date().toISOString() }
      ),
      { merge: true }
    );
  });
}

/** Idempotent — grants referral Ink once per valid referral (residency-capped for Visitor). */
export async function claimReferralReward(
  db: Firestore,
  newUserId: string,
  referralCodeRaw: string
): Promise<ReferralClaimResult> {
  const referralCode = referralCodeRaw.trim().toUpperCase();
  if (!referralCode) return { ok: false, error: 'Invalid referral code.' };

  const newUserRef = db.collection('users').doc(newUserId);
  const newUserSnap = await newUserRef.get();
  if (!newUserSnap.exists) return { ok: false, error: 'User not found.' };

  const newUserData = newUserSnap.data() || {};
  if (newUserData.referredBy) {
    return { ok: true, rewarded: false, reason: 'already_claimed' };
  }

  const referrerQuery = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get();
  if (referrerQuery.empty) {
    return { ok: true, rewarded: false, reason: 'invalid_code' };
  }

  const referrerDoc = referrerQuery.docs[0];
  const referrerId = referrerDoc.id;
  if (referrerId === newUserId) {
    return { ok: true, rewarded: false, reason: 'self_referral' };
  }

  const referralCount = (referrerDoc.data()?.referralCount as number) || 0;
  if (referralCount >= MAX_REFERRAL_REWARDS) {
    return { ok: true, rewarded: false, reason: 'referrer_cap_reached' };
  }

  const referralRecordId = `${referrerId}_${newUserId}`;
  const referralRecordRef = db.collection('referrals').doc(referralRecordId);
  const existingRecord = await referralRecordRef.get();
  if (existingRecord.exists) {
    return { ok: true, rewarded: false, reason: 'already_recorded' };
  }

  const newUserEmail = (newUserData.email as string | undefined) || null;
  const identity = await loadIdentityEntitlements(db, newUserEmail);
  const grantNewUserWelcome = identity.welcomeInkEligible;

  const newUserGrant = grantNewUserWelcome
    ? await resolveReferralInkGrant(db, newUserId, newUserData)
    : { pool: 'residency' as const, amount: 0 };
  const referrerGrant = await resolveReferralInkGrant(db, referrerId, referrerDoc.data());

  const batch = db.batch();

  batch.set(referralRecordRef, {
    referrerId,
    referredUserId: newUserId,
    referralCode,
    inkGranted: newUserGrant.amount,
    newUserInkGranted: newUserGrant.amount,
    referrerInkGranted: 0,
    referrerRewardPending: referrerGrant.amount > 0,
    referrerRewardGranted: false,
    referrerInkPendingAmount: referrerGrant.amount,
    referrerInkPool: referrerGrant.pool,
    createdAt: FieldValue.serverTimestamp(),
    source: 'signup',
  });

  batch.set(
    newUserRef,
    {
      referredBy: referrerId,
      referralCode: newUserData.referralCode || referralCodeFromUserId(newUserId),
    },
    { merge: true }
  );

  batch.update(referrerDoc.ref, {
    referralCount: FieldValue.increment(1),
  });

  await batch.commit();

  if (newUserGrant.amount > 0) {
    await applyReferralInkGrant(db, newUserId, newUserGrant, 'referral_welcome');
    const welcomeLogRef = db.collection('users').doc(newUserId).collection('usageLogs').doc();
    await welcomeLogRef.set(
      buildInkLedgerDocument(
        {
          type: 'credit',
          pool: newUserGrant.pool === 'residency' ? 'residency' : 'permanent',
          amount: newUserGrant.amount,
          reason: 'referral_welcome',
        },
        { userId: newUserId }
      )
    );
  }

  const referrerPending = referrerGrant.amount > 0;

  await db.collection('system').doc('logs').collection('entries').add({
    timestamp: new Date().toISOString(),
    userId: referrerId,
    action: 'Referral Bonus',
    usdCost: 0,
    inkUsed: 0,
    type: 'referral',
    details: `Referral ${newUserId} — new user ${newUserGrant.amount} · referrer ${referrerPending ? `pending ${referrerGrant.amount}` : '0'} Ink`,
  });

  return { ok: true, rewarded: true, referrerId };
}

/** Grant referrer Ink once referee has spent enough on AI (anti-farming). */
export async function fulfillPendingReferralRewards(db: Firestore, userId: string): Promise<void> {
  const balanceSnap = await db.collection('users').doc(userId).collection('usage').doc('balance').get();
  const lifetimeSpent = (balanceSnap.data()?.lifetimeInkSpent as number) || 0;
  if (lifetimeSpent < REFERRAL_INK_SPEND_THRESHOLD) return;

  const pendingQuery = await db
    .collection('referrals')
    .where('referredUserId', '==', userId)
    .where('referrerRewardPending', '==', true)
    .where('referrerRewardGranted', '==', false)
    .limit(5)
    .get();

  for (const docSnap of pendingQuery.docs) {
    const data = docSnap.data();
    const referrerId = data.referrerId as string;
    const amount = (data.referrerInkPendingAmount as number) || REFERRAL_INK_REWARD;
    if (!referrerId || amount <= 0) continue;

    const referrerSnap = await db.collection('users').doc(referrerId).get();
    const referrerGrant = await resolveReferralInkGrant(db, referrerId, referrerSnap.data());
    const grantAmount = Math.min(amount, referrerGrant.amount > 0 ? referrerGrant.amount : amount);
    if (grantAmount <= 0) {
      await docSnap.ref.set({ referrerRewardPending: false, referrerRewardGranted: true }, { merge: true });
      continue;
    }

    await applyReferralInkGrant(db, referrerId, { pool: referrerGrant.pool, amount: grantAmount }, 'referral_bonus');
    const bonusLogRef = db.collection('users').doc(referrerId).collection('usageLogs').doc();
    await bonusLogRef.set(
      buildInkLedgerDocument(
        {
          type: 'credit',
          pool: referrerGrant.pool === 'residency' ? 'residency' : 'permanent',
          amount: grantAmount,
          reason: 'referral_bonus',
          details: `Referred ${userId} after ${REFERRAL_INK_SPEND_THRESHOLD} Ink spent`,
        },
        { userId: referrerId }
      )
    );
    await docSnap.ref.set(
      { referrerRewardPending: false, referrerRewardGranted: true, referrerRewardGrantedAt: new Date().toISOString() },
      { merge: true }
    );
  }
}
