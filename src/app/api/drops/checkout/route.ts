import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, getStripe, verifyCheckoutUser } from '@/lib/stripe-server';
import { getTrustedAppOrigin } from '@/lib/server/trusted-origin';
import { getPublicAppUrl } from '@/lib/app-url';
import {
  assertPaidAmount,
  BAR4BAR_FIRST_DROPS,
  dropPlatformFeeBps,
  dropArtistNetCents,
  dropPlatformFeeCents,
  isCommerceLive,
  resolveCheckoutCents,
} from '@/lib/drop-commerce';
import { loadShare, priceFromShare } from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { recordStudioEvent } from '@/lib/server/studio-analytics';
import { connectStatusFromUser, isConnectTransferReady } from '@/lib/server/stripe-connect';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'First Drops is off' }, { status: 404 });
  }
  try {
    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim() : '';
    const trackId = typeof body.trackId === 'string' ? body.trackId.trim() : undefined;
    const fanCents = typeof body.amountCents === 'number' ? Math.round(body.amountCents) : undefined;
    const email = typeof body.email === 'string' ? body.email : undefined;

    if (!userId || !shareId) {
      return NextResponse.json({ error: 'Missing user or drop.' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const db = await getDb();
    const share = await loadShare(db, shareId);
    if (!share) return NextResponse.json({ error: 'This drop is offline.' }, { status: 404 });
    if (share.ownerId === userId) {
      return NextResponse.json({ error: 'This is your drop — it already streams for you.' }, { status: 400 });
    }

    const priced = priceFromShare(share, share.type === 'album' ? trackId : undefined);
    if (!isCommerceLive(priced.price)) {
      return NextResponse.json({ error: 'This drop is not for sale.' }, { status: 400 });
    }

    const amountCents = resolveCheckoutCents(priced.price, fanCents);
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Use the free claim for this drop.' }, { status: 400 });
    }
    assertPaidAmount(amountCents);

    const feeCents = dropPlatformFeeCents(amountCents);
    const netCents = dropArtistNetCents(amountCents);
    const artistSnap = await db.collection('users').doc(share.ownerId).get();
    const connect = connectStatusFromUser(artistSnap.data());
    const destinationReady = isConnectTransferReady(connect);
    const payoutMode = destinationReady ? 'destination' : 'held';

    const stripe = getStripe();
    const origin = getTrustedAppOrigin(req);
    const scope = share.type === 'album' && !trackId ? 'album' : 'track';
    const publicPath = share.type === 'album' ? 'share' : 'song';
    const successPath = `/${publicPath}/${encodeURIComponent(shareId)}?purchased=1&session_id={CHECKOUT_SESSION_ID}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: priced.title.slice(0, 120),
              description: `Bar 4 Bar First Drop · ${scope === 'album' ? 'album' : 'song'} stream`,
            },
          },
        },
      ],
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}/${publicPath}/${encodeURIComponent(shareId)}?canceled=1`,
      client_reference_id: userId,
      metadata: {
        type: 'drop_purchase',
        feature: BAR4BAR_FIRST_DROPS,
        userId,
        shareId,
        artistId: share.ownerId,
        scope,
        projectId: share.projectId,
        trackIds: priced.unlockTrackIds.slice(0, 40).join(','),
        amountCents: String(amountCents),
        feeCents: String(feeCents),
        netCents: String(netCents),
        title: priced.title.slice(0, 80),
        feeBps: String(dropPlatformFeeBps(amountCents)),
        payoutMode,
        ...(connect.accountId ? { connectAccountId: connect.accountId } : {}),
      },
      automatic_tax: { enabled: false },
      consent_collection: { terms_of_service: 'required' },
      custom_text: {
        terms_of_service_acceptance: {
          message: `I agree to the [Terms of Service](${getPublicAppUrl()}/terms) of Bar 4 Bar Studio.`,
        },
      },
      customer_creation: 'always',
    };

    if (email) sessionParams.customer_email = email;

    if (destinationReady && connect.accountId && feeCents > 0 && netCents > 0) {
      sessionParams.payment_intent_data = {
        application_fee_amount: feeCents,
        transfer_data: { destination: connect.accountId },
        metadata: {
          type: 'drop_purchase',
          artistId: share.ownerId,
          shareId,
        },
      };
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (createErr) {
      if (sessionParams.payment_intent_data) {
        console.warn('[drops/checkout] destination charge failed, holding payout', createErr);
        delete sessionParams.payment_intent_data;
        sessionParams.metadata = {
          ...sessionParams.metadata,
          payoutMode: 'held',
        };
        session = await stripe.checkout.sessions.create(sessionParams);
      } else {
        throw createErr;
      }
    }
    await recordStudioEvent(userId, 'drop_checkout_started', {
      shareId,
      amountCents,
      scope,
    }, email);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('[drops/checkout]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
