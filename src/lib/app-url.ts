/**
 * Canonical public site URL. Custom domain: akasheet.com (Firebase Hosting).
 * Set NEXT_PUBLIC_APP_URL in .env before deploy; falls back to DEFAULT_PUBLIC_APP_URL.
 */
import { APP_ORIGIN, APP_WWW_ORIGIN, LEGACY_APP_ORIGIN, LEGACY_APP_WWW_ORIGIN } from '@/lib/brand';

export const DEFAULT_PUBLIC_APP_URL = APP_ORIGIN;
export const LEGACY_PUBLIC_APP_URL = LEGACY_APP_ORIGIN;
export const LEGACY_PUBLIC_WWW_URL = LEGACY_APP_WWW_ORIGIN;
export const PUBLIC_WWW_APP_URL = APP_WWW_ORIGIN;

/** Legacy Firebase Hosting URL — keep in TRUSTED_APP_ORIGINS until redirects are permanent. */
export const LEGACY_FIREBASE_HOSTING_HOST = 'lyricai-studio-otgxn.web.app';
export const LEGACY_FIREBASE_HOSTING_URL = `https://${LEGACY_FIREBASE_HOSTING_HOST}`;

export function getPublicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  // Ignore stale Cloud Run / functions .env still pointing at the legacy domain.
  if (!raw || raw.startsWith(LEGACY_APP_ORIGIN)) {
    return DEFAULT_PUBLIC_APP_URL;
  }
  return raw;
}

/** First hostname from Host / X-Forwarded-Host. Edge-safe. */
export function hostnameFromHostHeader(header: string | null | undefined): string {
  return (header || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

/**
 * Send people from the default Firebase Hosting host to akasheet.com.
 * Never touch firebaseapp.com (Google auth), /__/ reserved paths, or /api
 * (Stripe webhooks and cron may still hit the old host).
 */
export function shouldCanonicalizeLegacyFirebaseHost(
  hostHeader: string | null | undefined,
  pathname: string
): boolean {
  if (hostnameFromHostHeader(hostHeader) !== LEGACY_FIREBASE_HOSTING_HOST) return false;
  if (pathname === '/__' || pathname.startsWith('/__/')) return false;
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;
  return true;
}

export function canonicalPublicUrl(pathname: string, search = ''): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${APP_ORIGIN}${path}${search}`;
}
