/**
 * Artist Home vanity slugs — /profile/{slug}
 * Prefer clean name links; spaces become `_`; only suffix on collision.
 */

export const RESERVED_PROFILE_SLUGS = new Set([
  'admin',
  'api',
  'login',
  'signup',
  'sign-up',
  'sign_up',
  'signin',
  'sign-in',
  'sign_in',
  'pricing',
  'usage',
  'profile',
  'profiles',
  'customize',
  'leaderboard',
  'friends',
  'feed',
  'discover',
  'activity',
  'lock',
  'try',
  'welcome',
  'settings',
  'vault',
  'scene',
  'share',
  'shares',
  'ink',
  'pro',
  'terms',
  'privacy',
  'cookies',
  'support',
  'help',
  'about',
  'neomaiya',
  'neomaiya-sol',
  'neomaiya_sol',
  'jordie',
  'jordie-cruz',
  'jordie_cruz',
  'bar4bar',
  'bar-4-bar',
  'bar_4_bar',
  'null',
  'undefined',
]);

/** Canonical Neo vanity link — reserved for plotformaiplan@. */
export const NEOMAIYA_CANONICAL_SLUG = 'neomaiya_sol';

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
 * Candidate Firestore doc ids to try when resolving a /profile/{slug} hit.
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

/** Artist Home path helper — prefer underscore vanity in outbound links. */
export function profileHref(slug?: string | null, hash?: string): string | undefined {
  const raw = (slug || '').trim();
  if (!raw) return undefined;
  // Never ship hyphen / uid-tail leftovers in friend chips or Scene links.
  let s = raw;
  if (needsVanitySlugUpgrade(raw)) {
    s = stripLegacyUidSuffix(normalizeProfileSlugInput(raw));
  }
  if (!s) return undefined;
  const base = `/profile/${s}`;
  if (!hash) return base;
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  return `${base}${h}`;
}
