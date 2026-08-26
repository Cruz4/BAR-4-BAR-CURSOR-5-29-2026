import { format } from 'date-fns';
import type { DropLibraryEntry } from '@/lib/drop-commerce';

export const DROP_CRATE_NAME_MAX = 48;
export const DROP_CRATE_MAX_ITEMS = 80;
export const DROP_CRATE_MAX_COUNT = 40;
export const DECK_PLAYED_STORAGE_KEY = 'b4b-deck-played';

export type DropLibraryTrack = {
  id: string;
  title: string;
  durationSec?: number;
};

export type DropLibraryItem = DropLibraryEntry & {
  artistName?: string;
  coverArtUrl?: string;
  durationSec?: number;
  tracks?: DropLibraryTrack[];
  /** Artist's own pressed song (not a purchase). */
  own?: boolean;
  albumId?: string;
};

export type DeckSort = 'fresh' | 'az' | 'artist' | 'paid' | 'played';
export type DeckGroup = 'none' | 'kind' | 'artist' | 'access' | 'month';
export type DeckViewMode = 'list' | 'browse';

export type DeckPlayable = {
  key: string;
  shareId: string;
  trackId?: string;
  title: string;
  artistName: string;
  coverArtUrl?: string;
  durationSec?: number;
  scope: 'album' | 'track';
  albumTitle?: string;
  albumId?: string;
  purchasedAt: string;
  amountCents: number;
  free?: boolean;
  houseRelease?: boolean;
  houseLibraryNotice?: boolean;
  houseLibraryNoticeAt?: string;
  ownerId: string;
  own?: boolean;
};

export type DeckGroupBucket = {
  id: string;
  label: string;
  items: DeckPlayable[];
};

export type DeckBrowseAlbum = {
  id: string;
  label: string;
  items: DeckPlayable[];
};

export type DeckBrowseArtist = {
  id: string;
  label: string;
  albums: DeckBrowseAlbum[];
  trackCount: number;
};

