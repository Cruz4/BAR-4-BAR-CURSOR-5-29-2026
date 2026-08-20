import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { calculateNetRevenue } from '@/lib/billing';
import { getResidencyRefillForTier } from '@/lib/stripe-catalog';
import { recordStudioEvent } from '@/lib/server/studio-analytics';
import { recordInkLedgerEntries } from '@/lib/server/ink-ledger';
import { inkBalanceFirestorePatch, normalizeInkPools } from '@/lib/ink-balance';
import { patchPublicStudioBadge } from '@/lib/server/public-studio-badge';
import { grantDropLibrary } from '@/lib/server/drop-entitlements';
import { recordDropSale, splitDropSale } from '@/lib/server/drop-earnings';

export type FulfillmentMetadata = {
  userId: string;
  inkAmount?: string;
  type?: string;
  subscriptionTier?: string;
  shareId?: string;
  artistId?: string;
  scope?: string;
  projectId?: string;
  trackIds?: string;
  amountCents?: string;
  feeCents?: string;
  netCents?: string;
  title?: string;
  payoutMode?: string;
  connectAccountId?: string;
};

export async function fulfillCheckoutSession(
  db: Firestore,
  metadata: FulfillmentMetadata,
  amountTotalCents: number,
  extras?: { subscriptionId?: string | null; stripeCustomerId?: string | null }
) {
  const userId = metadata.userId;
  const userRef = db.collection('users').doc(userId);
  const usageRef = userRef.collection('usage').doc('balance');
  const systemLogRef = db.collection('system').doc('logs').collection('entries').doc();
  const amountTotal = amountTotalCents / 100;
  const [balanceBeforeSnap, userSnap] = await Promise.all([usageRef.get(), userRef.get()]);
  const poolsBefore = normalizeInkPools(balanceBeforeSnap.data() || {});
  const userData = userSnap.data() || {};
  const userName =
    (typeof userData.displayName === 'string' && userData.displayName.trim()) ||
    (typeof userData.email === 'string' && userData.email.trim()) ||
    'Artist';

  const batch = db.batch();
  const inkAmount = parseInt(metadata.inkAmount || '0', 10);
  const isSubscription =
    metadata.type === 'subscription' || Boolean(extras?.subscriptionId && metadata.subscriptionTier);

  let poolsWorking = { ...poolsBefore };
  let usageExtra: Record<string, unknown> = {};
  let residencyCredit = 0;
  let proRefillAmount = 0;

  if (inkAmount > 0) {
    poolsWorking = {
      ...poolsWorking,
      purchasedBalance: poolsWorking.purchasedBalance + inkAmount,
    };
    usageExtra.lastRewardReason = 'purchase_fulfillment';
  }

  if (isSubscription) {
    const tier = metadata.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
    const refillAmount = getResidencyRefillForTier(tier);
    proRefillAmount = refillAmount;
    residencyCredit = Math.max(0, refillAmount - poolsBefore.residencyBalance);
    const userUpdate: Record<string, unknown> = {
      subscriptionStatus: 'active',
      subscriptionTier: tier,
      updatedAt: FieldValue.serverTimestamp(),
      freeEditableTrackIds: FieldValue.delete(),
      freeEditableSelectionAt: FieldValue.delete(),
    };
    if (extras?.subscriptionId) userUpdate.subscriptionId = extras.subscriptionId;
    if (extras?.stripeCustomerId) userUpdate.stripeCustomerId = extras.stripeCustomerId;

    // FieldValue.delete() values are valid Firestore update payloads; Admin typing is overly strict here.
    batch.update(userRef, userUpdate as any);

    // Absolute Pro residency refill (1777 monthly / 3444 yearly). Keep other pools.
    poolsWorking = {
      ...poolsWorking,
      residencyBalance: refillAmount,
    };
    usageExtra = {
      ...usageExtra,
      lastRewardReason: 'pro_refill',
      // Prevent free-tier signup-month clawback from treating Pro refill as visitor ink.
      signupMonthMonthlyCorrected: true,
      welcomeInkReconciled: true,
    };
  } else if (extras?.stripeCustomerId) {
    batch.set(userRef, { stripeCustomerId: extras.stripeCustomerId }, { merge: true });
  }

  if (inkAmount > 0 || isSubscription) {
    batch.set(usageRef, inkBalanceFirestorePatch(poolsWorking, usageExtra), { merge: true });
  }

  // Ops stream: show ink the purchase delivers (pack size / Pro residency refill),
  // not net wallet delta — residencyCredit is 0 when balance was already at the refill cap.
  const inkForOpsLog = isSubscription ? proRefillAmount : Math.max(0, inkAmount);
  const tierLabel =
    metadata.subscriptionTier === 'yearly'
      ? 'Yearly'
      : metadata.subscriptionTier === 'monthly'
        ? 'Monthly'
        : '';
  batch.set(systemLogRef, {
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action: isSubscription ? 'Pro Membership' : 'Ink Pack Purchase',
    usdCost: calculateNetRevenue(amountTotal),
    inkUsed: inkForOpsLog,
    inkDelta: inkForOpsLog,
    type: 'transaction',
    details: isSubscription
      ? `${tierLabel} Pro · residency → ${proRefillAmount.toLocaleString()} (wallet +${residencyCredit.toLocaleString()}) · Gross: $${amountTotal.toFixed(2)}`
      : `+${inkAmount.toLocaleString()} permanent Ink · Gross: $${amountTotal.toFixed(2)}`,
  });

  await batch.commit();

  const ledgerEntries = [];
  if (inkAmount > 0) {
    ledgerEntries.push({
      type: 'credit' as const,
      pool: 'permanent' as const,
      amount: inkAmount,
      reason: 'ink_pack_purchase' as const,
      details: `Gross: $${amountTotal.toFixed(2)}`,
    });
  }
  if (isSubscription && residencyCredit > 0) {
    const tier = metadata.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
    ledgerEntries.push({
      type: 'credit' as const,
      pool: 'residency' as const,
      amount: residencyCredit,
      reason: 'pro_residency_refill' as const,
      details: tier === 'yearly' ? 'Yearly Pro' : 'Monthly Pro',
    });
  }
  if (ledgerEntries.length > 0) {
    await recordInkLedgerEntries(db, userId, ledgerEntries);
  }

  await recordStudioEvent(userId, 'checkout_completed', {
    type: isSubscription ? 'subscription' : metadata.type || 'one_time',
    tier: metadata.subscriptionTier || null,
    amountUsd: amountTotal,
    inkAmount,
  });
}

