import { getPublicAppUrl } from '@/lib/app-url';
import { buildLoginUrl } from '@/lib/login-links';

export type SocialMarketingRef = 'tiktok' | 'ig' | 'instagram' | 'yt' | 'youtube' | 'reddit' | 'bio' | 'spark';

/**
 * Captures ?ref= from campaign links for signup analytics + admin metrics.
 * Social refs in ALLOWED_REFS skip the landing page (straight to signup).
 * Other tags (e.g. ny) still track — use `/?ref=tag` for landing-first QR flows.
 */

const STORAGE_KEY = 'b4b_signup_attribution';

/** NYC foot traffic / barcode scans — landing page first; tracked in admin as ?ref=ny */
export const NY_FOOT_TRAFFIC_REF = 'ny';

const ALLOWED_REFS = new Set([
  'tiktok',
  'ig',
  'instagram',
  'yt',
  'youtube',
  'reddit',
  'bio',
  'spark',
]);

export function normalizeMarketingRef(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const ref = raw.trim().toLowerCase().slice(0, 32);
  return ALLOWED_REFS.has(ref) ? ref : ref.replace(/[^a-z0-9_-]/g, '').slice(0, 24) || null;
}

/** Call once on app load — persists first-touch ref for the tab session. */
export function captureMarketingRefFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeMarketingRef(params.get('ref'));
    if (ref) {
      sessionStorage.setItem(STORAGE_KEY, ref);
      return ref;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? normalizeMarketingRef(stored) : null;
  } catch {
    return null;
  }
}

export function getStoredMarketingRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? normalizeMarketingRef(stored) : null;
  } catch {
    return null;
  }
}

/** Social / ad link — opens signup tab directly (TikTok Promote, bio links, etc.). */
export function marketingLink(ref: SocialMarketingRef): string {
  const base = getPublicAppUrl().replace(/\/$/, '');
  const path = buildLoginUrl({ mode: 'signup', marketingRef: ref });
  return `${base}${path}`;
}

/** Landing-first campaign link (QR, print) — full marketing page, ref still attributed. */
export function marketingLandingLink(ref: string): string {
  const base = getPublicAppUrl().replace(/\/$/, '');
  const tag = normalizeMarketingRef(ref);
  return tag ? `${base}/?ref=${encodeURIComponent(tag)}` : base;
}

/** True when URL has a known social/ad ?ref= tag. */
export function isSocialMarketingRef(raw: string | null | undefined): boolean {
  const ref = normalizeMarketingRef(raw);
  return ref !== null && ALLOWED_REFS.has(ref);
}

const REF_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  ig: 'Instagram',
  instagram: 'Instagram',
  yt: 'YouTube',
  youtube: 'YouTube',
  reddit: 'Reddit',
  bio: 'Bio link',
  spark: 'Spark',
  ny: 'New York (QR / foot traffic)',
  organic: 'Organic / direct',
};

/** Human label for admin metrics and campaign links. */
export function marketingRefLabel(ref: string): string {
  const key = ref.trim().toLowerCase();
  return REF_LABELS[key] || ref;
}
