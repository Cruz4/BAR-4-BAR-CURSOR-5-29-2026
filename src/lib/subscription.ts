import type { User } from '@/lib/types';

export const FREE_ALBUM_LIMIT = 1;
export const FREE_TRACK_LIMIT = 2;
export const SIGNUP_INK = 250;
/** Optional permanent Ink at signup (0 = residency-only welcome grant). */
export const SIGNUP_PERMANENT_INK = 0;
export const FREE_MONTHLY_RESIDENCY_INK = 150;

/**
 * Max free residency pool (signup + stacked monthly grants).
 * Residency Ink does not expire; monthly drip pauses at cap until the artist spends down.
 */
export const FREE_RESIDENCY_POOL_CAP = 400;

/** Pro workflow preview duration for new eligible signups (features only — Ink unchanged). */
export const PRO_FEATURE_PREVIEW_DAYS = 2;

/** One-time residency burst when an artist marks their first track complete. */
export const COMPLETION_BURST_INK = 500;

/** Referrer Ink granted after referee spends this much Ink on AI actions. */
export const REFERRAL_INK_SPEND_THRESHOLD = 50;

export function isProUser(user: Pick<User, 'subscriptionStatus'> | null | undefined): boolean {
  return user?.subscriptionStatus === 'active';
}

export function isProFeaturePreviewActive(
  user: Pick<User, 'proFeaturePreviewExpiresAt'> | null | undefined
): boolean {
  if (!user?.proFeaturePreviewExpiresAt) return false;
  return new Date(user.proFeaturePreviewExpiresAt).getTime() > Date.now();
}

export function getProFeaturePreviewHoursRemaining(
  user: Pick<User, 'proFeaturePreviewExpiresAt'> | null | undefined
): number | null {
  if (!user?.proFeaturePreviewExpiresAt) return null;
  const ms = new Date(user.proFeaturePreviewExpiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (60 * 60 * 1000));
}

/** Paid Pro or active Pro feature preview window. */
export function isProOrTrial(
  user: Pick<User, 'subscriptionStatus' | 'proFeaturePreviewExpiresAt'> | null | undefined
): boolean {
  return isProUser(user) || isProFeaturePreviewActive(user);
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
  user: Pick<User, 'subscriptionStatus' | 'proFeaturePreviewExpiresAt'> | null | undefined
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
