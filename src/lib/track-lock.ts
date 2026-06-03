import type { Track } from '@/lib/types';

export function isTrackLocked(track: Pick<Track, 'status'> | null | undefined): boolean {
  return track?.status === 'complete';
}

/** Only reopening (status → in_progress) is allowed while a track is locked. */
export function isLockedTrackReopenUpdate(updates: Partial<Track>): boolean {
  const keys = Object.keys(updates) as (keyof Track)[];
  return keys.length === 1 && updates.status === 'in_progress';
}

export const TRACK_LOCKED_TOAST = {
  title: 'Track locked',
  description: 'This track is marked complete. Reopen it from Track Status to edit.',
} as const;
