import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { isDropFree } from '@/lib/drop-commerce';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import {
  grantDropLibrary,
  isReleaseShareLive,
  loadShare,
  priceFromShare,
  userCanStreamFull,
} from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';

export const runtime = 'nodejs';

/** Add a free artist release to the signed-in member's Library. */
export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim() : '';
    const trackId = typeof body.trackId === 'string' ? body.trackId.trim() : undefined;
    if (!userId || !shareId) {
      return NextResponse.json({ error: 'Missing user or release.' }, { status: 400 });
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
    if (!share) return NextResponse.json({ error: 'This release is offline.' }, { status: 404 });
    if (!isReleaseShareLive(share)) {
      return NextResponse.json({ error: 'This release is not currently available.' }, { status: 404 });
    }
    if (share.houseRelease) {
      return NextResponse.json({ error: 'House releases unlock automatically for members.' }, { status: 400 });
    }
    if (share.ownerId === userId) {
      return NextResponse.json({ error: 'This is your release — it already streams for you.' }, { status: 400 });
    }
    if (await userCanStreamFull({ db, share, userId, trackId })) {
      return NextResponse.json({ ok: true, alreadyOwned: true });
    }

    const priced = priceFromShare(share, share.type === 'album' ? trackId : undefined);
    if (!isDropFree(priced.price)) {
      return NextResponse.json({ error: 'Paid checkout is required for this release.' }, { status: 400 });
    }

    const scope = share.type === 'album' && !trackId ? 'album' : 'track';
    await grantDropLibrary(db, userId, {
      shareId: share.id,
      ownerId: share.ownerId,
      scope,
      projectId: share.projectId,
      title: priced.title,
      trackIds: priced.unlockTrackIds,
      amountCents: 0,
      purchasedAt: new Date().toISOString(),
      free: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[drops/claim]', err);
    return NextResponse.json({ error: 'Could not add this release to Library.' }, { status: 500 });
  }
}
