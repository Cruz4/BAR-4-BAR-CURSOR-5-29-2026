import type { User } from '@/lib/types';

export const FREE_ALBUM_LIMIT = 1;
export const FREE_TRACK_LIMIT = 2;
export const SIGNUP_INK = 200;
/** Optional permanent Ink at signup (0 = residency-only welcome grant). */
export const SIGNUP_PERMANENT_INK = 0;
export const FREE_MONTHLY_RESIDENCY_INK = 111;

/**
 * Max free residency pool (signup + stacked monthly grants).
 * Residency Ink does not expire; monthly drip pauses at cap until the artist spends down.
 */
export const FREE_RESIDENCY_POOL_CAP = 500;

export function isProUser(user: Pick<User, 'subscriptionStatus'> | null | undefined): boolean {
  return user?.subscriptionStatus === 'active';
}

/** Paid Pro (including Stripe trialing mapped to active). */
export function isProOrTrial(
  user: Pick<User, 'subscriptionStatus'> | null | undefined
): boolean {
  return isProUser(user);
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
  variant: 'default' as const,
  title: 'Demo track slots full',
  description: `You've used your ${FREE_TRACK_LIMIT} free track slots. Your lyrics are safe — view anytime. Go Pro for unlimited slots, export, and custom vault saves.`,
};

export const FREE_ALBUM_LIMIT_TOAST = {
  variant: 'default' as const,
  title: 'Demo album slot full',
  description: `Free artists get ${FREE_ALBUM_LIMIT} concept album. Your work is saved — view anytime. Go Pro for unlimited projects, export, and custom vault saves.`,
};
