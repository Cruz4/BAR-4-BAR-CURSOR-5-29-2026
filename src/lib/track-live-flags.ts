import type { Track } from '@/lib/types';
import { hasActiveDnaDrop } from '@/lib/dna-drop';
import { normalizeDropAudio } from '@/lib/drop-commerce';

export function hasLiveCollabSheet(track: Pick<Track, 'collabSheetId'>): boolean {
  return Boolean(track.collabSheetId);
}

/** Pressed First Drop — live DNA share with audio attested for sale. */
export function hasLiveFirstDrop(
  track: Pick<Track, 'dropAudio' | 'dropRightsAttestedAt' | 'shareId'>
): boolean {
  return (
    hasActiveDnaDrop(track.shareId) &&
    Boolean(normalizeDropAudio(track.dropAudio) && track.dropRightsAttestedAt)
  );
}

export function trackHasLiveFlags(track: Track): boolean {
  return (
    hasActiveDnaDrop(track.shareId) ||
    hasLiveCollabSheet(track) ||
    hasLiveFirstDrop(track)
  );
}

export type LooseTrackFilter = 'all' | 'live' | 'dna' | 'first-drop' | 'collab' | 'complete';

export function matchesLooseTrackFilter(track: Track, filter: LooseTrackFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') return trackHasLiveFlags(track);
  if (filter === 'dna') return hasActiveDnaDrop(track.shareId);
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
