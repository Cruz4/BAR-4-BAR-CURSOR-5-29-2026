import type { User } from '@/lib/types';

const MARKETING_LIGHT_EXACT = new Set([
  '/',
  '/login',
  '/welcome',
  '/pricing',
  '/terms',
  '/privacy',
  '/cookies',
]);

/**
 * Routes that need vault, usage, inbox, and related studio providers.
 * Marketing-light paths keep only auth + gamification until the user enters the studio.
 */
export function needsStudioProviders(
  pathname: string | null | undefined,
  user: User | null | undefined
): boolean {
  if (!pathname) return Boolean(user);
  if (user) return true;

  const path = pathname.split('?')[0];
  if (MARKETING_LIGHT_EXACT.has(path)) return false;
  if (path === '/discover' || path.startsWith('/discover/')) return false;

  return true;
}
