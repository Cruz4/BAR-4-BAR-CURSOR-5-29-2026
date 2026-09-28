import 'server-only';

import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  FREE_MONTHLY_RESIDENCY_INK,
  FREE_RESIDENCY_POOL_CAP,
  SIGNUP_INK,
  SIGNUP_PERMANENT_INK,
  computeProFeaturePreviewExpiresAt,
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
import type { User } from '@/lib/types';
import { sendWelcomeBackEmail, sendWelcomeEmail } from '@/lib/server/mail/lifecycle-emails';

async function maybeSendWelcomeEmail(
  db: Awaited<ReturnType<typeof getDb>>,
  opts: {
    userId: string;
    email: string;
    emailVerified: boolean;
    /** True when this email already used welcome Ink (post self-delete, etc.). */
    returningIdentity?: boolean;
    alreadySent?: boolean;
    welcomeBackAlreadySent?: boolean;
  }
) {
  if (!opts.emailVerified || !opts.email) return;
  if (opts.returningIdentity) {
    if (opts.welcomeBackAlreadySent) return;
    void sendWelcomeBackEmail(db, {
      userId: opts.userId,
      email: opts.email,
    }).catch((e) => console.warn('[usage-init] welcome-back email', e));
    return;
  }
  if (opts.alreadySent) return;
  void sendWelcomeEmail(db, {
    userId: opts.userId,
    email: opts.email,
  }).catch((e) => console.warn('[usage-init] welcome email', e));
}

async function grantProFeaturePreview(
  db: Awaited<ReturnType<typeof getDb>>,
  userEmail: string,
  userId: string,
  bypassIdentityRegistry: boolean,
  force = false
): Promise<string | null> {
  if (bypassIdentityRegistry || force) {
    return computeProFeaturePreviewExpiresAt();
  }
  if (!userEmail) return computeProFeaturePreviewExpiresAt();
  const reserved = await reserveProFeaturePreview(db, userEmail, userId);
  // 'already_this_uid' recovers accounts where the registry was stamped but
  // proFeaturePreviewExpiresAt never landed on the user doc (init race).
  if (reserved === 'denied') return null;
  return computeProFeaturePreviewExpiresAt();
}

