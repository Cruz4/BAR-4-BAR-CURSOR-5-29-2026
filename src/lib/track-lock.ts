import type { Track } from '@/lib/types';

export function isTrackLocked(track: Pick<Track, 'status'> | null | undefined): boolean {
  return track?.status === 'complete';
}

/** Only reopening (status → in_progress) is allowed while a track is locked. */
export function isLockedTrackReopenUpdate(updates: Partial<Track>): boolean {
  const keys = Object.keys(updates) as (keyof Track)[];
  return keys.length === 1 && updates.status === 'in_progress';
}

export const TRACK_COMPLETE_TOAST = {
  title: "That's a hit!!",
  description:
    'Track locked — lyrics and Co-Writer are read-only. Reopen from Track Status when you want to edit again.',
} as const;

export const TRACK_LOCKED_TOAST = {
  title: "That's a hit!!",
  description:
    'Track locked — edits are off until you reopen. Export, Performance Mode, and DNA Drop still work.',
} as const;

export const TRACK_LOCKED_BANNER =
  "That's a hit!! Track locked — lyrics and Co-Writer are read-only. Reopen Track in the left panel to edit again.";
