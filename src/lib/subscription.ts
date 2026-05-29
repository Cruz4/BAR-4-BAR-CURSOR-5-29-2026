import type { User } from '@/lib/types';

export const FREE_ALBUM_LIMIT = 1;
export const FREE_TRACK_LIMIT = 2;
export const SIGNUP_INK = 300;
export const FREE_MONTHLY_RESIDENCY_INK = 150;

export function isProUser(user: Pick<User, 'subscriptionStatus'> | null | undefined): boolean {
  return user?.subscriptionStatus === 'active';
}

export function isYearlyPro(user: Pick<User, 'subscriptionStatus' | 'subscriptionTier'> | null | undefined): boolean {
  return isProUser(user) && user?.subscriptionTier === 'yearly';
}

export function countUserTracks(albums: { id: string; tracks: unknown[] }[]): number {
  return albums.reduce((acc, a) => acc + (a.tracks?.length || 0), 0);
}
