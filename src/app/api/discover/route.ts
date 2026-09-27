import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { listRecentOpenLocks } from '@/lib/server/lock';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';
import { isDiscoverHeatEnabled } from '@/lib/server/discover-heat-feature';
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
    const heatMix = await isDiscoverHeatEnabled();

    const [artists, posts, drops, risers, locks] = await Promise.all([
      listRecentPublicProfiles({
        // Home: Scene strip (40/page, up to 80). All: /discover (40/page, up to 120).
        limit: viewAll ? 40 : 32,
        excludeUserId,
      }),
      listRecentPublicPosts({
        limit: viewAll ? 48 : 40,
        excludeOwnerId: excludeUserId,
        heatMix,
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

    const pressingByOwner = new Map<string, (typeof artists)[number]['pressing']>();
    for (const artist of artists) pressingByOwner.set(artist.userId, artist.pressing);
    for (const post of posts) pressingByOwner.set(post.ownerId, post.pressing);
    for (const drop of drops) {
      if (drop.ownerId) pressingByOwner.set(drop.ownerId, drop.pressing);
    }
    for (const riser of risers) pressingByOwner.set(riser.userId, riser.pressing);

    const missingLockOwners = [...new Set(
      (locks || [])
        .map((lock) => lock.ownerId)
        .filter((ownerId): ownerId is string => Boolean(ownerId && !pressingByOwner.has(ownerId)))
    )];
    await Promise.all(
      missingLockOwners.map(async (ownerId) => {
        const config = await getArtistHomeConfig(ownerId).catch(() => null);
        if (config) pressingByOwner.set(ownerId, config.theme);
      })
    );

    const lockCards = (locks || []).map((l) => ({
      id: l.id,
      ownerId: l.ownerId,
      ownerName: l.ownerName,
      ownerSlug: l.ownerSlug,
      seedBar: l.seedBar,
      echoCount: l.echoCount,
      updatedAt: l.updatedAt,
      isHouse: l.isHouse,
      pressing: l.ownerId ? pressingByOwner.get(l.ownerId) : undefined,
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
    const matchedPosts = posts.map(({ soundIdentity, ...post }) =>
      heatMix
        ? {
            ...post,
            tasteMatch: buildDiscoveryMatch(viewerIdentity, soundIdentity, 'taste'),
            creationMatch: buildDiscoveryMatch(viewerIdentity, soundIdentity, 'creation'),
          }
        : post
    );
    const response = NextResponse.json({
      artists: matchedArtists,
      posts: matchedPosts,
      heatMix,
      drops: matchedDrops,
      risers,
      locks: lockCards,
      viewerGraph: {
        personalized: Boolean(viewerIdentity),
        hasTaste: hasTasteSignals(viewerIdentity),
        hasCreation: hasCreationSignals(viewerIdentity),
      },
      publicPulse: {
        profiles: artists.length,
        posts: posts.length,
        pressedSongs: drops.filter((drop) => drop.type === 'track' && drop.hasDropAudio).length,
      },
    });
    // Visibility changes must take effect immediately; never serve a cached
    // offline DNA snapshot back into the public Scene.
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Authorization');
    return response;
  } catch (err) {
    console.error('[discover]', err);
    return NextResponse.json({ error: 'Discover failed' }, { status: 500 });
  }
}
