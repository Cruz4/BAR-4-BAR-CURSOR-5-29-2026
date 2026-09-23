import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCatalogEntry, isProGatedInkPackPriceId, resolveStripePriceId } from '@/lib/stripe-catalog';
import {
  getStripe,
  verifyCheckoutUser,
  CheckoutAuthError,
  resolveStripeCustomerId,
  isStripeMissingCustomerError,
  clearStaleStripeBillingProfile,
} from '@/lib/stripe-server';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { recordStudioEvent } from '@/lib/server/studio-analytics';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { getTrustedAppOrigin } from '@/lib/server/trusted-origin';
import { getPublicAppUrl } from '@/lib/app-url';
import { withCheckoutCard3ds } from '@/lib/stripe-checkout-security';
import { getProductSurfaces } from '@/lib/server/product-surfaces';
import { isSongGenerationSurfaceLive } from '@/lib/product-surface-modes';

export const runtime = 'nodejs';

function checkoutAlertDetail(
  catalogEntry: NonNullable<ReturnType<typeof getCatalogEntry>>,
  priceKey?: string
): string {
  if (catalogEntry.type === 'subscription') {
    const product = catalogEntry.product === 'max' ? 'Studio Max' : 'Studio Pro';
    return catalogEntry.tier === 'yearly' ? `${product} Yearly` : `${product} Monthly`;
  }
  if (typeof priceKey === 'string' && priceKey.trim()) {
    return priceKey.trim().replace(/_/g, ' ');
  }
  if ('inkAmount' in catalogEntry) {
    return `Ink pack (${catalogEntry.inkAmount} Ink)`;
  }
  return `Cloud pass pack (${catalogEntry.cloudPassAmount} passes)`;
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { priceKey, priceId: clientPriceId, userId, email } = await req.json();

    const priceId =
      typeof priceKey === 'string' && priceKey.trim()
        ? resolveStripePriceId(priceKey.trim())
        : typeof clientPriceId === 'string'
          ? clientPriceId.trim()
          : '';

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: priceKey ? `Unknown or unsupported price key: ${priceKey}` : 'Missing priceKey or userId' },
        { status: 400 }
      );
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const catalogEntry = getCatalogEntry(priceId);
    if (!catalogEntry) {
      return NextResponse.json({ error: 'Unknown or unsupported price' }, { status: 400 });
    }

    if (
      catalogEntry.type === 'subscription' &&
      catalogEntry.product === 'max'
    ) {
      const surfaces = await getProductSurfaces();
      if (!isSongGenerationSurfaceLive(surfaces.songGeneration)) {
        return NextResponse.json(
          { error: 'Studio Max is not available yet.' },
          { status: 403 }
        );
      }
    }

    const isSubscription = catalogEntry.type === 'subscription';
    const inkAmount =
      catalogEntry.type === 'one_time' && 'inkAmount' in catalogEntry ? catalogEntry.inkAmount : 0;
    const origin = getTrustedAppOrigin(req);

    let stripeCustomerId: string | undefined;
    let userData: Record<string, unknown> | undefined;
    let db: Awaited<ReturnType<typeof getDb>> | undefined;
    if (hasAdminFirestoreCredentials()) {
      try {
        db = await getDb();
        const userSnap = await db.collection('users').doc(userId).get();
        userData = userSnap.data();
        const storedCustomerId = userData?.stripeCustomerId as string | undefined;
        stripeCustomerId = await resolveStripeCustomerId(stripe, db, userId, storedCustomerId);
        if (storedCustomerId && !stripeCustomerId && userData) {
          userData = { ...userData, subscriptionStatus: 'canceled', subscriptionTier: undefined };
        }
      } catch (dbErr) {
        console.warn('Checkout: could not load user billing profile, continuing as new customer', dbErr);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.info(
        'Checkout: skipping Firestore (no FIREBASE_SERVICE_ACCOUNT_KEY). Stripe session will still open; webhook fulfillment needs credentials locally.'
      );
    }

    if (
      isProGatedInkPackPriceId(priceId) &&
      userData?.subscriptionStatus !== 'active'
    ) {
      return NextResponse.json(
        {
          error:
            'Artist Bundle and Studio Vault packs require an active Studio Pro membership. Visitor artists can purchase the Studio Pack, or upgrade to Pro first.',
        },
        { status: 403 }
      );
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${origin}/usage?success=true&tab=${isSubscription ? 'cloud' : 'buy-ink'}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/usage?canceled=true&tab=${isSubscription ? 'cloud' : 'buy-ink'}`,
      client_reference_id: userId,
      metadata: {
        userId,
        inkAmount: inkAmount.toString(),
        type: isSubscription ? 'subscription' : 'one_time',
        ...(isSubscription
          ? {
              subscriptionTier: catalogEntry.tier,
              ...(catalogEntry.product === 'max' ? { subscriptionProduct: 'max' } : {}),
            }
          : {}),
        ...(userData?.referredBy ? { referredBy: String(userData.referredBy) } : {}),
        ...(userData?.referralCode ? { referralCode: String(userData.referralCode) } : {}),
      },
      automatic_tax: { enabled: false },
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `I agree to the [Terms of Service](${getPublicAppUrl()}/terms) and [Privacy Policy](${getPublicAppUrl()}/privacy) of AKAsheet.`,
        },
      },
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    if (isSubscription) {
      sessionParams.allow_promotion_codes = true;
      sessionParams.subscription_data = {
        metadata: {
          userId,
          subscriptionTier: catalogEntry.tier,
          ...(catalogEntry.product === 'max' ? { subscriptionProduct: 'max' } : {}),
        },
      };
      // No Stripe trial — free demo + pay-now Pro only.
    } else {
      sessionParams.customer_creation = stripeCustomerId ? undefined : 'always';
      const yearlyCoupon = process.env.STRIPE_COUPON_YEARLY_INK_50?.trim();
      const qualifiesForYearlyInkDiscount =
        userData?.subscriptionTier === 'yearly' && userData?.subscriptionStatus === 'active' && Boolean(yearlyCoupon);
      if (qualifiesForYearlyInkDiscount && yearlyCoupon) {
        sessionParams.discounts = [{ coupon: yearlyCoupon }];
      } else {
        sessionParams.allow_promotion_codes = true;
      }
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(withCheckoutCard3ds(sessionParams));
    } catch (createErr) {
      if (sessionParams.customer && db && isStripeMissingCustomerError(createErr)) {
        await clearStaleStripeBillingProfile(db, userId);
        delete sessionParams.customer;
        if (!isSubscription) {
          sessionParams.customer_creation = 'always';
        }
        if (email) sessionParams.customer_email = email;
        session = await stripe.checkout.sessions.create(withCheckoutCard3ds(sessionParams));
      } else {
        throw createErr;
      }
    }

    await recordStudioEvent(userId, 'checkout_started', {
      priceId,
      type: isSubscription ? 'subscription' : 'one_time',
      tier: isSubscription ? catalogEntry.tier : null,
    }, email);

    const signupAttribution =
      typeof userData?.signupAttribution === 'string' ? userData.signupAttribution : null;
    await enqueueAdminAlert({
      kind: 'checkout_started',
      userId,
      userEmail: email || null,
      ref: signupAttribution,
      detail: checkoutAlertDetail(catalogEntry, typeof priceKey === 'string' ? priceKey : undefined),
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('Stripe Session Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
