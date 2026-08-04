/**
 * Scene home Discover stream client — fetches site-wide public activity
 * (recently live Artist Homes, public wall posts, live DNA Drops, leaderboard
 * risers) so the home feed is never empty.
 */

import type { EmbedProvider } from '@/lib/profile/embeds';
import type { ProfilePost } from '@/lib/profile/social-client';

export type DiscoverArtist = {
  userId: string;
  slug: string;
  displayName: string;
  rankId?: string;
  xp?: number;
  updatedAt: string;
};

export type DiscoverDrop = {
  shareId: string;
  type: 'album' | 'track';
  title: string;
  ownerName: string;
  updatedAt: string;
};

export type DiscoverRiser = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  barsWritten7d: number;
  currentStreak: number;
};

export type DiscoverData = {
  artists: DiscoverArtist[];
  posts: ProfilePost[];
  drops: DiscoverDrop[];
  risers: DiscoverRiser[];
};

export type DiscoverCard =
  | { kind: 'artist'; key: string; artist: DiscoverArtist }
  | { kind: 'post'; key: string; post: ProfilePost }
  | { kind: 'drop'; key: string; drop: DiscoverDrop }
  | { kind: 'risers'; key: string; risers: DiscoverRiser[] };

const EMPTY: DiscoverData = { artists: [], posts: [], drops: [], risers: [] };

export async function fetchDiscover(excludeUserId?: string): Promise<DiscoverData> {
  try {
    const params = excludeUserId
      ? `?excludeUserId=${encodeURIComponent(excludeUserId)}`
      : '';
    const res = await fetch(`/api/discover${params}`);
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as Partial<DiscoverData>;
    return {
      artists: Array.isArray(data.artists) ? data.artists : [],
      posts: Array.isArray(data.posts)
        ? data.posts.map((p) => ({
            ...p,
            embedProvider: p.embedProvider as EmbedProvider | undefined,
          }))
        : [],
      drops: Array.isArray(data.drops) ? data.drops : [],
      risers: Array.isArray(data.risers) ? data.risers : [],
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Turn grouped Discover data into an interleaved card list.
 * Excludes ids already present in the friends feed and blocked/hidden users.
 */
export function buildDiscoverCards(
  data: DiscoverData,
  opts: {
    /** Post ids already shown in the friends stream. */
    excludePostIds?: Set<string>;
    /** Owners the viewer blocked (or who blocked the viewer). */
    excludeUserIds?: Set<string>;
    maxCards?: number;
  } = {}
): DiscoverCard[] {
  const excludePostIds = opts.excludePostIds ?? new Set<string>();
  const excludeUserIds = opts.excludeUserIds ?? new Set<string>();
  const maxCards = opts.maxCards ?? 12;

  const artists = data.artists.filter((a) => !excludeUserIds.has(a.userId));
  const posts = data.posts.filter(
    (p) => !excludePostIds.has(p.id) && !excludeUserIds.has(p.ownerId)
  );
  const drops = data.drops;
  const risers = data.risers.filter((r) => !excludeUserIds.has(r.userId));

  const cards: DiscoverCard[] = [];
  let ai = 0;
  let pi = 0;
  let di = 0;

  // Rotate post → artist → drop so no single source dominates the stream.
  while (cards.length < maxCards && (ai < artists.length || pi < posts.length || di < drops.length)) {
    if (pi < posts.length) {
      const post = posts[pi++];
      cards.push({ kind: 'post', key: `post-${post.id}`, post });
    }
    if (cards.length < maxCards && ai < artists.length) {
      const artist = artists[ai++];
      cards.push({ kind: 'artist', key: `artist-${artist.slug}`, artist });
    }
    if (cards.length < maxCards && di < drops.length) {
      const drop = drops[di++];
      cards.push({ kind: 'drop', key: `drop-${drop.shareId}`, drop });
    }
  }

  // One risers card near the top (position 2) when there's leaderboard motion.
  if (risers.length > 0) {
    cards.splice(Math.min(2, cards.length), 0, {
      kind: 'risers',
      key: 'risers-week',
      risers,
    });
  }

  return cards.slice(0, maxCards);
}
