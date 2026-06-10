import type { User } from '@/lib/types';
import { isTrialActive } from '@/lib/trial';

export const FREE_ALBUM_LIMIT = 1;
export const FREE_TRACK_LIMIT = 4;
export const SIGNUP_INK = 300;
/** Optional permanent Ink at signup (0 = residency-only welcome grant). */
export const SIGNUP_PERMANENT_INK = 0;
export const FREE_MONTHLY_RESIDENCY_INK = 111;

/** Max free residency pool (signup + stacked monthly grants). */
export const FREE_RESIDENCY_POOL_CAP = 500;

export function isProUser(user: Pick<User, 'subscriptionStatus'> | null | undefined): boolean {
  return user?.subscriptionStatus === 'active';
}

/** Paid Pro or active signup trial — gates workflow features only. */
export function isProOrTrial(
  user: Pick<User, 'subscriptionStatus' | 'trialStartedAt'> | null | undefined
): boolean {
  return isProUser(user) || isTrialActive(user);
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
  user: Pick<User, 'subscriptionStatus' | 'trialStartedAt'> | null | undefined
): boolean {
  if (isProOrTrial(user)) return true;
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
    `Free artists get ${FREE_TRACK_LIMIT} tracks total — any track in an album or Loose Tracks counts. Upgrade for unlimited slots.`,
};
