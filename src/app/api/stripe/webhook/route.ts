import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { getStripe } from '@/lib/stripe-server';
import {
  constructStripeWebhookEvent,
  getStripeWebhookSecrets,
  secretPrefix,
  webhookSecretHealth,
} from '@/lib/stripe-webhook-verify';
import {
  deactivateSubscription,
  fulfillPaidCheckoutSession,
  markWebhookProcessed,
  refillProResidency,
} from '@/lib/stripe-fulfillment';

export const runtime = 'nodejs';

/** Health check — prefixes only, never full secrets. */
export async function GET() {
  const health = webhookSecretHealth();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  return NextResponse.json({
    ok: health.hasLiveSecret || health.hasTestSecret,
    ...health,
    hasStripeKey: Boolean(stripeKey),
    stripeKeyMode: stripeKey?.startsWith('sk_live_')
      ? 'live'
      : stripeKey?.startsWith('sk_test_')
        ? 'test'
        : 'unknown',
    hint:
      'Match livePrefix/testPrefix to Stripe Dashboard → Webhooks → your endpoint → Reveal. Use STRIPE_WEBHOOK_SECRET_TEST for sandbox (b4b-b4b). Do not use stripe listen secrets in production.',
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
  const webhookSecrets = getStripeWebhookSecrets();
  if (webhookSecrets.length === 0) {
    console.error('[stripe/webhook] No STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_TEST configured');
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
  let secretUsed: string;
  try {
    const verified = constructStripeWebhookEvent(stripe, body, sig);
    event = verified.event;
    secretUsed = verified.secretUsed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    const health = webhookSecretHealth();
    console.error('[stripe/webhook] signature verification failed', {
      message,
      configuredPrefixes: webhookSecrets.map(secretPrefix),
      hasTestSecret: health.hasTestSecret,
      hasLiveSecret: health.hasLiveSecret,
      hint: 'Use signing secret from Stripe Dashboard → Webhooks → endpoint → Reveal (sandbox vs live differ).',
    });
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const db = await getDb();
  const isNew = await markWebhookProcessed(db, event.id);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  console.info('[stripe/webhook] processing', {
    type: event.type,
    eventId: event.id,
    livemode: event.livemode,
    secretUsed,
  });

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
            freeEditableTrackIds: FieldValue.delete(),
            freeEditableSelectionAt: FieldValue.delete(),
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
