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

export async function POST(req: Request) {
  if (!endpointSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured on server.' }, { status: 500 });
  }

  const stripe = getStripe();
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

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;
        const tier = subscription.metadata?.subscriptionTier === 'yearly' ? 'yearly' : 'monthly';
        if (userId) {
          await refillProResidency(db, userId, tier);
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
    console.error('Webhook handler error:', dbError);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
