import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { calculateNetRevenue } from '@/lib/billing';
import { getResidencyRefillForTier } from '@/lib/stripe-catalog';
import { recordStudioEvent } from '@/lib/server/studio-analytics';
import { recordInkLedgerEntries } from '@/lib/server/ink-ledger';
import { normalizeInkPools } from '@/lib/ink-balance';

export type FulfillmentMetadata = {
  userId: string;
  inkAmount?: string;
  type?: string;
  subscriptionTier?: string;
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
  const balanceBeforeSnap = await usageRef.get();
  const poolsBefore = normalizeInkPools(balanceBeforeSnap.data() || {});

  const batch = db.batch();
  const inkAmount = parseInt(metadata.inkAmount || '0', 10);

  if (inkAmount > 0) {
    batch.set(
      usageRef,
      {
        purchasedBalance: FieldValue.increment(inkAmount),
        balance: FieldValue.increment(inkAmount),
        lastRewardReason: 'purchase_fulfillment',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (metadata.type === 'subscription') {
    const tier = metadata.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
    const refillAmount = getResidencyRefillForTier(tier);
    const userUpdate: Record<string, unknown> = {
      subscriptionStatus: 'active',
      subscriptionTier: tier,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (extras?.subscriptionId) userUpdate.subscriptionId = extras.subscriptionId;
    if (extras?.stripeCustomerId) userUpdate.stripeCustomerId = extras.stripeCustomerId;

    batch.update(userRef, userUpdate);
    batch.set(
      usageRef,
      {
        residencyBalance: refillAmount,
        lastRewardReason: 'pro_refill',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else if (extras?.stripeCustomerId) {
    batch.set(userRef, { stripeCustomerId: extras.stripeCustomerId }, { merge: true });
  }

  batch.set(systemLogRef, {
    timestamp: new Date().toISOString(),
    userId,
    action: metadata.type === 'subscription' ? 'Pro Membership' : 'Ink Pack Purchase',
    usdCost: calculateNetRevenue(amountTotal),
    inkUsed: 0,
    type: 'transaction',
    details: `Gross: $${amountTotal.toFixed(2)}`,
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
  if (metadata.type === 'subscription') {
    const tier = metadata.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
    const refillAmount = getResidencyRefillForTier(tier);
    const residencyCredit = Math.max(0, refillAmount - poolsBefore.residencyBalance);
    if (residencyCredit > 0) {
      ledgerEntries.push({
        type: 'credit' as const,
        pool: 'residency' as const,
        amount: residencyCredit,
        reason: 'pro_residency_refill' as const,
        details: tier === 'yearly' ? 'Yearly Pro' : 'Monthly Pro',
      });
    }
  }
  if (ledgerEntries.length > 0) {
    await recordInkLedgerEntries(db, userId, ledgerEntries);
  }

  await recordStudioEvent(userId, 'checkout_completed', {
    type: metadata.type || 'one_time',
    tier: metadata.subscriptionTier || null,
    amountUsd: amountTotal,
    inkAmount,
  });
}

export async function refillProResidency(
  db: Firestore,
  userId: string,
  tier: 'monthly' | 'yearly'
) {
  const usageRef = db.collection('users').doc(userId).collection('usage').doc('balance');
  const beforeSnap = await usageRef.get();
  const poolsBefore = normalizeInkPools(beforeSnap.data() || {});
  const refillAmount = getResidencyRefillForTier(tier);
  await usageRef.set(
    {
      residencyBalance: refillAmount,
      lastRewardReason: 'pro_refill',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const residencyCredit = Math.max(0, refillAmount - poolsBefore.residencyBalance);
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
}

export async function deactivateSubscription(db: Firestore, userId: string) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    subscriptionStatus: 'canceled',
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function markWebhookProcessed(db: Firestore, eventId: string) {
  const ref = db.collection('stripe_webhook_events').doc(eventId);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({ processedAt: FieldValue.serverTimestamp() });
  return true;
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

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

  await fulfillCheckoutSession(
    db,
    {
      userId,
      inkAmount: metadata?.inkAmount,
      type: metadata?.type,
      subscriptionTier: metadata?.subscriptionTier,
    },
    session.amount_total || 0,
    { subscriptionId, stripeCustomerId }
  );

  const inkAmount = parseInt(metadata?.inkAmount || '0', 10);
  return { fulfilled: true, duplicate: false, inkAmount };
}
