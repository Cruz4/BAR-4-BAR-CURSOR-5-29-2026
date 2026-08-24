import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { listRecentOpenLocks } from '@/lib/server/lock';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';
import {
  listLeaderboardRisers,
  listRecentPublicPosts,
  listRecentPublicProfiles,
  listRecentShareSummaries,
} from '@/lib/server/gamification';
import { getArtistHomeConfig } from '@/lib/server/artist-home';
import {
  buildDiscoveryMatch,
  hasCreationSignals,
  hasTasteSignals,
} from '@/lib/discovery-graph';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = await (await getAuth()).verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * Scene home Discover stream — recent public activity across the site.
 * All sources are already public-read; this route only aggregates light summaries.
 * `?view=all` returns a deeper slice for the full Discover page.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerUserId = await optionalUid(req);
    const excludeUserId = viewerUserId || searchParams.get('excludeUserId') || undefined;
    const viewAll = searchParams.get('view') === 'all';

    const viewerIdentity = viewerUserId
      ? (await getArtistHomeConfig(viewerUserId)).featured.soundIdentity
      : undefined;

    const [artists, posts, drops, risers, locks] = await Promise.all([
      listRecentPublicProfiles({
        // Home: Scene strip (40/page, up to 80). All: /discover (40/page, up to 120).
        limit: viewAll ? 40 : 32,
        excludeUserId,
      }),
      listRecentPublicPosts({
        limit: viewAll ? 48 : 40,
        excludeOwnerId: excludeUserId,
      }),
      listRecentShareSummaries({
        limit: viewAll ? 28 : 24,
        excludeOwnerId: excludeUserId,
      }),
      listLeaderboardRisers({ limit: 5, excludeUserId }),
      (await isLockFeatureEnabled())
        ? listRecentOpenLocks(viewAll ? 18 : 14).catch(() => [])
        : Promise.resolve([]),
    ]);

    const lockCards = (locks || []).map((l) => ({
      id: l.id,
      ownerId: l.ownerId,
      ownerName: l.ownerName,
      ownerSlug: l.ownerSlug,
      seedBar: l.seedBar,
      echoCount: l.echoCount,
      updatedAt: l.updatedAt,
      isHouse: l.isHouse,
    }));

    const matchedArtists = artists.map((artist) => ({
      ...artist,
      tasteMatch: buildDiscoveryMatch(viewerIdentity, artist.soundIdentity, 'taste'),
      creationMatch: buildDiscoveryMatch(viewerIdentity, artist.soundIdentity, 'creation'),
    }));
    const matchedDrops = drops.map((drop) => ({
      ...drop,
      tasteMatch: buildDiscoveryMatch(viewerIdentity, drop.soundIdentity, 'taste'),
      creationMatch: buildDiscoveryMatch(viewerIdentity, drop.soundIdentity, 'creation'),
    }));
    const response = NextResponse.json({
      artists: matchedArtists,
      posts,
      drops: matchedDrops,
      risers,
      locks: lockCards,
      viewerGraph: {
        personalized: Boolean(viewerIdentity),
        hasTaste: hasTasteSignals(viewerIdentity),
        hasCreation: hasCreationSignals(viewerIdentity),
      },
    });
    response.headers.set(
      'Cache-Control',
      viewerUserId ? 'private, no-store' : 'public, max-age=60, s-maxage=120'
    );
    response.headers.set('Vary', 'Authorization');
    return response;
  } catch (err) {
    console.error('[discover]', err);
    return NextResponse.json({ error: 'Discover failed' }, { status: 500 });
  }
}
