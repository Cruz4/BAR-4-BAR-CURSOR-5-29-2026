import 'server-only';

import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  FREE_MONTHLY_RESIDENCY_INK,
  FREE_RESIDENCY_POOL_CAP,
  PRO_FEATURE_PREVIEW_DAYS,
  SIGNUP_INK,
  SIGNUP_PERMANENT_INK,
  isProUser,
} from '@/lib/subscription';
import { inkBalanceFirestorePatch, normalizeInkPools, totalInkBalance } from '@/lib/ink-balance';
import { TRIAL_INK_GRANT } from '@/lib/trial-ink-ab';
import {
  isEligibleForFreeMonthlyGrant,
  isErroneousSignupMonthMonthlyOnly,
  isLikelyErroneousSignupMonthGrant,
  isSignupMonth,
  missingSignupWelcomeInk,
} from '@/lib/ink-grants';
import { recordInkLedgerEntries } from '@/lib/server/ink-ledger';
import type { InkLedgerWrite } from '@/lib/ink-ledger';
import { isMasterAdminEmail } from '@/lib/server/master-admin';
import {
  loadIdentityEntitlements,
  reserveProFeaturePreview,
  reserveSignupEntitlements,
} from '@/lib/server/identity-registry';

function computeProFeaturePreviewExpiresAt(days = PRO_FEATURE_PREVIEW_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function grantProFeaturePreview(
  db: Awaited<ReturnType<typeof getDb>>,
  userEmail: string,
  userId: string,
  bypassIdentityRegistry: boolean
): Promise<string | null> {
  if (bypassIdentityRegistry) {
    return computeProFeaturePreviewExpiresAt();
  }
  if (!userEmail) return computeProFeaturePreviewExpiresAt();
  const reserved = await reserveProFeaturePreview(db, userEmail, userId);
  return reserved ? computeProFeaturePreviewExpiresAt() : null;
}

/** Server-side balance bootstrap — requires FIREBASE_SERVICE_ACCOUNT_KEY locally. */
export async function initializeUserUsage(idToken: string, userId: string): Promise<void> {
  if (!hasAdminFirestoreCredentials()) {
    return;
  }

  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (decoded.uid !== userId) return;

  const userEmail = decoded.email?.trim() || '';
  const emailVerified = decoded.email_verified === true;
  const bypassIdentityRegistry = isMasterAdminEmail(userEmail);

  const db = await getDb();
  const balanceRef = db.doc(`users/${userId}/usage/balance`);
  const userRef = db.doc(`users/${userId}`);
  const [snap, userSnap] = await Promise.all([balanceRef.get(), userRef.get()]);
  const userData = userSnap.data();

  if (bypassIdentityRegistry) {
    await userRef.set(
      {
        role: 'admin',
        ...(userEmail ? { email: userEmail } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
  const trialActive = false;
  const trialInkGrant = TRIAL_INK_GRANT;

  let userCreatedAt = (userData as { createdAt?: string })?.createdAt;
  if (!userCreatedAt) {
    try {
      const userRecord = await auth.getUser(userId);
      userCreatedAt = userRecord.metadata.creationTime;
      if (userCreatedAt) {
        await userRef.set(
          { createdAt: userCreatedAt, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    } catch {
      // Auth lookup failed — monthly eligibility stays conservative (no grant).
    }
  }

  if (!snap.exists) {
    let residencyInk = SIGNUP_INK;
    let trialInk = trialActive ? trialInkGrant : 0;
    let returningIdentity = false;
    let signupGrantSkipped = false;

    if (!emailVerified) {
      residencyInk = 0;
      trialInk = 0;
      signupGrantSkipped = true;
    } else if (!bypassIdentityRegistry && userEmail) {
      const reserved = await reserveSignupEntitlements(db, userEmail, userId, {
        welcomeInkAmount: SIGNUP_INK,
        trialInkAmount: trialInkGrant,
        wantsTrial: trialActive,
      });
      residencyInk = reserved.welcomeInk;
      trialInk = reserved.trialInk;
      returningIdentity = reserved.returningIdentity;
      signupGrantSkipped = residencyInk === 0;
    } else if (!bypassIdentityRegistry && !userEmail) {
      // No email on token — cannot fingerprint; grant normally.
    }

    const grantTrialWorkflow = trialActive && trialInk > 0;
    const userPatch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (!emailVerified) {
      userPatch.pendingWelcomeInk = true;
    }
    if (returningIdentity) {
      userPatch.returningIdentity = true;
      if (!grantTrialWorkflow) {
        userPatch.trialStartedAt = null;
      }
    }
    if (emailVerified && residencyInk > 0 && !returningIdentity) {
      const previewExpiresAt = await grantProFeaturePreview(
        db,
        userEmail,
        userId,
        bypassIdentityRegistry
      );
      if (previewExpiresAt) {
        userPatch.proFeaturePreviewExpiresAt = previewExpiresAt;
      }
    }

    if (Object.keys(userPatch).length > 1) {
      await userRef.set(userPatch, { merge: true });
    }

    const signupLedger: InkLedgerWrite[] = [];
    if (residencyInk > 0) {
      signupLedger.push({
        type: 'credit',
        pool: 'residency',
        amount: residencyInk,
        reason: 'signup_residency',
      });
    }
    if (SIGNUP_PERMANENT_INK > 0) {
      signupLedger.push({
        type: 'credit',
        pool: 'permanent',
        amount: SIGNUP_PERMANENT_INK,
        reason: 'signup_permanent',
      });
    }
    if (trialInk > 0) {
      signupLedger.push({ type: 'credit', pool: 'trial', amount: trialInk, reason: 'trial_ink' });
    }
    await balanceRef.set({
      ...inkBalanceFirestorePatch({
        residencyBalance: residencyInk,
        trialInkBalance: trialInk,
        purchasedBalance: SIGNUP_PERMANENT_INK,
      }),
      signupGranted: true,
      signupGrantSkipped,
      signupResidencyGranted: residencyInk,
      trialInkGranted: grantTrialWorkflow,
      // Ledger written below — skip legacy "Opening balance" backfill on the next init.
      inkLedgerBackfilled: signupLedger.length > 0,
    });

    if (signupLedger.length > 0) {
      await recordInkLedgerEntries(db, userId, signupLedger);
    }
    return;
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  let data = snap.data()!;

  if (
    emailVerified &&
    (userData as { pendingWelcomeInk?: boolean })?.pendingWelcomeInk &&
    !data.welcomeInkReconciled
  ) {
    let residencyInk = SIGNUP_INK;
    let returningIdentity = false;

    if (!bypassIdentityRegistry && userEmail) {
      const reserved = await reserveSignupEntitlements(db, userEmail, userId, {
        welcomeInkAmount: SIGNUP_INK,
        trialInkAmount: 0,
        wantsTrial: false,
      });
      residencyInk = reserved.welcomeInk;
      returningIdentity = reserved.returningIdentity;
    }

    const pools = normalizeInkPools(data);
    const ledger: InkLedgerWrite[] = [];
    if (residencyInk > 0) {
      const nextResidency = Math.min(FREE_RESIDENCY_POOL_CAP, pools.residencyBalance + residencyInk);
      const grantDelta = nextResidency - pools.residencyBalance;
      if (grantDelta > 0) {
        ledger.push({
          type: 'credit',
          pool: 'residency',
          amount: grantDelta,
          reason: 'signup_residency',
          details: 'email_verified',
        });
      }
      const nextPools = { ...pools, residencyBalance: nextResidency };
      await balanceRef.set(
        inkBalanceFirestorePatch(nextPools, {
          welcomeInkReconciled: true,
          signupGrantSkipped: false,
          signupResidencyGranted: grantDelta,
        }),
        { merge: true }
      );
      data = {
        ...data,
        residencyBalance: nextResidency,
        welcomeInkReconciled: true,
        signupGrantSkipped: false,
      };
      if (ledger.length > 0) {
        await recordInkLedgerEntries(db, userId, ledger);
      }
    }

    const userPatch: Record<string, unknown> = {
      pendingWelcomeInk: false,
      updatedAt: new Date().toISOString(),
    };
    if (returningIdentity) {
      userPatch.returningIdentity = true;
    }
    if (residencyInk > 0 && !returningIdentity && !(userData as { proFeaturePreviewExpiresAt?: string })?.proFeaturePreviewExpiresAt) {
      const previewExpiresAt = await grantProFeaturePreview(
        db,
        userEmail,
        userId,
        bypassIdentityRegistry
      );
      if (previewExpiresAt) {
        userPatch.proFeaturePreviewExpiresAt = previewExpiresAt;
      }
    }
    await userRef.set(userPatch, { merge: true });
  }

  let pools = normalizeInkPools(data);

  if (
    !data.signupMonthMonthlyCorrected &&
    isLikelyErroneousSignupMonthGrant(pools.residencyBalance, userCreatedAt, monthKey)
  ) {
    const excess = pools.residencyBalance - SIGNUP_INK;
    pools = { ...pools, residencyBalance: SIGNUP_INK };
    await balanceRef.set(
      inkBalanceFirestorePatch(pools, { signupMonthMonthlyCorrected: true }),
      { merge: true }
    );
    await recordInkLedgerEntries(db, userId, [
      {
        type: 'debit',
        pool: 'residency',
        amount: excess,
        reason: 'monthly_residency',
        details: 'signup_month_correction',
      },
    ]);
    data = { ...data, residencyBalance: SIGNUP_INK, signupMonthMonthlyCorrected: true };
  }

  const erroneousSignupMonthly = isErroneousSignupMonthMonthlyOnly(
    pools.residencyBalance,
    userCreatedAt,
    monthKey
  );
  const missingWelcomeOnly =
    pools.residencyBalance === 0 &&
    isSignupMonth(userCreatedAt, monthKey) &&
    missingSignupWelcomeInk(pools.residencyBalance, userCreatedAt, monthKey, data.signupGrantSkipped);

  if (
    !data.welcomeInkReconciled &&
    !data.signupGrantSkipped &&
    (erroneousSignupMonthly || missingWelcomeOnly)
  ) {
    const erroneousMonthly = erroneousSignupMonthly;
    const previousBalance = pools.residencyBalance;
    const ledger: InkLedgerWrite[] = [];

    if (erroneousMonthly && previousBalance > 0) {
      ledger.push({
        type: 'debit',
        pool: 'residency',
        amount: previousBalance,
        reason: 'monthly_residency',
        details: 'signup_month_reversal',
      });
    }

    const welcomeCredit = erroneousMonthly
      ? SIGNUP_INK
      : SIGNUP_INK - previousBalance;

    if (welcomeCredit > 0) {
      ledger.push({
        type: 'credit',
        pool: 'residency',
        amount: welcomeCredit,
        reason: 'signup_residency',
        details: erroneousMonthly ? 'welcome_correction' : 'welcome_grant',
      });
    }

    pools = { ...pools, residencyBalance: SIGNUP_INK };
    await balanceRef.set(
      inkBalanceFirestorePatch(pools, {
        welcomeInkReconciled: true,
        ...(erroneousMonthly ? { lastFreeResidencyGrant: null } : {}),
      }),
      { merge: true }
    );
    if (ledger.length > 0) {
      await recordInkLedgerEntries(db, userId, ledger);
    }
    data = {
      ...data,
      residencyBalance: SIGNUP_INK,
      welcomeInkReconciled: true,
      ...(erroneousMonthly ? { lastFreeResidencyGrant: null } : {}),
    };
  }

  if (trialActive && TRIAL_INK_GRANT === 0 && pools.trialInkBalance > 0) {
    const expiredTrial = pools.trialInkBalance;
    pools = { ...pools, trialInkBalance: 0 };
    await balanceRef.set(
      inkBalanceFirestorePatch(pools, { legacyTrialInkClearedAt: new Date().toISOString() }),
      { merge: true }
    );
    await recordInkLedgerEntries(db, userId, [
      { type: 'debit', pool: 'trial', amount: expiredTrial, reason: 'trial_ink_expired' },
    ]);
    data = { ...data, trialInkBalance: 0, balance: totalInkBalance(pools) };
  }

  if (!trialActive && (data.trialInkBalance || 0) > 0) {
    const pools = normalizeInkPools(data);
    const expiredTrial = pools.trialInkBalance;
    await balanceRef.set(
      inkBalanceFirestorePatch(
        { ...pools, trialInkBalance: 0 },
        { trialInkExpiredAt: new Date().toISOString() }
      ),
      { merge: true }
    );
    await recordInkLedgerEntries(db, userId, [
      { type: 'debit', pool: 'trial', amount: expiredTrial, reason: 'trial_ink_expired' },
    ]);
    data = { ...data, trialInkBalance: 0, balance: totalInkBalance({ ...data, trialInkBalance: 0 }) };
  }

  if (trialActive && !data.trialInkGranted) {
    let canGrantTrialInk = true;
    if (!bypassIdentityRegistry && userEmail) {
      const entitlements = await loadIdentityEntitlements(db, userEmail);
      canGrantTrialInk = entitlements.trialEligible;
      if (!canGrantTrialInk) {
        await userRef.set(
          {
            returningIdentity: true,
            trialStartedAt: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }

    if (canGrantTrialInk && trialInkGrant > 0) {
      const pools = normalizeInkPools(data);
      const nextTrial = pools.trialInkBalance + trialInkGrant;
      await balanceRef.set(
        inkBalanceFirestorePatch(
          { ...pools, trialInkBalance: nextTrial },
          { trialInkGranted: true }
        ),
        { merge: true }
      );
      await recordInkLedgerEntries(db, userId, [
        { type: 'credit', pool: 'trial', amount: trialInkGrant, reason: 'trial_ink' },
      ]);
      if (!bypassIdentityRegistry && userEmail) {
        await reserveSignupEntitlements(db, userEmail, userId, {
          welcomeInkAmount: 0,
          trialInkAmount: trialInkGrant,
          wantsTrial: true,
        });
      }
      data = { ...data, trialInkBalance: nextTrial, trialInkGranted: true };
    } else if (!canGrantTrialInk) {
      await balanceRef.set({ trialInkGranted: false, updatedAt: new Date().toISOString() }, { merge: true });
      data = { ...data, trialInkGranted: false };
    }
  }

  if (
    !isProUser(userData as { subscriptionStatus?: string }) &&
    data.lastFreeResidencyGrant !== monthKey
  ) {
    pools = normalizeInkPools(data);
    const eligible = isEligibleForFreeMonthlyGrant(userCreatedAt, monthKey);

    if (!eligible) {
      await balanceRef.set(
        {
          lastFreeResidencyGrant: monthKey,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      const nextResidency = Math.min(
        FREE_RESIDENCY_POOL_CAP,
        pools.residencyBalance + FREE_MONTHLY_RESIDENCY_INK
      );
      const grantDelta = nextResidency - pools.residencyBalance;
      if (grantDelta > 0) {
        await balanceRef.set(
          inkBalanceFirestorePatch({ ...pools, residencyBalance: nextResidency }, {
            lastFreeResidencyGrant: monthKey,
          }),
          { merge: true }
        );
        await recordInkLedgerEntries(db, userId, [
          {
            type: 'credit',
            pool: 'residency',
            amount: grantDelta,
            reason: 'monthly_residency',
            details: monthKey,
          },
        ]);
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

  if (data.signupGranted && !data.inkLedgerBackfilled) {
    const pools = normalizeInkPools(data);
    const backfill: InkLedgerWrite[] = [];

    // Legacy accounts only — live signup and welcome reconciliation already log credits.
    if (!data.signupGrantSkipped && !data.welcomeInkReconciled) {
      const signupAmount =
        typeof data.signupResidencyGranted === 'number' && data.signupResidencyGranted > 0
          ? data.signupResidencyGranted
          : SIGNUP_INK;
      backfill.push({
        type: 'credit',
        pool: 'residency',
        amount: signupAmount,
        reason: 'signup_residency',
        details: 'Opening balance',
      });
    }

    if (SIGNUP_PERMANENT_INK > 0 && pools.purchasedBalance >= SIGNUP_PERMANENT_INK) {
      backfill.push({
        type: 'credit',
        pool: 'permanent',
        amount: SIGNUP_PERMANENT_INK,
        reason: 'signup_permanent',
        details: 'Opening balance',
      });
    }

    if (pools.trialInkBalance > 0) {
      backfill.push({
        type: 'credit',
        pool: 'trial',
        amount: pools.trialInkBalance,
        reason: 'trial_ink',
        details: 'Opening balance',
      });
    }

    const lastGrantMonth = data.lastFreeResidencyGrant
      ? String(data.lastFreeResidencyGrant)
      : null;
    if (
      lastGrantMonth &&
      isEligibleForFreeMonthlyGrant(userCreatedAt, lastGrantMonth) &&
      !isSignupMonth(userCreatedAt, lastGrantMonth)
    ) {
      backfill.push({
        type: 'credit',
        pool: 'residency',
        amount: FREE_MONTHLY_RESIDENCY_INK,
        reason: 'monthly_residency',
        details: lastGrantMonth,
      });
    }

    if (backfill.length > 0) {
      await recordInkLedgerEntries(db, userId, backfill);
    }
    await balanceRef.set(
      { inkLedgerBackfilled: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }
}
