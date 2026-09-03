import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import {
  type AdminResidencyMode,
  residencyModeLabel,
} from '@/lib/admin-residency';
import { cancelActiveStripeBillingForUser } from '@/lib/server/cancel-user-stripe-billing';
import { patchPublicStudioBadge } from '@/lib/server/public-studio-badge';
import { getCatalogEntry } from '@/lib/stripe-catalog';
import { activateOrUpgradeProSubscription } from '@/lib/stripe-fulfillment';
import { getStripe, isStripeMissingCustomerError } from '@/lib/stripe-server';

export type AdminResidencyResult = {
  mode: AdminResidencyMode;
  subscriptionStatus: 'active' | 'none';
  subscriptionTier: 'monthly' | 'yearly' | 'none';
  proSource?: 'admin' | 'stripe';
  message: string;
};

function resolveStripeSubTier(subscription: Stripe.Subscription): 'monthly' | 'yearly' {
  if (subscription.metadata?.subscriptionTier === 'yearly') return 'yearly';
  if (subscription.metadata?.subscriptionTier === 'monthly') return 'monthly';
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId) {
    const entry = getCatalogEntry(priceId);
    if (entry?.type === 'subscription') return entry.tier;
  }
  return 'monthly';
}

async function findLiveStripeSubscription(
  userData: Record<string, unknown>,
  wantTier: 'monthly' | 'yearly'
): Promise<Stripe.Subscription> {
  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    throw new Error('Stripe is not configured on the server.');
  }

  const customerId = String(userData.stripeCustomerId || '').trim();
  const subscriptionId = String(userData.subscriptionId || '').trim();
  const seen = new Set<string>();
  const live: Stripe.Subscription[] = [];

  const consider = (sub: Stripe.Subscription) => {
    if (seen.has(sub.id)) return;
    seen.add(sub.id);
    if (sub.status === 'active' || sub.status === 'trialing') live.push(sub);
  };

  if (subscriptionId) {
    try {
      consider(await stripe.subscriptions.retrieve(subscriptionId));
    } catch (err) {
      if (!isStripeMissingCustomerError(err) && (err as { code?: string }).code !== 'resource_missing') {
        throw err;
      }
    }
  }

  if (customerId) {
    try {
      const listed = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 25,
      });
      for (const sub of listed.data) consider(sub);
    } catch (err) {
      if (!isStripeMissingCustomerError(err)) throw err;
    }
  }

  const match = live.find((sub) => resolveStripeSubTier(sub) === wantTier);
  if (match) return match;

  if (live.length) {
    const actual = resolveStripeSubTier(live[0]!);
    throw new Error(
      `They have an active Stripe ${actual} membership, not ${wantTier}. Pick STRIPE ${
        actual === 'yearly' ? 'YR' : 'MO'
      }, or they can change it in the Ink store.`
    );
  }

  throw new Error(
    `No active Stripe ${wantTier} membership on this account. They need to check out Studio Pro ${wantTier} so Stripe can run the usual funnel.`
  );
}

export async function applyAdminResidency(
  db: Firestore,
  targetUserId: string,
  mode: AdminResidencyMode
): Promise<AdminResidencyResult> {
  const userRef = db.collection('users').doc(targetUserId);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error('Artist not found.');
  }
  const userData = (snap.data() || {}) as Record<string, unknown>;

  if (mode === 'none') {
    await cancelActiveStripeBillingForUser(targetUserId, userData);
    await userRef.update({
      subscriptionStatus: 'none',
      subscriptionTier: 'none',
      proSource: FieldValue.delete(),
      subscriptionId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await patchPublicStudioBadge(db, targetUserId, 'free');
    return {
      mode,
      subscriptionStatus: 'none',
      subscriptionTier: 'none',
      message: 'Back to Visitor (LOCAL). Stripe membership cancelled if they had one.',
    };
  }

  if (mode === 'admin-monthly' || mode === 'admin-yearly') {
    const tier = mode === 'admin-yearly' ? 'yearly' : 'monthly';
    await userRef.update({
      subscriptionStatus: 'active',
      subscriptionTier: tier,
      proSource: 'admin',
      updatedAt: FieldValue.serverTimestamp(),
      freeEditableTrackIds: FieldValue.delete(),
      freeEditableSelectionAt: FieldValue.delete(),
    });
    await patchPublicStudioBadge(db, targetUserId, 'pro');
    return {
      mode,
      subscriptionStatus: 'active',
      subscriptionTier: tier,
      proSource: 'admin',
      message: `${residencyModeLabel(mode)} — stays Pro until you change it. Stripe cannot take this off.`,
    };
  }

  const wantTier = mode === 'stripe-yearly' ? 'yearly' : 'monthly';
  const sub = await findLiveStripeSubscription(userData, wantTier);
  await activateOrUpgradeProSubscription(db, targetUserId, wantTier, sub.id);
  return {
    mode,
    subscriptionStatus: 'active',
    subscriptionTier: wantTier,
    proSource: 'stripe',
    message: `${residencyModeLabel(mode)} — follows their Stripe membership.`,
  };
}
