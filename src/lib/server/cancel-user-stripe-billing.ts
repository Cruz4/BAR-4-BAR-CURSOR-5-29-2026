import 'server-only';

import type Stripe from 'stripe';
import { getStripe, isStripeMissingCustomerError } from '@/lib/stripe-server';

const CANCELABLE_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
]);

export type CancelUserStripeBillingResult = {
  canceledSubscriptionIds: string[];
  skippedAlreadyCanceled: string[];
};

function isSubscriptionAlreadyCanceled(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === 'resource_missing' ||
    (typeof e.message === 'string' &&
      (/already been canceled/i.test(e.message) || /no such subscription/i.test(e.message)))
  );
}

async function cancelSubscriptionIfNeeded(
  stripe: Stripe,
  subscriptionId: string
): Promise<'canceled' | 'skipped' | 'failed'> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status === 'canceled') return 'skipped';
    if (!CANCELABLE_STATUSES.has(sub.status)) return 'skipped';
    await stripe.subscriptions.cancel(subscriptionId);
    return 'canceled';
  } catch (err) {
    if (isSubscriptionAlreadyCanceled(err)) return 'skipped';
    throw err;
  }
}

/**
 * Cancel active Stripe subscriptions before account eradication.
 * Uses stored subscriptionId, then scans the Stripe customer for any remaining billable subs.
 */
export async function cancelActiveStripeBillingForUser(
  _userId: string,
  userData: Record<string, unknown>
): Promise<CancelUserStripeBillingResult> {
  const subscriptionId = String(userData.subscriptionId || '').trim();
  const stripeCustomerId = String(userData.stripeCustomerId || '').trim();
  const subscriptionStatus = String(userData.subscriptionStatus || 'none');

  const hasBillingProfile =
    subscriptionStatus === 'active' || Boolean(subscriptionId) || Boolean(stripeCustomerId);
  if (!hasBillingProfile) {
    return { canceledSubscriptionIds: [], skippedAlreadyCanceled: [] };
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    if (subscriptionStatus === 'active') {
      throw new Error(
        'Could not cancel Studio Pro billing before account deletion. Try Manage Stripe Account first, or contact support.'
      );
    }
    return { canceledSubscriptionIds: [], skippedAlreadyCanceled: [] };
  }

  const canceledSubscriptionIds: string[] = [];
  const skippedAlreadyCanceled: string[] = [];
  const seen = new Set<string>();

  const trackResult = (id: string, result: 'canceled' | 'skipped' | 'failed') => {
    if (result === 'canceled') canceledSubscriptionIds.push(id);
    else if (result === 'skipped') skippedAlreadyCanceled.push(id);
  };

  if (subscriptionId) {
    seen.add(subscriptionId);
    trackResult(subscriptionId, await cancelSubscriptionIfNeeded(stripe, subscriptionId));
  }

  if (stripeCustomerId) {
    try {
      const listed = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 25,
      });
      for (const sub of listed.data) {
        if (seen.has(sub.id)) continue;
        seen.add(sub.id);
        trackResult(sub.id, await cancelSubscriptionIfNeeded(stripe, sub.id));
      }
    } catch (err) {
      if (!isStripeMissingCustomerError(err)) throw err;
    }
  }

  return { canceledSubscriptionIds, skippedAlreadyCanceled };
}
