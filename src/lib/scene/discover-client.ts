/**
 * Scene home Discover stream client — fetches site-wide public activity
 * (recently live Artist Homes, public wall posts, live DNA Drops, leaderboard
 * risers) so the home feed is never empty.
 */

import type { EmbedProvider } from '@/lib/profile/embeds';
import type { ProfilePost } from '@/lib/profile/social-client';
import { enrichPostsWithLiveSlugs } from '@/lib/profile/social-client';

export type DiscoverArtist = {
  userId: string;
  slug: string;
  displayName: string;
  avatarUrl?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  studioBadge?: 'pro' | 'free';
  rankId?: string;
  xp?: number;
  updatedAt: string;
};

export type DiscoverDrop = {
  shareId: string;
  type: 'album' | 'track';
  title: string;
  ownerName: string;
  ownerSlug?: string;
  avatarUrl?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  studioBadge?: 'pro' | 'free';
  updatedAt: string;
  hasDropAudio?: boolean;
  dropPriceSummary?: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  firstBuyerName?: string;
};

export type DiscoverRiser = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  avatarUrl?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  studioBadge?: 'pro' | 'free';
  barsWritten7d: number;
  currentStreak: number;
};

export type DiscoverLock = {
  id: string;
  ownerId?: string;
  ownerName: string;
  ownerSlug?: string;
  seedBar: string;
  echoCount: number;
  updatedAt: string;
  isHouse?: boolean;
};

export type DiscoverData = {
  artists: DiscoverArtist[];
  posts: ProfilePost[];
  drops: DiscoverDrop[];
  risers: DiscoverRiser[];
  locks: DiscoverLock[];
};

export type DiscoverCard =
  | { kind: 'artist'; key: string; artist: DiscoverArtist }
  | { kind: 'post'; key: string; post: ProfilePost }
  | { kind: 'drop'; key: string; drop: DiscoverDrop }
  | { kind: 'lock'; key: string; lock: DiscoverLock }
  | { kind: 'risers'; key: string; risers: DiscoverRiser[] };

/** Max Discover cards kept in the Scene home pool (paged at DISCOVER_PAGE_SIZE). */
export const DISCOVER_HOME_MAX_CARDS = 80;
/** Max cards on the full Discover page (paged at DISCOVER_PAGE_SIZE). */
export const DISCOVER_ALL_MAX_CARDS = 120;

const EMPTY: DiscoverData = { artists: [], posts: [], drops: [], risers: [], locks: [] };

export async function fetchDiscover(
  excludeUserId?: string,
  opts?: { view?: 'home' | 'all'; enrichSlugs?: boolean }
): Promise<DiscoverData> {
  try {
    const params = new URLSearchParams();
    if (excludeUserId) params.set('excludeUserId', excludeUserId);
    if (opts?.view === 'all') params.set('view', 'all');
    const qs = params.toString();
    const res = await fetch(`/api/discover${qs ? `?${qs}` : ''}`);
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as Partial<DiscoverData>;
    const rawPosts = Array.isArray(data.posts)
      ? data.posts.map((p) => ({
          ...p,
          embedProvider: p.embedProvider as EmbedProvider | undefined,
        }))
      : [];
    const posts =
      opts?.enrichSlugs === false
        ? (rawPosts as ProfilePost[])
        : await enrichPostsWithLiveSlugs(rawPosts as ProfilePost[]);
    return {
      artists: Array.isArray(data.artists) ? data.artists : [],
      posts,
      drops: Array.isArray(data.drops) ? data.drops : [],
      risers: Array.isArray(data.risers) ? data.risers : [],
      locks: Array.isArray((data as { locks?: DiscoverLock[] }).locks)
        ? ((data as { locks: DiscoverLock[] }).locks)
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function cardTimestamp(card: DiscoverCard): string {
  if (card.kind === 'post') return card.post.createdAt || '';
  if (card.kind === 'artist') return card.artist.updatedAt || '';
  if (card.kind === 'drop') return card.drop.updatedAt || '';
  if (card.kind === 'lock') return card.lock.updatedAt || '';
  return '';
}

/** Public for soft “new” badges on minimized Discover. */
export function discoverCardTimestamp(card: DiscoverCard): string {
  return cardTimestamp(card);
}

/**
 * Turn grouped Discover data into a newest-first card list.
 * Excludes ids already present in the friends feed and blocked/hidden users.
 * Rising-this-week is pinned near the top (not time-sorted).
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
  const maxCards = opts.maxCards ?? DISCOVER_HOME_MAX_CARDS;

  const artists = data.artists.filter((a) => !excludeUserIds.has(a.userId));
  const posts = data.posts.filter(
    (p) => !excludePostIds.has(p.id) && !excludeUserIds.has(p.ownerId)
  );
  const drops = data.drops;
  const saleDrops = drops.filter((d) => d.hasDropAudio && d.type === 'track');
  const otherDrops = drops.filter((d) => !(d.hasDropAudio && d.type === 'track'));
  const locks = (data.locks || []).filter(
    (l) => !l.isHouse && l.ownerId !== 'system' && l.id !== 'house'
  );
  const risers = data.risers.filter((r) => !excludeUserIds.has(r.userId));

  const timed: DiscoverCard[] = [
    ...posts.map(
      (post): DiscoverCard => ({ kind: 'post', key: `post-${post.id}`, post })
    ),
    ...artists.map(
      (artist): DiscoverCard => ({
        kind: 'artist',
        key: `artist-${artist.slug}`,
        artist,
      })
    ),
    ...otherDrops.map(
      (drop): DiscoverCard => ({
        kind: 'drop',
        key: `drop-${drop.shareId}`,
        drop,
      })
    ),
    ...locks.map(
      (lock): DiscoverCard => ({
        kind: 'lock',
        key: `lock-${lock.id}`,
        lock,
      })
    ),
  ];

  timed.sort((a, b) => cardTimestamp(b).localeCompare(cardTimestamp(a)));

  const saleCards: DiscoverCard[] = saleDrops.map((drop) => ({
    kind: 'drop',
    key: `drop-${drop.shareId}`,
    drop,
  }));

  const cards = timed.slice(0, Math.max(0, maxCards - (risers.length > 0 ? 1 : 0) - saleCards.length));

  // Pin Rising this week near the top without breaking relative chrono of the rest.
  if (risers.length > 0) {
    cards.splice(Math.min(1, cards.length), 0, {
      kind: 'risers',
      key: 'risers-week',
      risers,
    });
  }

  return [...saleCards, ...cards].slice(0, maxCards);
}