export async function refillProResidency(
  db: Firestore,
  userId: string,
  tier: 'monthly' | 'yearly',
  opts?: { amountTotalUsd?: number; reason?: string; logOps?: boolean }
) {
  const usageRef = db.collection('users').doc(userId).collection('usage').doc('balance');
  const userRef = db.collection('users').doc(userId);
  const [beforeSnap, userSnap] = await Promise.all([usageRef.get(), userRef.get()]);
  const poolsBefore = normalizeInkPools(beforeSnap.data() || {});
  const refillAmount = getResidencyRefillForTier(tier);
  const residencyCredit = Math.max(0, refillAmount - poolsBefore.residencyBalance);
  const userData = userSnap.data() || {};
  const userName =
    (typeof userData.displayName === 'string' && userData.displayName.trim()) ||
    (typeof userData.email === 'string' && userData.email.trim()) ||
    'Artist';

  await usageRef.set(
    inkBalanceFirestorePatch(
      { ...poolsBefore, residencyBalance: refillAmount },
      {
        lastRewardReason: 'pro_refill',
        signupMonthMonthlyCorrected: true,
        welcomeInkReconciled: true,
      }
    ),
    { merge: true }
  );

  if (residencyCredit > 0) {
    await recordInkLedgerEntries(db, userId, [
      {
        type: 'credit',
        pool: 'residency',
        amount: residencyCredit,
        reason: 'pro_residency_refill',
        details: tier === 'yearly' ? 'Yearly Pro renewal' : 'Monthly Pro renewal',
      },
    ]);
  }

  if (!opts?.logOps) return;

  const amountTotal = typeof opts?.amountTotalUsd === 'number' ? opts.amountTotalUsd : 0;
  const reason = opts?.reason || (tier === 'yearly' ? 'Yearly Pro renewal' : 'Monthly Pro renewal');
  await db.collection('system').doc('logs').collection('entries').add({
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action: 'Pro Membership',
    usdCost: amountTotal > 0 ? calculateNetRevenue(amountTotal) : 0,
    inkUsed: refillAmount,
    inkDelta: refillAmount,
    type: 'transaction',
    details: `${reason} · residency → ${refillAmount.toLocaleString()} (wallet +${residencyCredit.toLocaleString()})${
      amountTotal > 0 ? ` · Gross: $${amountTotal.toFixed(2)}` : ''
    }`,
  });
}

