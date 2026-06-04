import type { User } from '@/lib/types';

export const FREE_ALBUM_LIMIT = 1;
export const FREE_TRACK_LIMIT = 3;
export const SIGNUP_INK = 300;
export const FREE_MONTHLY_RESIDENCY_INK = 200;

/** Max residency pool for Visitor progress UI (signup gift + one monthly grant can stack). */
export const FREE_RESIDENCY_POOL_CAP = SIGNUP_INK + FREE_MONTHLY_RESIDENCY_INK;

export function isProUser(user: Pick<User, 'subscriptionStatus'> | null | undefined): boolean {
  return user?.subscriptionStatus === 'active';
}

export function isYearlyPro(user: Pick<User, 'subscriptionStatus' | 'subscriptionTier'> | null | undefined): boolean {
  return isProUser(user) && user?.subscriptionTier === 'yearly';
}

export function countUserTracks(albums: { id: string; tracks: unknown[] }[]): number {
  return albums.reduce((acc, a) => acc + (a.tracks?.length || 0), 0);
}

/** Free tier: max tracks across all albums + loose tracks combined. */
export function canUserAddTrack(
  albums: { tracks?: unknown[] }[],
  user: Pick<User, 'subscriptionStatus'> | null | undefined
): boolean {
  if (isProUser(user)) return true;
  return countUserTracks(albums as { id: string; tracks: unknown[] }[]) < FREE_TRACK_LIMIT;
}

export class FreeTrackLimitError extends Error {
  constructor() {
    super('FREE_TRACK_LIMIT');
    this.name = 'FreeTrackLimitError';
  }
}

export const FREE_TRACK_LIMIT_TOAST = {
  variant: 'destructive' as const,
  title: 'Track Slots Full',
  description:
    'Free artists get 3 tracks total — any track in an album or Loose Tracks counts. Upgrade for unlimited slots.',
};
