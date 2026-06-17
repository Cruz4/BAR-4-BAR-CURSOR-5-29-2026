import type { Album, Track, User } from '@/lib/types';
import {
  countUserTracks,
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  isProOrTrial,
} from '@/lib/subscription';

type AlbumLike = { id: string; createdAt?: string; tracks?: Track[] };

export type TierUserLike =
  | Pick<
      User,
      | 'subscriptionStatus'
      | 'proFeaturePreviewExpiresAt'
      | 'freeEditableTrackIds'
      | 'freeEditableSelectionAt'
    >
  | null
  | undefined;

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

function sanitizePinnedIds(pinned: string[] | undefined, allTrackIds: string[]): string[] {
  if (!pinned?.length) return [];
  const valid = new Set(allTrackIds);
  return pinned.filter((id) => valid.has(id)).slice(0, FREE_TRACK_LIMIT);
}

function oldestTrackIdsNotIn(albums: AlbumLike[], exclude: Set<string>, limit: number): string[] {
  const sorted = [...getAllVaultTracks(albums)].sort(byCreatedAtAsc);
  const result: string[] = [];
  for (const track of sorted) {
    if (exclude.has(track.id)) continue;
    result.push(track.id);
    if (result.length >= limit) break;
  }
  return result;
}

export function isDowngradedProVault(user: TierUserLike, albums: AlbumLike[]): boolean {
  if (isProOrTrial(user)) return false;
  return countUserTracks(albums as { id: string; tracks: unknown[] }[]) > FREE_TRACK_LIMIT;
}

export function needsFreeEditableTrackPicker(user: TierUserLike, albums: AlbumLike[]): boolean {
  if (isProOrTrial(user)) return false;
  if (countUserTracks(albums as { id: string; tracks: unknown[] }[]) <= FREE_TRACK_LIMIT) {
    return false;
  }
  return !user?.freeEditableSelectionAt;
}

function resolveFreeEditableTrackIds(albums: AlbumLike[], user: TierUserLike): string[] {
  const all = getAllVaultTracks(albums);
  if (all.length <= FREE_TRACK_LIMIT) {
    return all.map((t) => t.id);
  }

  if (!user?.freeEditableSelectionAt) {
    return [];
  }

  const allIds = all.map((t) => t.id);
  let pinned = sanitizePinnedIds(user.freeEditableTrackIds, allIds);
  if (pinned.length < FREE_TRACK_LIMIT) {
    const pinnedSet = new Set(pinned);
    pinned = [
      ...pinned,
      ...oldestTrackIdsNotIn(albums, pinnedSet, FREE_TRACK_LIMIT - pinned.length),
    ];
  }
  return pinned.slice(0, FREE_TRACK_LIMIT);
}

export function computeRotatedFreeEditableTrackIds(
  user: TierUserLike,
  albumsAfterDelete: AlbumLike[],
  deletedTrackId: string
): string[] | null {
  if (isProOrTrial(user)) return null;
  if (!user?.freeEditableSelectionAt) return null;

  const remaining = getAllVaultTracks(albumsAfterDelete);
  if (remaining.length <= FREE_TRACK_LIMIT) return null;

  let pins = sanitizePinnedIds(user.freeEditableTrackIds, remaining.map((t) => t.id)).filter(
    (id) => id !== deletedTrackId
  );
  const pinSet = new Set(pins);
  if (pins.length < FREE_TRACK_LIMIT) {
    pins = [
      ...pins,
      ...oldestTrackIdsNotIn(albumsAfterDelete, pinSet, FREE_TRACK_LIMIT - pins.length),
    ];
  }
  return pins.slice(0, FREE_TRACK_LIMIT);
}

export function getEditableTrackIds(albums: AlbumLike[], user: TierUserLike): Set<string> {
  if (isProOrTrial(user)) {
    return new Set(getAllVaultTracks(albums).map((t) => t.id));
  }
  return new Set(resolveFreeEditableTrackIds(albums, user));
}

export function getEditableAlbumIds(albums: AlbumLike[], user: TierUserLike): Set<string> {
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
  user: TierUserLike
): boolean {
  if (isProOrTrial(user)) return true;
  if (albumId !== 'unassigned' && !getEditableAlbumIds(albums, user).has(albumId)) {
    return false;
  }
  return getEditableTrackIds(albums, user).has(trackId);
}

export function isAlbumEditableByTier(albumId: string, albums: AlbumLike[], user: TierUserLike): boolean {
  if (isProOrTrial(user)) return true;
  if (albumId === 'unassigned') return true;
  return getEditableAlbumIds(albums, user).has(albumId);
}

export function isTrackOverTierLimit(
  trackId: string,
  albumId: string,
  albums: AlbumLike[],
  user: TierUserLike
): boolean {
  return !isTrackEditableByTier(trackId, albumId, albums, user);
}

export function isAlbumOverTierLimit(albumId: string, albums: AlbumLike[], user: TierUserLike): boolean {
  if (albumId === 'unassigned') return false;
  return !isAlbumEditableByTier(albumId, albums, user);
}

export const TIER_LIMIT_LOCKED_TOAST = {
  variant: 'default' as const,
  title: 'View-only on Visitor',
  description: `Your lyrics are saved. Visitor edits ${FREE_TRACK_LIMIT} tracks at a time — view this anytime. Go Pro for unlimited editing, export, and full co-writer workflow.`,
};

export const TIER_LIMIT_TRACK_BANNER = `Visitor demo: ${FREE_TRACK_LIMIT} tracks editable at a time. This one's view-only — go Pro for unlimited editing and export.`;

export const TIER_LIMIT_ALBUM_BANNER = `Visitor demo: ${FREE_ALBUM_LIMIT} album editable. This one's view-only — go Pro to edit and export.`;

export const EXPORT_PRO_TOAST = {
  variant: 'default' as const,
  title: 'Export is a Pro feature',
  description:
    'PDF, TXT, and vault JSON export unlock with Studio Pro — your lyrics stay saved on Visitor anytime.',
};

export const IMPORT_PRO_TOAST = {
  variant: 'default' as const,
  title: 'Vault import is Pro',
  description: 'Merge JSON blueprints across devices with Studio Pro. Your current work stays safe in the cloud.',
};

/** Vault PDF/TXT/JSON export and full-studio import — Pro workflow. */
export function canExportVault(user: TierUserLike): boolean {
  return isProOrTrial(user);
}

export { FREE_TRACK_LIMIT };
