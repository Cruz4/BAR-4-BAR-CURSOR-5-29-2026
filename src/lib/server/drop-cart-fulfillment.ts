import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripe } from '@/lib/stripe-server';
import type { DropCheckoutOrder } from '@/lib/drop-cart';
import { grantDropLibrary } from '@/lib/server/drop-entitlements';
import { recordDropSale } from '@/lib/server/drop-earnings';
import { connectStatusFromUser, isConnectTransferReady } from '@/lib/server/stripe-connect';
import { recordStudioEvent } from '@/lib/server/studio-analytics';

export type DropCartCheckoutSession = {
  id: string;
  metadata: Record<string, string> | null;
  amount_total: number | null;
  payment_intent?: string | { id: string } | null;
  client_reference_id: string | null;
};

async function resolveSourceChargeId(session: DropCartCheckoutSession): Promise<string | undefined> {
  const stripe = getStripe();
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  if (paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const charge = intent.latest_charge;
    return typeof charge === 'string' ? charge : charge?.id;
  }
  const checkout = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent.latest_charge'],
  });
  const intent = checkout.payment_intent;
  if (!intent || typeof intent === 'string') return undefined;
  const charge = intent.latest_charge;
  return typeof charge === 'string' ? charge : charge?.id;
}

export async function fulfillDropCartCheckout(
  db: Firestore,
  session: DropCartCheckoutSession,
  buyerId: string
): Promise<{ itemCount: number }> {
  const orderId = session.metadata?.orderId?.trim();
  if (!orderId) throw new Error('Cart checkout is missing its order.');
  const orderRef = db.collection('dropCheckoutOrders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error('Cart order was not found.');
  const order = orderSnap.data() as DropCheckoutOrder;
  if (order.buyerId !== buyerId) throw new Error('Cart order belongs to a different account.');
  if (order.stripeSessionId && order.stripeSessionId !== session.id) {
    throw new Error('Cart order does not match this Stripe checkout.');
  }
  if (!Array.isArray(order.items) || order.items.length < 1) throw new Error('Cart order is empty.');
  if ((session.amount_total ?? 0) !== order.totalCents) {
    throw new Error('Paid cart total does not match the server order.');
  }
  if (order.status === 'fulfilled') return { itemCount: order.items.length };

  await orderRef.set({ status: 'processing', updatedAt: new Date().toISOString() }, { merge: true });
  const buyerSnap = await db.collection('users').doc(buyerId).get();
  const buyer = buyerSnap.data() || {};
  const buyerName =
    (typeof buyer.displayName === 'string' && buyer.displayName.trim()) ||
    (typeof buyer.name === 'string' && buyer.name.trim()) ||
    'Fan';
  const alreadyFulfilled = new Set(order.fulfilledItemKeys || []);
  const stripe = getStripe();
  let sourceChargeId: string | undefined;
  let sourceChargeResolved = false;

  for (let index = 0; index < order.items.length; index += 1) {
    const item = order.items[index];
    if (alreadyFulfilled.has(item.key)) continue;
    const purchaseId = `${session.id}:${index}`;
    await grantDropLibrary(db, buyerId, {
      shareId: item.shareId,
      ownerId: item.ownerId,
      scope: item.scope,
      projectId: item.projectId,
      title: item.title,
      trackIds: item.trackIds,
      amountCents: item.amountCents,
      purchasedAt: new Date().toISOString(),
      stripeSessionId: session.id,
      purchaseId,
    });

    const artistSnap = await db.collection('users').doc(item.ownerId).get();
    const connect = connectStatusFromUser(artistSnap.data());
    let payoutMode: 'destination' | 'held' = 'held';
    let transferId: string | undefined;
    if (isConnectTransferReady(connect) && connect.accountId && item.netCents > 0) {
      try {
        if (!sourceChargeResolved) {
          sourceChargeId = await resolveSourceChargeId(session);
          sourceChargeResolved = true;
        }
        const transfer = await stripe.transfers.create(
          {
            amount: item.netCents,
            currency: 'usd',
            destination: connect.accountId,
            ...(sourceChargeId ? { source_transaction: sourceChargeId } : {}),
            transfer_group: `b4b_cart_${orderId}`,
            metadata: {
              feature: 'bar4bar-first-drops',
              orderId,
              cartItem: String(index),
              artistId: item.ownerId,
              shareId: item.shareId,
            },
          },
          { idempotencyKey: `drop-cart-transfer-${orderId}-${index}` }
        );
        payoutMode = 'destination';
        transferId = transfer.id;
      } catch (error) {
        console.warn('[drop-cart] artist transfer held for later release', {
          orderId,
          item: index,
          artistId: item.ownerId,
          error,
        });
      }
    }

    await recordDropSale(db, item.ownerId, {
      saleId: `${session.id}_${index}`,
      shareId: item.shareId,
      title: item.title,
      scope: item.scope,
      buyerId,
      buyerName,
      amountCents: item.amountCents,
      feeCents: item.feeCents,
      netCents: item.netCents,
      payoutMode,
      stripeSessionId: session.id,
      stripeTransferId: transferId,
      connectAccountId: connect.accountId || undefined,
    });

    await recordStudioEvent(buyerId, 'drop_purchase', {
      shareId: item.shareId,
      amountCents: item.amountCents,
      scope: item.scope,
      orderId,
    });
    try {
      const { recordDropUnlock } = await import('@/lib/server/drop-pulse');
      await recordDropUnlock(db, {
        shareId: item.shareId,
        buyerId,
        buyerName,
        title: item.title,
        amountCents: item.amountCents,
      });
    } catch (error) {
      console.warn('[drop-cart] unlock pulse delayed', error);
    }
    try {
      const { processGamificationEvent } = await import('@/lib/server/gamification');
      await Promise.all([
        item.ownerId !== buyerId
          ? processGamificationEvent(buyerId, 'paid_support', { shareId: item.shareId }, buyerName)
          : Promise.resolve(),
        processGamificationEvent(item.ownerId, 'creator_sale', { shareId: item.shareId }),
      ]);
    } catch (error) {
      console.warn('[drop-cart] verified music achievements delayed', error);
    }
    await orderRef.set(
      {
        fulfilledItemKeys: FieldValue.arrayUnion(item.key),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  await orderRef.set(
    {
      status: 'fulfilled',
      stripeSessionId: session.id,
      fulfilledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return { itemCount: order.items.length };
}
