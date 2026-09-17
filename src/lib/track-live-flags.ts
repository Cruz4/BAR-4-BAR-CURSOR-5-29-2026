import type { Track, Album } from '@/lib/types';
import { hasActiveDnaDrop } from '@/lib/dna-drop';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { hasLiveDnaDrop, releaseStatusOf } from '@/lib/release-management';

export function hasLiveCollabSheet(track: Pick<Track, 'collabSheetId'>): boolean {
  return Boolean(track.collabSheetId);
}

/** Live music release. Its public release is independent from the optional DNA lyric page. */
export function hasLiveFirstDrop(
  track: Pick<Track, 'dropAudio' | 'dropRightsAttestedAt' | 'shareId' | 'releaseShareId' | 'releaseStatus' | 'houseRelease' | 'dropPrice'>
): boolean {
  return Boolean(normalizeDropAudio(track.dropAudio) && releaseStatusOf(track) === 'live');
}

export type TrackReleaseControlState = 'new' | 'attached' | 'offline' | 'live' | 'album-live';

/** The state shown on a track sheet before the release dialog is opened. */
export function trackReleaseControlState(
  track: Pick<Track, 'dropAudio' | 'dropRightsAttestedAt' | 'shareId' | 'releaseShareId' | 'releaseStatus' | 'houseRelease' | 'dropPrice'>,
  album: Pick<Album, 'id' | 'tracks' | 'shareId' | 'releaseShareId' | 'releaseStatus' | 'houseRelease' | 'dropPrice'>,
): TrackReleaseControlState {
  const hasAudio = Boolean(normalizeDropAudio(track.dropAudio));
  const trackStatus = releaseStatusOf(track);

  if (hasAudio && trackStatus === 'live') return 'live';

  const albumIsLive = album.id !== 'unassigned'
    && releaseStatusOf({ ...album, tracks: album.tracks }) === 'live';
  if (hasAudio && albumIsLive) return 'album-live';
  if (trackStatus === 'unlisted') return 'offline';
  if (hasAudio) return 'attached';
  return 'new';
}

export function trackHasLiveFlags(track: Track): boolean {
  return (
    hasActiveDnaDrop(track.shareId) ||
    hasLiveCollabSheet(track) ||
    hasLiveFirstDrop(track)
  );
}

export type LooseTrackFilter = 'all' | 'live' | 'dna' | 'first-drop' | 'collab' | 'complete';

export const vaultLiveFilterLabels: Record<LooseTrackFilter, string> = {
  all: 'All',
  live: 'Anything live',
  dna: 'Lyrics DNA Drop',
  'first-drop': 'Release',
  collab: 'Collab',
  complete: 'Complete',
};

export function matchesLooseTrackFilter(track: Track, filter: LooseTrackFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') return trackHasLiveFlags(track);
  if (filter === 'dna') return hasLiveDnaDrop(track);
  if (filter === 'first-drop') return hasLiveFirstDrop(track);
  if (filter === 'collab') return hasLiveCollabSheet(track);
  if (filter === 'complete') return track.status === 'complete';
  return true;
}

export function looseTrackSearchHaystack(track: Track): string {
  return [
    track.title,
    track.vibe?.genre,
    track.vibe?.feeling?.join(' '),
    track.specialInstructions,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export type LooseTrackSort = 'newest' | 'oldest' | 'alphabetical';

export function sortLooseTracks(tracks: Track[], sortBy: LooseTrackSort): Track[] {
  const sorted = [...tracks];
  if (sortBy === 'alphabetical') {
    sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
  } else if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return sorted;
}

export function albumHasLiveFlags(album: Album): boolean {
  if (hasActiveDnaDrop(album.shareId)) return true;
  return album.tracks?.some((track) => trackHasLiveFlags(track)) ?? false;
}

export function matchesAlbumFilter(album: Album, filter: LooseTrackFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') return albumHasLiveFlags(album);
  if (filter === 'dna') return Boolean(getAlbumLiveDnaShareId(album));
  if (filter === 'first-drop') return Boolean(getAlbumFirstDropTrack(album));
  if (filter === 'collab') return Boolean(getAlbumCollabTrack(album));
  if (filter === 'complete') return albumHasCompleteTrack(album);
  return true;
}

/** Album or any track Lyrics DNA Drop share that is currently live. */
export function getAlbumLiveDnaShareId(album: Pick<Album, 'shareId' | 'tracks'>): string | undefined {
  if (hasActiveDnaDrop(album.shareId)) return album.shareId;
  return album.tracks?.find((track) => hasActiveDnaDrop(track.shareId))?.shareId;
}

export function getAlbumCollabTrack(album: Pick<Album, 'tracks'>): Track | undefined {
  return album.tracks?.find((track) => hasLiveCollabSheet(track));
}

export function getAlbumFirstDropTrack(album: Pick<Album, 'tracks'>): Track | undefined {
  return album.tracks?.find((track) => hasLiveFirstDrop(track));
}

export function albumHasCompleteTrack(album: Pick<Album, 'tracks'>): boolean {
  return album.tracks?.some((track) => track.status === 'complete') ?? false;
}
