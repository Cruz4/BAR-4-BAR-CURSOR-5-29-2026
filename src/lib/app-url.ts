/**
 * Canonical public site URL. Custom domain: bar4bar.ink (Firebase Hosting).
 * Set NEXT_PUBLIC_APP_URL in .env before deploy; falls back to DEFAULT_PUBLIC_APP_URL.
 */
export const DEFAULT_PUBLIC_APP_URL = 'https://bar4bar.ink';

/** Legacy Firebase Hosting URL — keep in TRUSTED_APP_ORIGINS until redirects are permanent. */
export const LEGACY_FIREBASE_HOSTING_URL = 'https://lyricai-studio-otgxn.web.app';

export function getPublicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (raw || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, '');
}
