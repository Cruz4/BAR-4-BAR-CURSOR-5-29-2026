import 'server-only';
import Stripe from 'stripe';
import { getAuth } from '@/lib/firebase/server';

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
