import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { REFERRAL_INK_REWARD, MAX_REFERRAL_REWARDS } from '@/lib/referrals';

function referralCodeFromUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '0');
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

/** Idempotent — grants 150 permanent Ink to both parties once per valid referral. */
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

  const batch = db.batch();
  const inkGrant = REFERRAL_INK_REWARD;

  batch.set(referralRecordRef, {
    referrerId,
    referredUserId: newUserId,
    referralCode,
    inkGranted: inkGrant,
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

  const grantInk = (userId: string, reason: string) => {
    const usageRef = db.collection('users').doc(userId).collection('usage').doc('balance');
    batch.set(
      usageRef,
      {
        purchasedBalance: FieldValue.increment(inkGrant),
        balance: FieldValue.increment(inkGrant),
        lastRewardReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  };

  grantInk(newUserId, 'referral_welcome');
  grantInk(referrerId, 'referral_bonus');

  batch.set(db.collection('system').doc('logs').collection('entries').doc(), {
    timestamp: new Date().toISOString(),
    userId: referrerId,
    action: 'Referral Bonus',
    usdCost: 0,
    inkUsed: 0,
    type: 'referral',
    details: `Referral ${newUserId} — ${inkGrant} Ink each`,
  });

  await batch.commit();
  return { ok: true, rewarded: true, referrerId };
}
