/**
 * Artist Home vanity slugs — bar4bar.ink/{slug}
 * Prefer clean name links; spaces become `_`; only suffix on collision.
 * /profile/{slug} 308s to /{slug}. App routes stay reserved.
 */

/** First URL segment of real app pages — never treat as an artist slug. */
export const APP_ROOT_SEGMENTS = new Set([
  'admin',
  'api',
  '_next',
  '__',
  'login',
  'signup',
  'signin',
  'pricing',
  'usage',
  'profile',
  'profiles',
  'p',
  'customize',
  'leaderboard',
  'charts',
  'friends',
  'feed',
  'discover',
  'insights',
  'supporters',
  'activity',
  'lock',
  'try',
  'welcome',
  'settings',
  'vault',
  'scene',
  'share',
  'shares',
  'song',
  'ink',
  'pro',
  'terms',
  'privacy',
  'cookies',
  'support',
  'help',
  'about',
  'albums',
  'earnings',
  'folds',
  'library',
  'maintenance',
  'marketing',
  'studio-progress',
  'msgs',
  'messages',
  'sitemap',
  'robots',
  'manifest',
  'icon',
  'favicon',
  'apple-icon',
  'opengraph-image',
  'twitter-image',
  'neomaiya',
  'jordie',
  'bar4bar',
  'null',
  'undefined',
]);

export const RESERVED_PROFILE_SLUGS = new Set([
  ...APP_ROOT_SEGMENTS,
  'sign-up',
  'sign_up',
  'sign-in',
  'sign_in',
  'neomaiya-sol',
  'neomaiya_sol',
  'jordie-cruz',
  'jordie_cruz',
  'bar-4-bar',
  'bar_4_bar',
  'studio_progress',
]);

/** Canonical Neo vanity link — reserved for plotformaiplan@. */
export const NEOMAIYA_CANONICAL_SLUG = 'neomaiya_sol';

const LEGACY_PROFILE_APP_REDIRECTS: Readonly<Record<string, string>> = {
  insights: '/insights',
  supporters: '/supporters',
};

/** Keep old /profile/{app-page} links from falling through to the public-profile API. */
export function legacyProfileAppRedirect(slug: string | null | undefined): string | undefined {
  const clean = (slug || '').trim().toLowerCase();
  return LEGACY_PROFILE_APP_REDIRECTS[clean];
}

const SLUG_BODY_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function normalizeProfileSlugInput(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
}

export function slugBaseFromDisplayName(name: string): string {
  return normalizeProfileSlugInput(name) || 'artist';
}

export function isValidProfileSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 32) return false;
  if (!SLUG_BODY_RE.test(slug)) return false;
  if (RESERVED_PROFILE_SLUGS.has(slug)) return false;
  return true;
}

/** True for legacy auto slugs like `mike_hills_a1b2c3` or `mike-hills-a1b2c3` (uid prefix). */
export function looksLikeLegacyUidSlug(slug: string, _uid?: string): boolean {
  const s = (slug || '').trim().toLowerCase();
  // Trailing 6-char fragment was the old Firebase uid prefix — treat as legacy
  // even when the current uid no longer matches (accounts recreated / renamed).
  return /^[a-z0-9]+(?:[_-][a-z0-9]+)*[_-][a-z0-9]{6}$/.test(s);
}

/** Drop a trailing 6-char legacy uid fragment after underscore normalize. */
export function stripLegacyUidSuffix(slug: string): string {
  const s = normalizeProfileSlugInput(slug);
  const stripped = s.replace(/_[a-z0-9]{6}$/i, '');
  return stripped.length >= 2 ? stripped : s;
}

export function profileSlugError(slug: string, opts?: { allowReserved?: string[] }): string | null {
  const s = normalizeProfileSlugInput(slug);
  if (s.length < 2) return 'Link must be at least 2 characters.';
  if (s.length > 32) return 'Link must be 32 characters or less.';
  if (!SLUG_BODY_RE.test(s)) {
    return 'Use lowercase letters, numbers, and underscores only.';
  }
  const allow = new Set((opts?.allowReserved || []).map((x) => x.toLowerCase()));
  if (RESERVED_PROFILE_SLUGS.has(s) && !allow.has(s)) return 'That link is reserved.';
  return null;
}

/** True when a stored slug still uses hyphens (pre-underscore vanity format). */
export function slugUsesHyphens(slug: string): boolean {
  return (slug || '').includes('-');
}

