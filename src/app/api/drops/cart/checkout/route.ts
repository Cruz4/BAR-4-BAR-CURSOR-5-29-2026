import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, getStripe, verifyCheckoutUser } from '@/lib/stripe-server';
import { getTrustedAppOrigin } from '@/lib/server/trusted-origin';
import { getPublicAppUrl } from '@/lib/app-url';
import {
  assertPaidAmount,
  BAR4BAR_FIRST_DROPS,
  dropArtistNetCents,
  dropPlatformFeeCents,
  isCommerceLive,
  resolveCheckoutCents,
} from '@/lib/drop-commerce';
import {
  DROP_CART_MAX_ITEMS,
  dropCartItemKey,
  type DropCheckoutOrder,
  type DropCheckoutOrderItem,
} from '@/lib/drop-cart';
import {
  isReleaseShareLive,
  loadShare,
  priceFromShare,
  userCanStreamFull,
} from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { recordStudioEvent } from '@/lib/server/studio-analytics';

export const runtime = 'nodejs';

type RequestedItem = { shareId?: unknown; trackId?: unknown; amountCents?: unknown };

export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    const requested = Array.isArray(body.items) ? (body.items as RequestedItem[]) : [];
    if (!userId || requested.length < 1 || requested.length > DROP_CART_MAX_ITEMS) {
      return NextResponse.json(
        { error: `Choose between 1 and ${DROP_CART_MAX_ITEMS} releases.` },
        { status: 400 }
      );
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const db = await getDb();
    const orderItems: DropCheckoutOrderItem[] = [];
    const seen = new Set<string>();
    const albumBundles = new Set<string>();
    const albumTrackSelections = new Set<string>();

    for (const candidate of requested) {
      const shareId = typeof candidate.shareId === 'string' ? candidate.shareId.trim() : '';
      const trackId =
        typeof candidate.trackId === 'string' && candidate.trackId.trim()
          ? candidate.trackId.trim()
          : undefined;
      const fanCents =
        typeof candidate.amountCents === 'number' && Number.isFinite(candidate.amountCents)
          ? Math.round(candidate.amountCents)
          : undefined;
      if (!shareId) return NextResponse.json({ error: 'A cart item is missing its release.' }, { status: 400 });
      const key = dropCartItemKey(shareId, trackId);
      if (seen.has(key)) return NextResponse.json({ error: 'The same release appears twice in your cart.' }, { status: 400 });
      seen.add(key);

      const share = await loadShare(db, shareId);
      if (!share || !isReleaseShareLive(share)) {
        return NextResponse.json({ error: 'A release in your cart is no longer for sale.' }, { status: 409 });
      }
      if (share.ownerId === userId) {
        return NextResponse.json({ error: `Remove your own release from the cart.` }, { status: 400 });
      }
      if (share.type === 'album') {
        if (trackId) {
          const tracks = Array.isArray(share.data?.tracks)
            ? (share.data?.tracks as Array<{ id?: unknown }>)
            : [];
          if (!tracks.some((track) => track?.id === trackId)) {
            return NextResponse.json({ error: 'An album track in your cart no longer exists.' }, { status: 409 });
          }
        }
        if (trackId) {
          if (albumBundles.has(shareId)) {
            return NextResponse.json({ error: 'Remove the duplicate album track or album bundle.' }, { status: 400 });
          }
          albumTrackSelections.add(shareId);
        } else {
          if (albumTrackSelections.has(shareId)) {
            return NextResponse.json({ error: 'Choose either the album bundle or its individual tracks—not both.' }, { status: 400 });
          }
          albumBundles.add(shareId);
        }
      }

      const priced = priceFromShare(share, share.type === 'album' ? trackId : undefined);
      if (!isCommerceLive(priced.price)) {
        return NextResponse.json({ error: `${priced.title} is no longer for sale.` }, { status: 409 });
      }
      if (await userCanStreamFull({ db, share, userId, trackId })) {
        return NextResponse.json({ error: `${priced.title} is already in your Library.` }, { status: 409 });
      }
      const amountCents = resolveCheckoutCents(priced.price, fanCents);
      assertPaidAmount(amountCents);
      const artistSnap = await db.collection('users').doc(share.ownerId).get();
      const artist = artistSnap.data() || {};
      const artistName =
        (typeof share.ownerName === 'string' && share.ownerName.trim()) ||
        (typeof artist.displayName === 'string' && artist.displayName.trim()) ||
        'Bar4Bar artist';
      orderItems.push({
        key,
        shareId,
        ...(trackId ? { trackId } : {}),
        ownerId: share.ownerId,
        artistName: artistName.slice(0, 80),
        scope: share.type === 'album' && !trackId ? 'album' : 'track',
        projectId: share.projectId,
        title: priced.title.slice(0, 120),
        trackIds: priced.unlockTrackIds.slice(0, 80),
        amountCents,
        feeCents: dropPlatformFeeCents(amountCents),
        netCents: dropArtistNetCents(amountCents),
      });
    }

    const totalCents = orderItems.reduce((sum, item) => sum + item.amountCents, 0);
    const now = new Date().toISOString();
    const orderRef = db.collection('dropCheckoutOrders').doc();
    const order: DropCheckoutOrder = {
      buyerId: userId,
      items: orderItems,
      totalCents,
      currency: 'usd',
      status: 'pending',
      fulfilledItemKeys: [],
      createdAt: now,
      updatedAt: now,
    };
    await orderRef.set(order);

    const stripe = getStripe();
    const origin = getTrustedAppOrigin(req);
    const transferGroup = `b4b_cart_${orderRef.id}`;
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: orderItems.map((item) => ({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: item.amountCents,
          product_data: {
            name: item.title,
            description: `${item.artistName} · Bar4Bar ${item.scope === 'album' ? 'album' : 'song'} stream`,
          },
        },
      })),
      success_url: `${origin}/library?cart_purchased=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/library?cart_canceled=1&openCart=1`,
      client_reference_id: userId,
      metadata: {
        type: 'drop_cart_purchase',
        feature: BAR4BAR_FIRST_DROPS,
        userId,
        orderId: orderRef.id,
        itemCount: String(orderItems.length),
      },
      payment_intent_data: {
        transfer_group: transferGroup,
        metadata: {
          type: 'drop_cart_purchase',
          orderId: orderRef.id,
          buyerId: userId,
        },
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

    try {
      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `drop-cart-checkout-${orderRef.id}`,
      });
      await orderRef.update({ stripeSessionId: session.id, updatedAt: new Date().toISOString() });
      await recordStudioEvent(userId, 'drop_checkout_started', {
        orderId: orderRef.id,
        itemCount: orderItems.length,
        amountCents: totalCents,
      }, email);
      return NextResponse.json({ url: session.url, sessionId: session.id, orderId: orderRef.id });
    } catch (error) {
      await orderRef.set({
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message.slice(0, 300) : 'Stripe checkout failed',
      }, { merge: true });
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cart checkout failed';
    console.error('[drops/cart/checkout]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
