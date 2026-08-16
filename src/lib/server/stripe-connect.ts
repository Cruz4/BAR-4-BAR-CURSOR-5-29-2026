import 'server-only';

import type Stripe from 'stripe';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripe } from '@/lib/stripe-server';
import {
  EMPTY_DROP_CONNECT_STATUS,
  isDropPayoutCountry,
  type DropConnectStatus,
} from '@/lib/drop-earnings';

type UserConnectFields = {
  stripeConnectAccountId?: string;
  stripeConnectCountry?: string;
  stripeConnectDetailsSubmitted?: boolean;
  stripeConnectTransfersActive?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
};

export function connectStatusFromUser(data?: UserConnectFields | null): DropConnectStatus {
  if (!data?.stripeConnectAccountId) return { ...EMPTY_DROP_CONNECT_STATUS };
  return {
    accountId: data.stripeConnectAccountId,
    country: typeof data.stripeConnectCountry === 'string' ? data.stripeConnectCountry : null,
    detailsSubmitted: Boolean(data.stripeConnectDetailsSubmitted),
    transfersActive: Boolean(data.stripeConnectTransfersActive),
    payoutsEnabled: Boolean(data.stripeConnectPayoutsEnabled),
    currentlyDue: [],
  };
}

export function isConnectTransferReady(status: DropConnectStatus): boolean {
  return Boolean(status.accountId && status.transfersActive);
}

export function connectStatusFromStripeAccount(account: Stripe.Account): DropConnectStatus {
  const due = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ].filter((item, i, arr) => arr.indexOf(item) === i);
  return {
    accountId: account.id,
    country: account.country ?? null,
    detailsSubmitted: Boolean(account.details_submitted),
    transfersActive: account.capabilities?.transfers === 'active',
    payoutsEnabled: Boolean(account.payouts_enabled),
    currentlyDue: due.slice(0, 12),
  };
}

function mapAccount(account: Stripe.Account): DropConnectStatus {
  return connectStatusFromStripeAccount(account);
}

export async function persistConnectStatus(
  db: Firestore,
  userId: string,
  status: DropConnectStatus
): Promise<void> {
  await db.collection('users').doc(userId).set(
    {
      stripeConnectAccountId: status.accountId,
      stripeConnectCountry: status.country,
      stripeConnectDetailsSubmitted: status.detailsSubmitted,
      stripeConnectTransfersActive: status.transfersActive,
      stripeConnectPayoutsEnabled: status.payoutsEnabled,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function refreshConnectAccount(
  db: Firestore,
  userId: string,
  accountId: string
): Promise<DropConnectStatus> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  const status = mapAccount(account);
  await persistConnectStatus(db, userId, status);
  return status;
}

export async function ensureConnectAccount(
  db: Firestore,
  userId: string,
  opts: { email?: string; country?: string }
): Promise<{ status: DropConnectStatus; created: boolean }> {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  const data = (snap.data() || {}) as UserConnectFields & { email?: string };
  const existingId = typeof data.stripeConnectAccountId === 'string' ? data.stripeConnectAccountId : '';

  if (existingId) {
    const status = await refreshConnectAccount(db, userId, existingId);
    return { status, created: false };
  }

  const country = (opts.country || 'US').trim().toUpperCase();
  if (!isDropPayoutCountry(country)) {
    throw new Error('Pick a supported payout country.');
  }

  const stripe = getStripe();
  const email =
    (typeof opts.email === 'string' && opts.email.trim()) ||
    (typeof data.email === 'string' && data.email.trim()) ||
    undefined;

  // Controller properties (not legacy type: express). Platform owns fees + losses;
  // artist gets an Express dashboard and receives destination transfers.
  const account = await stripe.accounts.create({
    controller: {
      stripe_dashboard: { type: 'express' },
      fees: { payer: 'application' },
      losses: { payments: 'application' },
    },
    capabilities: {
      transfers: { requested: true },
    },
    country,
    email,
    metadata: {
      userId,
      feature: 'bar4bar-first-drops',
    },
  } as Stripe.AccountCreateParams);

  const status = mapAccount(account);
  await persistConnectStatus(db, userId, status);
  return { status, created: true };
}

export async function createConnectOnboardingLink(
  accountId: string,
  origin: string
): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/earnings?connect=refresh`,
    return_url: `${origin}/earnings?connect=return`,
    type: 'account_onboarding',
  });
  if (!link.url) throw new Error('Stripe did not return an onboarding URL.');
  return link.url;
}

export async function createConnectDashboardLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(accountId);
  if (!link.url) throw new Error('Stripe did not return a payouts dashboard URL.');
  return link.url;
}

export async function findUserIdForConnectAccount(
  db: Firestore,
  account: Stripe.Account
): Promise<string | null> {
  const fromMeta = typeof account.metadata?.userId === 'string' ? account.metadata.userId.trim() : '';
  if (fromMeta) return fromMeta;
  const snap = await db
    .collection('users')
    .where('stripeConnectAccountId', '==', account.id)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}
