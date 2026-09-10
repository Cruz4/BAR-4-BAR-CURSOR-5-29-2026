import { NextResponse } from 'next/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { getLiveDnaDropsForUser } from '@/lib/server/gamification';

export const runtime = 'nodejs';

/** Linked House releases for an artist profile (Edit Public Page + owner tools). */
export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get('userId')?.trim() || '';
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id.' }, { status: 400 });
    }
    await verifyCheckoutUser(req, userId);

    const drops = await getLiveDnaDropsForUser(userId);
    const house = drops
      .filter((drop) => drop.houseRelease)
      .map((drop) => ({
        shareId: drop.shareId,
        title: drop.title,
        type: drop.type,
        ...(drop.albumTitle ? { albumTitle: drop.albumTitle } : {}),
        ...(typeof drop.trackCount === 'number' ? { trackCount: drop.trackCount } : {}),
        releaseLive: Boolean(drop.releaseLive),
      }));

    return NextResponse.json({ releases: house });
  } catch (error) {
    if (error instanceof CheckoutAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[profile/house-releases GET]', error);
    return NextResponse.json({ error: 'Could not load House releases.' }, { status: 500 });
  }
}
