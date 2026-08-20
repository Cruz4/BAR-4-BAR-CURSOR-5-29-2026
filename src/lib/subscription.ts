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
export const PRO_FEATURE_PREVIEW_HOURS = PRO_FEATURE_PREVIEW_DAYS * 24;

export function computeProFeaturePreviewExpiresAt(
  days = PRO_FEATURE_PREVIEW_DAYS,
  from = new Date()
): string {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function getProFeaturePreviewMsRemaining(
  user: Pick<User, 'proFeaturePreviewExpiresAt'> | null | undefined,
  now = Date.now()
): number | null {
  if (!user?.proFeaturePreviewExpiresAt) return null;
  return new Date(user.proFeaturePreviewExpiresAt).getTime() - now;
}

/** Live countdown label — `1d 12h 04m` or `3h 12m 08s`. `ended` when the window is over. */
export function formatProFeaturePreviewCountdown(
  user: Pick<User, 'proFeaturePreviewExpiresAt'> | null | undefined,
  now = Date.now()
): string | null {
  const ms = getProFeaturePreviewMsRemaining(user, now);
  if (ms === null) return null;
  if (ms <= 0) return 'ended';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/** Referrer Ink granted after referee spends this much Ink on AI actions. */
export const REFERRAL_INK_SPEND_THRESHOLD = 50;

export function isProUser(user: Pick<User, 'subscriptionStatus'> | null | undefined): boolean {
  return user?.subscriptionStatus === 'active';
}

export function isProFeaturePreviewActive(
  user: Pick<User, 'proFeaturePreviewExpiresAt'> | null | undefined,
  now = Date.now()
): boolean {
  if (!user?.proFeaturePreviewExpiresAt) return false;
  return new Date(user.proFeaturePreviewExpiresAt).getTime() > now;
}

export function getProFeaturePreviewHoursRemaining(
  user: Pick<User, 'proFeaturePreviewExpiresAt'> | null | undefined,
  now = Date.now()
): number | null {
  const ms = getProFeaturePreviewMsRemaining(user, now);
  if (ms === null) return null;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (60 * 60 * 1000));
}

/**
 * Preview window has ended (timestamp in the past) and the artist is not paid Pro.
 * Used for the one-time end-of-preview announcement.
 */
export function hasProFeaturePreviewEnded(
  user: Pick<User, 'subscriptionStatus' | 'proFeaturePreviewExpiresAt'> | null | undefined
): boolean {
  if (!user?.proFeaturePreviewExpiresAt || isProUser(user)) return false;
  return new Date(user.proFeaturePreviewExpiresAt).getTime() <= Date.now();
}

/** Paid Pro or active Pro feature preview — workflow unlocks (export, vault saves, etc.). */
export function isProOrTrial(
  user: Pick<User, 'subscriptionStatus' | 'proFeaturePreviewExpiresAt'> | null | undefined
): boolean {
  return isProUser(user) || isProFeaturePreviewActive(user);
}

/**
 * Unlimited albums & tracks — paid Studio Pro only.
 * The 48h Pro feature preview keeps Visitor catalog caps (1 album / 2 tracks).
 */
export function hasUnlimitedCatalog(
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

export function countUserAlbums(albums: { id: string }[]): number {
  return albums.filter((a) => a.id !== 'unassigned').length;
}

/** Free / preview: max tracks across all albums + loose tracks combined. */
export function canUserAddTrack(
  albums: { tracks?: unknown[] }[],
  user: Pick<User, 'subscriptionStatus' | 'proFeaturePreviewExpiresAt'> | null | undefined
): boolean {
  if (hasUnlimitedCatalog(user)) return true;
  return countUserTracks(albums as { id: string; tracks: unknown[] }[]) < FREE_TRACK_LIMIT;
}

/** Free / preview: max concept albums. */
export function canUserAddAlbum(
  albums: { id: string }[],
  user: Pick<User, 'subscriptionStatus'> | null | undefined
): boolean {
  if (hasUnlimitedCatalog(user)) return true;
  return countUserAlbums(albums) < FREE_ALBUM_LIMIT;
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
  description: `You've used your ${FREE_TRACK_LIMIT} free track slots. Your lyrics stay saved — view anytime. Go Pro for unlimited editing, export, and full co-writer workflow.`,
};

export const FREE_ALBUM_LIMIT_TOAST = {
  variant: 'default' as const,
  title: 'Demo album slot full',
  description: `Free artists get ${FREE_ALBUM_LIMIT} concept album. Your work is saved — view anytime. Go Pro for unlimited projects, export, and custom vault saves.`,
};