export type DropCrate = {
  id: string;
  name: string;
  shareIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type DeckPlayedMap = Record<string, number>;

export function formatDeckTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Fuchsia–cyan studio hue from a drop id — vinyl-label color, not stock album art. */
export function deckHue(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 168 + (h >>> 0) % 172;
}

export function flattenLibraryItems(items: DropLibraryItem[]): DeckPlayable[] {
  const out: DeckPlayable[] = [];
  for (const item of items) {
    const artistName = item.artistName?.trim() || 'Unknown artist';
    const albumTracks =
      item.scope === 'album' && Array.isArray(item.tracks) && item.tracks.length > 0
        ? item.tracks
        : null;
    if (albumTracks) {
      for (const track of albumTracks) {
        out.push({
          key: `${item.shareId}:${track.id}`,
          shareId: item.shareId,
          trackId: track.id,
          title: track.title,
          artistName,
          coverArtUrl: item.coverArtUrl,
          durationSec: track.durationSec ?? item.durationSec,
          scope: 'album',
          albumTitle: item.title,
          albumId: item.projectId,
          purchasedAt: item.purchasedAt,
          amountCents: item.amountCents,
          free: item.free,
          houseRelease: item.houseRelease,
          houseLibraryNotice: item.houseLibraryNotice,
          houseLibraryNoticeAt: item.houseLibraryNoticeAt,
          ownerId: item.ownerId,
          own: item.own,
        });
      }
      continue;
    }
    out.push({
      key: item.shareId,
      shareId: item.shareId,
      trackId: item.trackIds?.[0],
      title: item.title,
      artistName,
      coverArtUrl: item.coverArtUrl,
      durationSec: item.durationSec,
      scope: item.scope,
      albumId: item.albumId,
      purchasedAt: item.purchasedAt,
      amountCents: item.amountCents,
      free: item.free,
      houseRelease: item.houseRelease,
      houseLibraryNotice: item.houseLibraryNotice,
      houseLibraryNoticeAt: item.houseLibraryNoticeAt,
      ownerId: item.ownerId,
      own: item.own,
    });
  }
  return out;
}

export function searchPlayables(items: DeckPlayable[], query: string): DeckPlayable[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const hay = [item.title, item.artistName, item.albumTitle, item.shareId]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function cmpText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

export function sortPlayables(
  items: DeckPlayable[],
  sort: DeckSort,
  played: DeckPlayedMap
): DeckPlayable[] {
  const next = [...items];
  next.sort((a, b) => {
    if (sort === 'az') return cmpText(a.title, b.title) || cmpText(a.artistName, b.artistName);
    if (sort === 'artist') return cmpText(a.artistName, b.artistName) || cmpText(a.title, b.title);
    if (sort === 'paid') {
      const aPaid = a.free ? 0 : 1;
      const bPaid = b.free ? 0 : 1;
      return bPaid - aPaid || b.amountCents - a.amountCents || cmpText(a.title, b.title);
    }
    if (sort === 'played') {
      return (played[b.key] || 0) - (played[a.key] || 0) || (b.purchasedAt || '').localeCompare(a.purchasedAt || '');
    }
    return (b.purchasedAt || '').localeCompare(a.purchasedAt || '');
  });
  return next;
}

export function groupPlayables(items: DeckPlayable[], group: DeckGroup): DeckGroupBucket[] {
  if (group === 'none') {
    return [{ id: 'all', label: 'On the platter', items }];
  }

  const buckets = new Map<string, DeckGroupBucket>();
  const order: string[] = [];

  const ensure = (id: string, label: string) => {
    let bucket = buckets.get(id);
    if (!bucket) {
      bucket = { id, label, items: [] };
      buckets.set(id, bucket);
      order.push(id);
    }
    return bucket;
  };

  for (const item of items) {
    if (group === 'kind') {
      if (item.own) {
        ensure('yours', 'Your songs').items.push(item);
      } else {
        const id = item.scope === 'album' ? 'album' : 'track';
        ensure(id, id === 'album' ? 'Pressings' : 'Singles').items.push(item);
      }
    } else if (group === 'artist') {
      const id = item.artistName.toLowerCase() || 'unknown';
      ensure(id, item.artistName || 'Unknown artist').items.push(item);
    } else if (group === 'access') {
      if (item.own) {
        ensure('yours', 'Your songs').items.push(item);
      } else {
        const id = item.free ? 'free' : 'paid';
        ensure(id, item.free ? 'Unlocked free' : 'Bought').items.push(item);
      }
    } else {
      const d = item.purchasedAt ? new Date(item.purchasedAt) : null;
      const valid = d && !Number.isNaN(d.getTime());
      const id = valid ? format(d, 'yyyy-MM') : 'undated';
      const label = valid ? format(d, 'MMMM yyyy') : 'Undated';
      ensure(id, label).items.push(item);
    }
  }

  if (group === 'kind') {
    return ['yours', 'album', 'track'].flatMap((id) => (buckets.get(id) ? [buckets.get(id)!] : []));
  }
  if (group === 'access') {
    return ['yours', 'paid', 'free'].flatMap((id) => (buckets.get(id) ? [buckets.get(id)!] : []));
  }
  if (group === 'month') {
    return [...order].sort((a, b) => b.localeCompare(a)).map((id) => buckets.get(id)!);
  }
  return order.map((id) => buckets.get(id)!);
}

/**
 * Hierarchical browser data for Library:
 * artist -> album/singles bucket -> tracks.
 * Respects caller order of `items` so search/sort still drives results.
 */
export function buildBrowseArtists(items: DeckPlayable[]): DeckBrowseArtist[] {
  const artists = new Map<string, DeckBrowseArtist>();
  const albumSeenByArtist = new Map<string, Set<string>>();

  for (const item of items) {
    const artistId = (item.artistName || 'Unknown artist').trim().toLowerCase() || 'unknown-artist';
    const artistLabel = item.artistName || 'Unknown artist';
    let artist = artists.get(artistId);
    if (!artist) {
      artist = { id: artistId, label: artistLabel, albums: [], trackCount: 0 };
      artists.set(artistId, artist);
      albumSeenByArtist.set(artistId, new Set<string>());
    }

    const albumKey = item.albumId
      ? `album:${item.albumId}`
      : item.albumTitle
        ? `album-title:${item.albumTitle.toLowerCase()}`
        : item.scope === 'album'
          ? `pressing:${item.shareId}`
          : `single:${item.shareId}`;
    const albumLabel = item.albumTitle || (item.scope === 'album' ? 'Untitled pressing' : 'Singles');
    const seenAlbums = albumSeenByArtist.get(artistId)!;

    if (!seenAlbums.has(albumKey)) {
      artist.albums.push({ id: albumKey, label: albumLabel, items: [] });
      seenAlbums.add(albumKey);
    }
    const album = artist.albums.find((a) => a.id === albumKey);
    if (!album) continue;
    album.items.push(item);
    artist.trackCount += 1;
  }

  return [...artists.values()];
}

export function readPlayedMap(): DeckPlayedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DECK_PLAYED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DeckPlayedMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writePlayedMap(map: DeckPlayedMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DECK_PLAYED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function markPlayed(map: DeckPlayedMap, key: string): DeckPlayedMap {
  const next = { ...map, [key]: Date.now() };
  writePlayedMap(next);
  return next;
}

export function shufflePlayables(items: DeckPlayable[], currentKey?: string): DeckPlayable[] {
  const rest = items.filter((item) => item.key !== currentKey);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const current = currentKey ? items.find((item) => item.key === currentKey) : undefined;
  return current ? [current, ...rest] : rest;
}