/** Server-side balance bootstrap — requires FIREBASE_SERVICE_ACCOUNT_KEY locally. */
export async function initializeUserUsage(
  idToken: string,
  userId: string,
  extras?: { ipHash?: string | null }
): Promise<void> {
  if (!hasAdminFirestoreCredentials()) {
    console.error('[usage-init] Admin Firestore credentials missing — skipping welcome Ink bootstrap');
    return;
  }

  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (decoded.uid !== userId) return;

  let authEmailVerified = decoded.email_verified === true;
  let userRecordEmail = '';
  let authDisplayName = '';
  let authLastSignInAt = '';
  try {
    const userRecord = await auth.getUser(userId);
    authEmailVerified = authEmailVerified || userRecord.emailVerified === true;
    userRecordEmail = userRecord.email?.trim() || '';
    authDisplayName = userRecord.displayName?.trim() || '';
    if (userRecord.metadata.lastSignInTime) {
      const at = new Date(userRecord.metadata.lastSignInTime);
      if (!Number.isNaN(at.getTime())) authLastSignInAt = at.toISOString();
    }
  } catch {
    // Keep token claim when Admin lookup fails.
  }

  const userEmail = decoded.email?.trim() || userRecordEmail;
  const emailVerified = authEmailVerified;
  const bypassIdentityRegistry = isMasterAdminEmail(userEmail);

  const db = await getDb();
  const balanceRef = db.doc(`users/${userId}/usage/balance`);
  const userRef = db.doc(`users/${userId}`);
  const [snap, userSnap] = await Promise.all([balanceRef.get(), userRef.get()]);
  const userData = userSnap.data();
  const userDocExisted = userSnap.exists;

  // Always keep roster identity in sync from Auth (admin ARTIST column).
  // usage-init often creates the user doc before client profile sync; without
  // this, displayName/email stay blank when the client race fails rules.
  {
    const existingEmail =
      typeof userData?.email === 'string' ? userData.email.trim() : '';
    const existingName =
      typeof userData?.displayName === 'string' ? userData.displayName.trim() : '';
    const identityPatch: Record<string, unknown> = {};
    if (userEmail && !existingEmail) identityPatch.email = userEmail.toLowerCase();
    if (!existingName) {
      identityPatch.displayName = authDisplayName || 'Anonymous Artist';
    }
    if (!userData?.status) identityPatch.status = 'active';
    if (authLastSignInAt && authLastSignInAt !== userData?.lastSignInAt) {
      identityPatch.lastSignInAt = authLastSignInAt;
    }
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);
    const activeAt = typeof userData?.lastActiveAt === 'string' ? userData.lastActiveAt : '';
    if (activeAt.slice(0, 10) !== today) {
      identityPatch.lastActiveAt = nowIso;
    }
    if (Object.keys(identityPatch).length > 0) {
      identityPatch.updatedAt = new Date().toISOString();
      await userRef.set(identityPatch, { merge: true });
    }
  }

  // Server safety net: if we materialize the roster row first, still Telegram once.
  if (!userDocExisted) {
    try {
      const { enqueueSignupAlertOnce } = await import('@/lib/server/signup-alert');
      await enqueueSignupAlertOnce({
        userId,
        userEmail: userEmail || null,
        method: 'usage_init',
        ipHash: extras?.ipHash || null,
      });
    } catch (alertErr) {
      console.warn('[usage-init] signup alert skipped', alertErr);
    }
  }

  if (bypassIdentityRegistry) {
    await userRef.set(
      {
        role: 'admin',
        ...(userEmail ? { email: userEmail.toLowerCase() } : {}),
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

    // create() loses the race cleanly — concurrent /api/usage/init used to
    // overwrite a winning 250 Ink + Pro preview balance with zeros.
    let createdBalance = false;
    try {
      await balanceRef.create({
        ...inkBalanceFirestorePatch({
          residencyBalance: residencyInk,
          trialInkBalance: trialInk,
          purchasedBalance: SIGNUP_PERMANENT_INK,
        }),
        signupGranted: true,
        signupGrantSkipped,
        signupResidencyGranted: residencyInk,
        trialInkGranted: grantTrialWorkflow,
        inkLedgerBackfilled: signupLedger.length > 0,
      });
      createdBalance = true;
    } catch (err) {
      const code = (err as { code?: number | string })?.code;
      const alreadyExists =
        code === 6 ||
        code === 'already-exists' ||
        /ALREADY_EXISTS|already exists/i.test(String((err as Error)?.message || err));
      if (!alreadyExists) throw err;
    }

    if (createdBalance) {
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
      // Pro preview is registry-gated (not blocked when welcome Ink is 0 for other reasons).
      if (
        emailVerified &&
        !(userData as { proFeaturePreviewExpiresAt?: string })?.proFeaturePreviewExpiresAt
      ) {
        const previewExpiresAt = await grantProFeaturePreview(
          db,
          userEmail,
          userId,
          bypassIdentityRegistry,
          returningIdentity
        );
        if (previewExpiresAt) {
          userPatch.proFeaturePreviewExpiresAt = previewExpiresAt;
        }
      }

      if (Object.keys(userPatch).length > 1) {
        await userRef.set(userPatch, { merge: true });
      }

      if (signupLedger.length > 0) {
        await recordInkLedgerEntries(db, userId, signupLedger);
      }

      if (emailVerified) {
        await maybeSendWelcomeEmail(db, {
          userId,
          email: userEmail,
          emailVerified,
          returningIdentity,
          alreadySent: Boolean((userData as { welcomeEmailSentAt?: string })?.welcomeEmailSentAt),
          welcomeBackAlreadySent: Boolean(
            (userData as { welcomeBackEmailSentAt?: string })?.welcomeBackEmailSentAt
          ),
        });
      }
      return;
    }

    // Lost the create race — fall through and reconcile against the winner's doc.
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const balanceSnap = snap.exists ? snap : await balanceRef.get();
  if (!balanceSnap.exists) return;
  let data = balanceSnap.data()!;
  const isPaidProEarly = isProUser(userData as Pick<User, 'subscriptionStatus'> | undefined);

  // Never run free welcome reconciliation on paid Pro — FREE_RESIDENCY_POOL_CAP (400)
  // would crush a Pro refill (1777/3444) down to the visitor pool ceiling.
  if (
    !isPaidProEarly &&
    emailVerified &&
    !data.welcomeInkReconciled &&
    ((userData as { pendingWelcomeInk?: boolean })?.pendingWelcomeInk ||
      (data.signupGrantSkipped && normalizeInkPools(data).residencyBalance < SIGNUP_INK - 5))
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
    if (
      emailVerified &&
      !(userData as { proFeaturePreviewExpiresAt?: string })?.proFeaturePreviewExpiresAt
    ) {
      const previewExpiresAt = await grantProFeaturePreview(
        db,
        userEmail,
        userId,
        bypassIdentityRegistry,
        returningIdentity
      );
      if (previewExpiresAt) {
        userPatch.proFeaturePreviewExpiresAt = previewExpiresAt;
      }
    }
    await userRef.set(userPatch, { merge: true });

    if (emailVerified) {
      await maybeSendWelcomeEmail(db, {
        userId,
        email: userEmail,
        emailVerified,
        returningIdentity,
        alreadySent: Boolean((userData as { welcomeEmailSentAt?: string })?.welcomeEmailSentAt),
        welcomeBackAlreadySent: Boolean(
          (userData as { welcomeBackEmailSentAt?: string })?.welcomeBackEmailSentAt
        ),
      });
    }
  }

  // Backfill Pro preview when balance already existed but expiresAt was never set
  // (race, older signup path, or email-verify reconcile missed it).
  if (
    emailVerified &&
    !(userData as { proFeaturePreviewExpiresAt?: string })?.proFeaturePreviewExpiresAt
  ) {
    const previewExpiresAt = await grantProFeaturePreview(
      db,
      userEmail,
      userId,
      bypassIdentityRegistry,
      Boolean((userData as { returningIdentity?: boolean })?.returningIdentity)
    );
    if (previewExpiresAt) {
      await userRef.set(
        {
          proFeaturePreviewExpiresAt: previewExpiresAt,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }

  let pools = normalizeInkPools(data);
  const isPaidPro = isProUser(userData as Pick<User, 'subscriptionStatus'> | undefined);

  // Free-tier signup-month corrections must never run for paid Pro — they used to
  // treat Pro refills (1777/3444) as "erroneous free grants" and reset to 250.
  if (!isPaidPro) {
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

  if (!isPaidPro && data.lastFreeResidencyGrant !== monthKey) {
    // Atomic claim-and-credit — concurrent /api/usage/init calls (e.g. two tabs
    // loading at once) could otherwise both read `lastFreeResidencyGrant !==
    // monthKey` before either write landed and double-grant this month's
    // residency top-up.
    const grantDelta = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(balanceRef);
      const freshData = freshSnap.data() || {};
      if (freshData.lastFreeResidencyGrant === monthKey) return 0;

      const freshPools = normalizeInkPools(freshData);
      const eligible = isEligibleForFreeMonthlyGrant(userCreatedAt, monthKey);
      if (!eligible) {
        tx.set(
          balanceRef,
          { lastFreeResidencyGrant: monthKey, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        return 0;
      }

      const nextResidency = Math.min(
        FREE_RESIDENCY_POOL_CAP,
        freshPools.residencyBalance + FREE_MONTHLY_RESIDENCY_INK
      );
      const delta = nextResidency - freshPools.residencyBalance;
      if (delta > 0) {
        tx.set(
          balanceRef,
          inkBalanceFirestorePatch({ ...freshPools, residencyBalance: nextResidency }, {
            lastFreeResidencyGrant: monthKey,
          }),
          { merge: true }
        );
      } else {
        tx.set(
          balanceRef,
          { lastFreeResidencyGrant: monthKey, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
      return delta;
    });

    if (grantDelta > 0) {
      await recordInkLedgerEntries(db, userId, [
        {
          type: 'credit',
          pool: 'residency',
          amount: grantDelta,
          reason: 'monthly_residency',
          details: monthKey,
        },
      ]);
      pools = { ...pools, residencyBalance: Math.min(FREE_RESIDENCY_POOL_CAP, pools.residencyBalance + grantDelta) };
      data = { ...data, lastFreeResidencyGrant: monthKey, residencyBalance: pools.residencyBalance };
    } else {
      data = { ...data, lastFreeResidencyGrant: monthKey };
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

  // Default friends: Neo + Jordie. Guestbook welcome is Jordie Cruz.
  try {
    const { ensureDefaultFounderWelcome } = await import('@/lib/server/default-founder-friend');
    let profileSlug: string | undefined;
    try {
      const { migrateUserProfileSlugToUnderscore } = await import('@/lib/server/profile-slug');
      const migrated = await migrateUserProfileSlugToUnderscore(db, userId, {
        displayName:
          (typeof userData?.displayName === 'string' && userData.displayName.trim()) ||
          authDisplayName ||
          undefined,
      });
      if (migrated) profileSlug = migrated;
    } catch {
      /* optional */
    }
    if (!profileSlug) {
      try {
        const gamSnap = await db.doc(`users/${userId}/gamification/summary`).get();
        const slug = gamSnap.data()?.profileSlug;
        if (typeof slug === 'string' && slug.trim()) profileSlug = slug.trim();
      } catch {
        /* optional */
      }
    }
    const displayName =
      (typeof userData?.displayName === 'string' && userData.displayName.trim()) ||
      authDisplayName ||
      'Artist';
    await ensureDefaultFounderWelcome(db, auth, userId, {
      name: displayName,
      ...(profileSlug ? { slug: profileSlug } : {}),
    });
  } catch (founderErr) {
    console.warn('[usage-init] founder welcome seed skipped', founderErr);
  }

  try {
    const { migrateInkEconomyV2IfNeeded } = await import('@/lib/server/ink-economy-migration');
    await migrateInkEconomyV2IfNeeded(userId);
  } catch (migrationErr) {
    console.warn('[usage-init] ink economy v2 migration skipped', migrationErr);
  }
}
