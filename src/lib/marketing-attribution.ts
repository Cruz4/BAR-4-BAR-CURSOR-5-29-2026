import { getPublicAppUrl } from '@/lib/app-url';

/** Captures ?ref= from ad links (tiktok, ig, yt) for signup analytics. */

const STORAGE_KEY = 'b4b_signup_attribution';

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

export function marketingLink(path = '', ref: 'tiktok' | 'ig' | 'yt' | 'youtube' | 'reddit'): string {
  const base = getPublicAppUrl();
  const p = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${base}${p}?ref=${ref}`;
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
  organic: 'Organic / direct',
};

/** Human label for admin metrics and campaign links. */
export function marketingRefLabel(ref: string): string {
  const key = ref.trim().toLowerCase();
  return REF_LABELS[key] || ref;
}
