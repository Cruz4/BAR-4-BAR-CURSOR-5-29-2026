import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/firebase/server';
import { getStripe } from '@/lib/stripe-server';
import {
  deactivateSubscription,
  fulfillPaidCheckoutSession,
  markWebhookProcessed,
  refillProResidency,
} from '@/lib/stripe-fulfillment';

export const runtime = 'nodejs';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/** Dev-only health check — no secret material in production responses. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true });
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const secret = endpointSecret;
  return NextResponse.json({
    ok: true,
    hasSecret: Boolean(secret),
    hasStripeKey: Boolean(stripeKey),
    stripeKeyMode: stripeKey?.startsWith('sk_live_')
      ? 'live'
      : stripeKey?.startsWith('sk_test_')
        ? 'test'
        : 'unknown',
    hint:
      'Test-mode Stripe webhooks require the test signing secret (whsec_...) from Dashboard → Webhooks → your endpoint → Reveal. Do not use the secret from stripe listen.',
  });
}

async function resolveSubscriptionUser(
  db: Awaited<ReturnType<typeof getDb>>,
  stripe: Stripe,
  subscriptionId: string,
  subscriptionObject?: Stripe.Subscription | string | null
): Promise<{ userId?: string; tier: 'monthly' | 'yearly' }> {
  if (subscriptionObject && typeof subscriptionObject === 'object') {
    const userId = subscriptionObject.metadata?.userId;
    const tier = subscriptionObject.metadata?.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
    if (userId) return { userId, tier };
  }

  const userSnap = await db
    .collection('users')
    .where('subscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
  if (!userSnap.empty) {
    const doc = userSnap.docs[0];
    const tier = doc.data()?.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
    return { userId: doc.id, tier };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      userId: subscription.metadata?.userId,
      tier: subscription.metadata?.subscriptionTier === 'yearly' ? 'yearly' : 'monthly',
    };
  } catch (err) {
    console.error('[stripe/webhook] subscription lookup failed', subscriptionId, err);
    return { tier: 'monthly' };
  }
}

export async function POST(req: Request) {
  if (!endpointSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured on server.' }, { status: 500 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error('[stripe/webhook] STRIPE_SECRET_KEY is not configured', err);
    return NextResponse.json({ error: 'Stripe API key not configured on server.' }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('[stripe/webhook] signature verification failed', {
      message,
      secretPrefix: endpointSecret.slice(0, 10),
    });
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const db = await getDb();
  const isNew = await markWebhookProcessed(db, event.id);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillPaidCheckoutSession(db, session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== 'subscription_cycle') break;
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const { userId, tier } = await resolveSubscriptionUser(
          db,
          stripe,
          subscriptionId,
          invoice.subscription
        );
        if (userId) {
          await refillProResidency(db, userId, tier);
        } else {
          console.warn('[stripe/webhook] invoice.paid: no user for subscription', subscriptionId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const tier = subscription.metadata?.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
          await db.collection('users').doc(userId).update({
            subscriptionStatus: 'active',
            subscriptionTier: tier,
            subscriptionId: subscription.id,
            updatedAt: new Date().toISOString(),
          });
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await deactivateSubscription(db, userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) await deactivateSubscription(db, userId);
        break;
      }

      default:
        break;
    }
  } catch (dbError) {
    console.error('[stripe/webhook] handler error', event.type, event.id, dbError);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