/** Needs clean underscore vanity (hyphen separators and/or random uid tail). */
export function needsVanitySlugUpgrade(slug: string, uid?: string): boolean {
  const s = (slug || '').trim();
  if (!s) return false;
  if (slugUsesHyphens(s)) return true;
  if (looksLikeLegacyUidSlug(s, uid)) return true;
  return false;
}

/**
 * Candidate Firestore doc ids to try when resolving a /{slug} (or legacy /profile/{slug}) hit.
 * Keeps old hyphen bookmarks working after underscore migration.
 */
export function profileSlugLookupCandidates(raw: string): string[] {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const underscored = normalizeProfileSlugInput(trimmed);
  const hyphenated = underscored.replace(/_/g, '-');
  const stripped = looksLikeLegacyUidSlug(trimmed) ? stripLegacyUidSuffix(underscored) : '';
  const strippedHyphen = stripped ? stripped.replace(/_/g, '-') : '';
  const out: string[] = [];
  for (const c of [trimmed, lower, underscored, hyphenated, stripped, strippedHyphen]) {
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * Peel a Next.js `[slug]` param that accidentally swallowed `#post-…`
 * (hash encoded into the path as `%23`).
 */
export function sanitizeProfileSlugParam(raw: string): { slug: string; hash?: string } {
  let s = (raw || '').trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  const hashIdx = s.indexOf('#');
  if (hashIdx >= 0) {
    const slug = s.slice(0, hashIdx).split('?')[0];
    const hash = s.slice(hashIdx + 1).trim();
    return hash ? { slug, hash } : { slug };
  }
  const q = s.indexOf('?');
  return { slug: q >= 0 ? s.slice(0, q) : s };
}

/** Artist Home path — bar4bar.ink/{slug}. */
export function profileHref(slug?: string | null, hash?: string): string | undefined {
  const raw = (slug || '').trim();
  if (!raw) return undefined;
  // Never ship hyphen / uid-tail leftovers in friend chips or Scene links.
  let s = raw;
  if (needsVanitySlugUpgrade(raw)) {
    s = stripLegacyUidSuffix(normalizeProfileSlugInput(raw));
  }
  if (!s) return undefined;
  const base = `/${s}`;
  if (!hash) return base;
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  return `${base}${h}`;
}

export function profileFriendsHref(slug?: string | null): string | undefined {
  const base = profileHref(slug);
  return base ? `${base}/friends` : undefined;
}

export function profileReverbsHref(slug?: string | null): string | undefined {
  const base = profileHref(slug);
  return base ? `${base}/reverbs` : undefined;
}

export function profileImagesHref(slug?: string | null): string | undefined {
  const base = profileHref(slug);
  return base ? `${base}/images` : undefined;
}

export function profileSongsHref(slug?: string | null): string | undefined {
  const base = profileHref(slug);
  return base ? `${base}/songs` : undefined;
}

export function isAppRootSegment(segment: string | null | undefined): boolean {
  const s = (segment || '').trim().toLowerCase();
  return Boolean(s) && APP_ROOT_SEGMENTS.has(s);
}

/** Public Artist Home (vanity /{slug} or legacy /profile/{slug}), not Edit Public Page. */
export function isPublicArtistHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0];
  if (path === '/profile/customize' || path.startsWith('/profile/customize/')) return false;
  if (path.startsWith('/profile/')) return path.length > '/profile/'.length;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  if (isAppRootSegment(parts[0])) return false;
  if (parts.length === 1) return true;
  return (
    parts.length === 2 &&
    (parts[1] === 'friends' ||
      parts[1] === 'reverbs' ||
      parts[1] === 'images' ||
      parts[1] === 'songs')
  );
}

/** Pull the artist slug out of /{slug} or /profile/{slug} links (Activity, OG, etc.). */
export function slugFromProfileHref(href: string | null | undefined): string | undefined {
  const raw = (href || '').trim();
  if (!raw) return undefined;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      path = new URL(raw).pathname;
    } catch {
      return undefined;
    }
  }
  path = path.split('#')[0].split('?')[0];
  const m = path.match(/^\/profile\/([^/]+)/) || path.match(/^\/([^/]+)/);
  if (!m) return undefined;
  let slug = m[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep */
  }
  if (!slug || isAppRootSegment(slug) || slug === 'profile') return undefined;
  return slug;
}
