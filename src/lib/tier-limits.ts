import type { Album, Track, User } from '@/lib/types';
import {
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  isProOrTrial,
} from '@/lib/subscription';

type AlbumLike = { id: string; createdAt?: string; tracks?: Track[] };
type UserLike = Pick<User, 'subscriptionStatus'> | null | undefined;

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
  variant: 'default' as const,
  title: 'View-only on free demo',
  description: `Your work is saved. Free demo allows ${FREE_ALBUM_LIMIT} album and ${FREE_TRACK_LIMIT} editable tracks — view anytime here. Upgrade to edit, export, and unlock the full catalog workflow.`,
};

export const TIER_LIMIT_TRACK_BANNER = `Free demo: ${FREE_TRACK_LIMIT} tracks editable. This one's view-only — upgrade to edit or export.`;

export const TIER_LIMIT_ALBUM_BANNER = `Free demo: ${FREE_ALBUM_LIMIT} album editable. This one's view-only — upgrade to edit or export.`;

export const EXPORT_PRO_TOAST = {
  variant: 'default' as const,
  title: 'Export is a Pro feature',
  description: 'PDF, TXT, and vault JSON export unlock with Studio Pro — your lyrics stay saved in the demo catalog until you upgrade.',
};

export const IMPORT_PRO_TOAST = {
  variant: 'default' as const,
  title: 'Vault import is Pro',
  description: 'Merge JSON blueprints across devices with Studio Pro. Your current demo work stays safe in the cloud.',
};

/** Vault PDF/TXT/JSON export and full-studio import — Pro catalog workflow. */
export function canExportVault(user: UserLike): boolean {
  return isProOrTrial(user);
}
