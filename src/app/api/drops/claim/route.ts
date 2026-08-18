import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { isCommerceLive, resolveCheckoutCents } from '@/lib/drop-commerce';
import { grantDropLibrary, loadShare, priceFromShare } from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';

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
    if (!userId || !shareId) {
      return NextResponse.json({ error: 'Sign in to claim this drop.' }, { status: 400 });
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

    const priced = priceFromShare(share, share.type === 'album' ? trackId : undefined);
    if (!isCommerceLive(priced.price)) {
      return NextResponse.json({ error: 'This drop is not set to free.' }, { status: 400 });
    }
    if (resolveCheckoutCents(priced.price, 0) > 0) {
      return NextResponse.json({ error: 'This drop is paid — use checkout.' }, { status: 400 });
    }

    const scope = share.type === 'album' && !trackId ? 'album' : 'track';
    await grantDropLibrary(db, userId, {
      shareId,
      ownerId: share.ownerId,
      scope,
      projectId: share.projectId,
      title: priced.title,
      trackIds: priced.unlockTrackIds,
      amountCents: 0,
      purchasedAt: new Date().toISOString(),
      free: true,
    });

    try {
      const { recordDropUnlock } = await import('@/lib/server/drop-pulse');
      const buyerSnap = await db.collection('users').doc(userId).get();
      const buyer = buyerSnap.data() || {};
      const buyerName =
        (typeof buyer.displayName === 'string' && buyer.displayName.trim()) || 'Artist';
      await recordDropUnlock(db, {
        shareId,
        buyerId: userId,
        buyerName,
        title: priced.title,
        amountCents: 0,
      });
    } catch (err) {
      console.warn('[drops/claim] pulse', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Claim failed';
    console.error('[drops/claim]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