/**
 * Activate Pro (or change tier) from subscription webhooks / portal changes.
 * Refills residency when newly activated, upgrading to yearly, or switching to monthly.
 */
export async function activateOrUpgradeProSubscription(
  db: Firestore,
  userId: string,
  tier: 'monthly' | 'yearly',
  subscriptionId?: string | null
) {
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const prev = userSnap.data() || {};
  const wasActive = prev.subscriptionStatus === 'active';
  const prevTier =
    prev.subscriptionTier === 'yearly'
      ? 'yearly'
      : prev.subscriptionTier === 'monthly'
        ? 'monthly'
        : null;

  const userUpdate: Record<string, unknown> = {
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    updatedAt: FieldValue.serverTimestamp(),
    freeEditableTrackIds: FieldValue.delete(),
    freeEditableSelectionAt: FieldValue.delete(),
  };
  if (subscriptionId) userUpdate.subscriptionId = subscriptionId;
  await userRef.update(userUpdate);
  await patchPublicStudioBadge(db, userId, 'pro');

  const newlyActivated = !wasActive;
  const upgradedToYearly = prevTier !== 'yearly' && tier === 'yearly';
  const switchedToMonthly = wasActive && prevTier === 'yearly' && tier === 'monthly';

  if (newlyActivated || upgradedToYearly || switchedToMonthly) {
    await refillProResidency(db, userId, tier);
  }
}

export async function deactivateSubscription(db: Firestore, userId: string) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    subscriptionStatus: 'canceled',
    updatedAt: FieldValue.serverTimestamp(),
  });
  await patchPublicStudioBadge(db, userId, 'free');
}

/**
 * Atomic claim — Stripe redelivers events on timeout/retry, and the handlers
 * behind this (e.g. `invoice.paid` → `refillProResidency`) are not otherwise
 * idempotent. A get-then-set here would let two concurrent deliveries of the
 * same event both pass the "not yet processed" check before either write
 * lands, double-granting a subscription renewal's Ink refill.
 */
export async function markWebhookProcessed(db: Firestore, eventId: string) {
  const ref = db.collection('stripe_webhook_events').doc(eventId);
  try {
    await ref.create({ processedAt: FieldValue.serverTimestamp() });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number | string })?.code;
    const alreadyExists =
      code === 6 ||
      code === 'already-exists' ||
      /ALREADY_EXISTS|already exists/i.test(String((err as Error)?.message || err));
    if (alreadyExists) return false;
    throw err;
  }
}

/** Idempotent lock — one fulfillment per Stripe Checkout session (webhook + success redirect). */
export async function claimCheckoutFulfillment(db: Firestore, sessionId: string): Promise<boolean> {
  const ref = db.collection('stripe_fulfilled_sessions').doc(sessionId);
  try {
    await ref.create({ claimedAt: FieldValue.serverTimestamp() });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 6 || code === 409) return false; // ALREADY_EXISTS
    throw err;
  }
}

