import { NextResponse } from 'next/server';
import { searchPublicArtists } from '@/lib/server/gamification';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const excludeUserId = searchParams.get('excludeUserId') || undefined;
    const viewerId = searchParams.get('viewerId') || '';
    if (q.trim().length < 2) {
      return NextResponse.json({ artists: [] });
    }
    let artists = await searchPublicArtists(q, { excludeUserId, limit: 12 });
    if (viewerId) {
      await verifyCheckoutUser(req, viewerId);
      const db = await getDb();
      const refs = artists.flatMap((artist) => {
        const friendshipId = [viewerId, artist.userId].sort().join('_');
        return [
          db.doc(`users/${viewerId}/blocks/${artist.userId}`),
          db.doc(`users/${artist.userId}/blocks/${viewerId}`),
          db.doc(`users/${viewerId}/following/${artist.userId}`),
          db.doc(`friendships/${friendshipId}`),
        ];
      });
      const snapshots = refs.length ? await db.getAll(...refs) : [];
      artists = artists
        .flatMap((artist, index) => {
          const offset = index * 4;
          if (snapshots[offset]?.exists || snapshots[offset + 1]?.exists) return [];
          const following = snapshots[offset + 2]?.exists === true;
          const friendship = snapshots[offset + 3];
          const friend = friendship?.exists && friendship.data()?.status === 'accepted';
          return [{ ...artist, mentionPriority: friend ? 2 : following ? 1 : 0 }];
        })
        .sort((a, b) => b.mentionPriority - a.mentionPriority);
    }
    return NextResponse.json({ artists });
  } catch (err) {
    if (err instanceof CheckoutAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[profile/search]', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
