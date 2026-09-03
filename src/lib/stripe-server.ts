import 'server-only';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getAuth } from '@/lib/firebase/server';
import { isAdminHeldPro } from '@/lib/admin-residency';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
  }
  return stripeClient;
}

/** Verifies Firebase ID token and returns the authenticated uid. */
export async function verifyCheckoutUser(req: Request, claimedUserId: string): Promise<string> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new CheckoutAuthError('Sign in required to complete checkout.');
  }
  const token = header.slice('Bearer '.length);
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(token);
  if (decoded.uid !== claimedUserId) {
    throw new CheckoutAuthError('Checkout user mismatch.');
  }
  return decoded.uid;
}

export class CheckoutAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutAuthError';
  }
}

/** True when Firestore has a test-mode customer id but the server uses live keys (or vice versa). */
export function isStripeMissingCustomerError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'resource_missing') return true;
  return typeof e.message === 'string' && /no such customer/i.test(e.message);
}

/** Drop test-era Stripe ids so checkout can create a fresh live customer. */
export async function clearStaleStripeBillingProfile(db: Firestore, userId: string): Promise<void> {
  const snap = await db.collection('users').doc(userId).get();
  const prev = snap.data() || {};
  const update: Record<string, unknown> = {
    stripeCustomerId: FieldValue.delete(),
    subscriptionId: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!isAdminHeldPro(prev)) {
    update.subscriptionStatus = 'canceled';
    update.subscriptionTier = 'none';
    update.proSource = FieldValue.delete();
  }
  await db.collection('users').doc(userId).update(update);
}

/**
 * Returns customer id only if it exists in the current Stripe mode (live vs test).
 * Clears Firestore billing fields when the stored id is from the other mode.
 */
export async function resolveStripeCustomerId(
  stripe: Stripe,
  db: Firestore,
  userId: string,
  storedCustomerId: string | undefined
): Promise<string | undefined> {
  const id = storedCustomerId?.trim();
  if (!id) return undefined;

  try {
    const customer = await stripe.customers.retrieve(id);
    if ('deleted' in customer && customer.deleted) {
      await clearStaleStripeBillingProfile(db, userId);
      return undefined;
    }
    return id;
  } catch (err) {
    if (!isStripeMissingCustomerError(err)) throw err;
    console.warn(`[stripe] clearing stale stripeCustomerId for user ${userId}`);
    await clearStaleStripeBillingProfile(db, userId);
    return undefined;
  }
}
