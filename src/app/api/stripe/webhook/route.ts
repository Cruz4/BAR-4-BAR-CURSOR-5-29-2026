import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/firebase/server';
import { getStripe } from '@/lib/stripe-server';
import {
  constructStripeWebhookEvent,
  getStripeWebhookSecrets,
  secretPrefix,
  webhookSecretHealth,
} from '@/lib/stripe-webhook-verify';
import {
  activateOrUpgradeProSubscription,
  deactivateSubscription,
  fulfillPaidCheckoutSession,
  markWebhookProcessed,
  refillProResidency,
} from '@/lib/stripe-fulfillment';
import { getCatalogEntry, getResidencyRefillForTier } from '@/lib/stripe-catalog';
import {
  sendInkPurchaseEmail,
  sendMembershipCanceledEmail,
  sendProUpgradeEmail,
  sendRenewalChargeEmail,
} from '@/lib/server/mail/lifecycle-emails';
import {
  connectStatusFromStripeAccount,
  findUserIdForConnectAccount,
  isConnectTransferReady,
  persistConnectStatus,
} from '@/lib/server/stripe-connect';
import { releaseHeldDropEarnings } from '@/lib/server/drop-earnings';

export const runtime = 'nodejs';

function resolveTierFromSubscription(
  subscription: Stripe.Subscription
): 'monthly' | 'yearly' {
  if (subscription.metadata?.subscriptionTier === 'yearly') return 'yearly';
  if (subscription.metadata?.subscriptionTier === 'monthly') return 'monthly';

  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId) {
    const entry = getCatalogEntry(priceId);
    if (entry?.type === 'subscription') return entry.tier;
  }
  return 'monthly';
}

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
    const tier = resolveTierFromSubscription(subscriptionObject);
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
      tier: resolveTierFromSubscription(subscription),
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
        const result = await fulfillPaidCheckoutSession(
          db,
          session as unknown as Parameters<typeof fulfillPaidCheckoutSession>[1]
        );
        if (!result.duplicate) {
          const meta = session.metadata || {};
          const userId = meta.userId || session.client_reference_id || '';
          const amountUsd = (session.amount_total || 0) / 100;
          const customerEmail =
            session.customer_details?.email ||
            (typeof session.customer_email === 'string' ? session.customer_email : null);
          if (userId && meta.type === 'subscription') {
            const tier = meta.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
            void sendProUpgradeEmail(db, {
              userId,
              tier,
              amountUsd,
              eventKey: event.id,
              email: customerEmail,
            }).catch((e) => console.warn('[stripe/webhook] pro upgrade email', e));
          } else if (userId && result.inkAmount > 0) {
            void sendInkPurchaseEmail(db, {
              userId,
              inkAmount: result.inkAmount,
              amountUsd,
              eventKey: event.id,
              email: customerEmail,
            }).catch((e) => console.warn('[stripe/webhook] ink purchase email', e));
          }
        }
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
          await refillProResidency(db, userId, tier, {
            logOps: true,
            amountTotalUsd: (invoice.amount_paid || 0) / 100,
            reason: tier === 'yearly' ? 'Yearly Pro renewal' : 'Monthly Pro renewal',
          });
          void sendRenewalChargeEmail(db, {
            userId,
            tier,
            amountUsd: (invoice.amount_paid || 0) / 100,
            residencyInk: getResidencyRefillForTier(tier),
            eventKey: event.id,
            email: invoice.customer_email,
          }).catch((e) => console.warn('[stripe/webhook] renewal email', e));
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
          const tier = resolveTierFromSubscription(subscription);
          await activateOrUpgradeProSubscription(db, userId, tier, subscription.id);
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await deactivateSubscription(db, userId);
          void sendMembershipCanceledEmail(db, {
            userId,
            eventKey: event.id,
          }).catch((e) => console.warn('[stripe/webhook] cancel email', e));
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await deactivateSubscription(db, userId);
          void sendMembershipCanceledEmail(db, {
            userId,
            eventKey: event.id,
          }).catch((e) => console.warn('[stripe/webhook] cancel email', e));
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const artistId = await findUserIdForConnectAccount(db, account);
        if (!artistId) break;
        const connect = connectStatusFromStripeAccount(account);
        await persistConnectStatus(db, artistId, connect);
        if (isConnectTransferReady(connect) && connect.accountId) {
          try {
            await releaseHeldDropEarnings(db, artistId, connect.accountId);
          } catch (err) {
            console.warn('[stripe/webhook] held earnings release', artistId, err);
          }
        }
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