export async function fulfillPaidCheckoutSession(
  db: Firestore,
  session: {
    id: string;
    metadata: FulfillmentMetadata | null;
    amount_total: number | null;
    payment_status: string | null;
    status: string | null;
    mode?: string | null;
    client_reference_id: string | null;
    subscription?: string | { id: string } | null;
    customer?: string | { id: string } | null;
  }
): Promise<{ fulfilled: boolean; duplicate: boolean; inkAmount: number }> {
  const isFulfilled =
    session.status === 'complete' &&
    (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
  if (!isFulfilled) {
    throw new Error('Checkout session is not paid yet.');
  }

  const metadata = session.metadata;
  const userId = metadata?.userId || session.client_reference_id;
  if (!userId) {
    throw new Error('Missing user on checkout session.');
  }

  const claimed = await claimCheckoutFulfillment(db, session.id);
  if (!claimed) {
    const inkAmount = parseInt(metadata?.inkAmount || '0', 10);
    return { fulfilled: true, duplicate: true, inkAmount };
  }

  if (metadata?.type === 'drop_purchase' && metadata.shareId) {
    const amountCents = session.amount_total ?? parseInt(metadata.amountCents || '0', 10);
    const trackIds = (metadata.trackIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    await grantDropLibrary(db, userId, {
      shareId: metadata.shareId,
      ownerId: metadata.artistId || '',
      scope: metadata.scope === 'album' ? 'album' : 'track',
      projectId: metadata.projectId || '',
      title: metadata.title || 'Drop',
      trackIds,
      amountCents,
      purchasedAt: new Date().toISOString(),
      stripeSessionId: session.id,
    });
    let buyerName = 'Fan';
    try {
      const buyerSnap = await db.collection('users').doc(userId).get();
      const buyer = buyerSnap.data() || {};
      buyerName =
        (typeof buyer.displayName === 'string' && buyer.displayName.trim()) ||
        (typeof buyer.name === 'string' && buyer.name.trim()) ||
        'Fan';
    } catch {
      /* buyer name is best-effort */
    }
    if (metadata.artistId && amountCents > 0) {
      const split = splitDropSale(amountCents);
      const feeCents = parseInt(metadata.feeCents || '', 10);
      const netCents = parseInt(metadata.netCents || '', 10);
      await recordDropSale(db, metadata.artistId, {
        shareId: metadata.shareId,
        title: metadata.title || 'Drop',
        buyerId: userId,
        buyerName,
        amountCents,
        feeCents: Number.isFinite(feeCents) && feeCents >= 0 ? feeCents : split.feeCents,
        netCents: Number.isFinite(netCents) && netCents > 0 ? netCents : split.netCents,
        payoutMode: metadata.payoutMode === 'destination' ? 'destination' : 'held',
        stripeSessionId: session.id,
        connectAccountId: metadata.connectAccountId,
      });
    }
    await recordStudioEvent(userId, 'drop_purchase', {
      shareId: metadata.shareId,
      amountCents,
      scope: metadata.scope || 'track',
    });
    try {
      const { recordDropUnlock } = await import('@/lib/server/drop-pulse');
      await recordDropUnlock(db, {
        shareId: metadata.shareId,
        buyerId: userId,
        buyerName,
        title: metadata.title || 'First Drop',
        amountCents,
      });
    } catch (err) {
      console.warn('[fulfill] drop unlock pulse', err);
    }
    return { fulfilled: true, duplicate: false, inkAmount: 0 };
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

  // Prefer explicit metadata; fall back to Checkout mode / subscription presence
  // so Pro still grants when type is missing on a legacy or Dashboard session.
  const isSubscriptionCheckout =
    metadata?.type === 'subscription' ||
    session.mode === 'subscription' ||
    Boolean(subscriptionId);

  await fulfillCheckoutSession(
    db,
    {
      userId,
      inkAmount: metadata?.inkAmount,
      type: isSubscriptionCheckout ? 'subscription' : metadata?.type,
      subscriptionTier: metadata?.subscriptionTier,
    },
    session.amount_total || 0,
    { subscriptionId, stripeCustomerId }
  );

  const inkAmount = parseInt(metadata?.inkAmount || '0', 10);
  return { fulfilled: true, duplicate: false, inkAmount };
}
