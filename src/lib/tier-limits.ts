import type { Album, Track, User } from '@/lib/types';
import {
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  isProOrTrial,
} from '@/lib/subscription';

type AlbumLike = { id: string; createdAt?: string; tracks?: Track[] };
type UserLike = Pick<User, 'subscriptionStatus' | 'trialStartedAt'> | null | undefined;

function byCreatedAtAsc<T extends { createdAt?: string }>(a: T, b: T): number {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ta - tb;
}

export function getAllVaultTracks(albums: AlbumLike[]): Track[] {
  const list: Track[] = [];
  for (const album of albums) {
    for (const track of album.tracks || []) {
      list.push(track);
    }
  }
  return list;
}

export function getEditableTrackIds(albums: AlbumLike[], user: UserLike): Set<string> {
  if (isProOrTrial(user)) {
    return new Set(getAllVaultTracks(albums).map((t) => t.id));
  }
  const sorted = [...getAllVaultTracks(albums)].sort(byCreatedAtAsc);
  return new Set(sorted.slice(0, FREE_TRACK_LIMIT).map((t) => t.id));
}

export function getEditableAlbumIds(albums: AlbumLike[], user: UserLike): Set<string> {
  if (isProOrTrial(user)) {
    return new Set(albums.filter((a) => a.id !== 'unassigned').map((a) => a.id));
  }
  const real = albums.filter((a) => a.id !== 'unassigned').sort(byCreatedAtAsc);
  return new Set(real.slice(0, FREE_ALBUM_LIMIT).map((a) => a.id));
}

export function isTrackEditableByTier(
  trackId: string,
  albumId: string,
  albums: AlbumLike[],
  user: UserLike
): boolean {
  if (isProOrTrial(user)) return true;
  if (albumId !== 'unassigned' && !getEditableAlbumIds(albums, user).has(albumId)) {
    return false;
  }
  return getEditableTrackIds(albums, user).has(trackId);
}

export function isAlbumEditableByTier(albumId: string, albums: AlbumLike[], user: UserLike): boolean {
  if (isProOrTrial(user)) return true;
  if (albumId === 'unassigned') return true;
  return getEditableAlbumIds(albums, user).has(albumId);
}

export function isTrackOverTierLimit(
  trackId: string,
  albumId: string,
  albums: AlbumLike[],
  user: UserLike
): boolean {
  return !isTrackEditableByTier(trackId, albumId, albums, user);
}

export function isAlbumOverTierLimit(albumId: string, albums: AlbumLike[], user: UserLike): boolean {
  if (albumId === 'unassigned') return false;
  return !isAlbumEditableByTier(albumId, albums, user);
}

export const TIER_LIMIT_LOCKED_TOAST = {
  variant: 'destructive' as const,
  title: 'View-only on free tier',
  description: `This exceeds free limits (${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks). View and export still work — upgrade to edit.`,
};

export const TIER_LIMIT_TRACK_BANNER =
  'Free tier limit — view & export only on this track. Upgrade Studio Pro to edit again.';

export const TIER_LIMIT_ALBUM_BANNER =
  'Free tier limit — view & export only on this album. Upgrade Studio Pro to edit again.';
