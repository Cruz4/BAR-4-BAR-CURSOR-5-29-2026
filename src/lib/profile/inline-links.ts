/**
 * Detect pasted links in posts and comments — including scheme-less
 * akasheet.com/{slug} (and legacy bar4bar.ink/{slug}) plus in-app /p /song /share paths.
 */

import { DEFAULT_PUBLIC_APP_URL, LEGACY_FIREBASE_HOSTING_URL, LEGACY_PUBLIC_APP_URL } from '@/lib/app-url';
import { APP_WWW_ORIGIN, LEGACY_APP_WWW_ORIGIN } from '@/lib/brand';
import { APP_ROOT_SEGMENTS, isPublicArtistHomePath, slugFromProfileHref } from '@/lib/profile/profile-slug';

const TRAILING_PUNCT_RE = /[),.;:!?…'"”’]+$/;

const LINK_RE =
  /https?:\/\/[^\s<>[\]{}"'`]+|www\.[^\s<>[\]{}"'`]+|(?:akasheet\.com|bar4bar\.(?:ink|app)|lyricai-studio-otgxn\.web\.app|localhost(?::\d+)?)(?:\/[^\s<>[\]{}"'`]*)?|\/(?:p|song|share|profile)\/[^\s<>[\]{}"'`]+/gi;

const MENTION_RE = /@([a-z0-9_][a-z0-9_-]{1,47})/gi;

const STATIC_APP_HOSTS = new Set(
  [
    DEFAULT_PUBLIC_APP_URL,
    APP_WWW_ORIGIN,
    LEGACY_PUBLIC_APP_URL,
    LEGACY_APP_WWW_ORIGIN,
    LEGACY_FIREBASE_HOSTING_URL,
    'https://bar4bar.app',
    'https://www.bar4bar.app',
  ]
    .map(hostnameOf)
    .filter((host): host is string => Boolean(host))
);

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function isAppHost(hostname: string | null | undefined): boolean {
  const host = (hostname || '').replace(/^www\./, '').toLowerCase();
  if (!host) return false;
  if (STATIC_APP_HOSTS.has(host)) return true;
  if (typeof window !== 'undefined') {
    const live = window.location.hostname.replace(/^www\./, '').toLowerCase();
    if (live && live === host) return true;
  }
  return false;
}

function trimTrailingPunct(raw: string): string {
  let next = raw;
  while (TRAILING_PUNCT_RE.test(next) && !next.endsWith('/')) {
    const stripped = next.replace(TRAILING_PUNCT_RE, '');
    if (stripped === next) break;
    next = stripped;
  }
  return next;
}

function precedingOk(text: string, start: number, raw: string): boolean {
  const prev = start > 0 ? text[start - 1] : '';
  if (!prev || /\s/.test(prev) || /[([{'"]/.test(prev)) return true;
  if (raw.startsWith('/')) return !/[\w/]/.test(prev);
  return !/[\w./@-]/.test(prev);
}

/** Turn a pasted token into an absolute or in-app href. */
export function normalizeInlineHref(raw: string | undefined | null): string | undefined {
  const trimmed = trimTrailingPunct((raw || '').trim());
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) {
    return trimmed.startsWith('//') ? undefined : trimmed;
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export type InlineLink = {
  raw: string;
  href: string;
  start: number;
  end: number;
};

export function extractInlineLinks(text: string | undefined | null): InlineLink[] {
  if (!text) return [];
  const out: InlineLink[] = [];
  const re = new RegExp(LINK_RE.source, LINK_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const raw = trimTrailingPunct(match[0]);
    if (!raw) continue;
    if (!precedingOk(text, match.index, raw)) continue;
    const href = normalizeInlineHref(raw);
    if (!href) continue;
    out.push({ raw, href, start: match.index, end: match.index + raw.length });
  }
  return out;
}

export function firstInlineHref(text: string | undefined | null): string | undefined {
  return extractInlineLinks(text)[0]?.href;
}

/** Prefer a stored embed, then the first pasted URL in the body. */
export function previewHrefFromFields(
  embedUrl?: string | null,
  text?: string | null
): string | undefined {
  return normalizeInlineHref(embedUrl || '') || firstInlineHref(text);
}

export type AppLinkTarget =
  | { kind: 'post'; postId: string; href: string }
  | { kind: 'song'; shareId: string; href: string }
  | { kind: 'profile'; slug: string; href: string }
  | { kind: 'internal'; href: string }
  | { kind: 'external'; href: string };

function pathFromHref(href: string): { pathname: string; search: string; hash: string; host: string | null } | null {
  try {
    if (href.startsWith('/')) {
      const url = new URL(href, DEFAULT_PUBLIC_APP_URL);
      return { pathname: url.pathname, search: url.search, hash: url.hash, host: null };
    }
    const url = new URL(href);
    return { pathname: url.pathname, search: url.search, hash: url.hash, host: url.hostname };
  } catch {
    return null;
  }
}

export function toNavigableHref(href: string): { href: string; internal: boolean } {
  const parsed = pathFromHref(href);
  if (!parsed) return { href, internal: href.startsWith('/') };
  const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  if (href.startsWith('/') || isAppHost(parsed.host)) {
    return { href: path, internal: true };
  }
  return { href, internal: false };
}

export function classifyAppHref(raw: string | undefined | null): AppLinkTarget | null {
  const href = normalizeInlineHref(raw);
  if (!href) return null;
  const nav = toNavigableHref(href);
  const parsed = pathFromHref(href);
  if (!parsed) return { kind: 'external', href: nav.href };

  const onApp = href.startsWith('/') || isAppHost(parsed.host);
  if (!onApp) return { kind: 'external', href: nav.href };

  const parts = parsed.pathname.split('/').filter(Boolean);
  const first = parts[0] || '';
  const second = parts[1] || '';

  if (first === 'p' && second) {
    try {
      return { kind: 'post', postId: decodeURIComponent(second), href: nav.href };
    } catch {
      return { kind: 'post', postId: second, href: nav.href };
    }
  }
  if ((first === 'song' || first === 'share') && second) {
    try {
      return { kind: 'song', shareId: decodeURIComponent(second), href: nav.href };
    } catch {
      return { kind: 'song', shareId: second, href: nav.href };
    }
  }
  if (isPublicArtistHomePath(parsed.pathname)) {
    const slug = slugFromProfileHref(parsed.pathname);
    if (slug) return { kind: 'profile', slug, href: nav.href };
  }
  if (first && !APP_ROOT_SEGMENTS.has(first) && parts.length === 1) {
    return { kind: 'profile', slug: first, href: nav.href };
  }
  return { kind: 'internal', href: nav.href };
}

export function songShareIdFromHref(raw: string | undefined | null): string | null {
  const target = classifyAppHref(raw);
  return target?.kind === 'song' ? target.shareId : null;
}

export type RichTextPart =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; slug: string }
  | { kind: 'link'; raw: string; href: string; internal: boolean };

function pushMentionedText(parts: RichTextPart[], chunk: string) {
  if (!chunk) return;
  const re = new RegExp(MENTION_RE.source, MENTION_RE.flags);
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk))) {
    if (match.index > 0 && /[a-zA-Z0-9._]/.test(chunk[match.index - 1] || '')) continue;
    if (match.index > cursor) parts.push({ kind: 'text', value: chunk.slice(cursor, match.index) });
    parts.push({ kind: 'mention', slug: match[1] });
    cursor = match.index + match[0].length;
  }
  if (cursor < chunk.length) parts.push({ kind: 'text', value: chunk.slice(cursor) });
}

export function splitRichText(text: string): RichTextPart[] {
  const links = extractInlineLinks(text);
  if (!links.length) {
    const parts: RichTextPart[] = [];
    pushMentionedText(parts, text);
    return parts.length ? parts : [{ kind: 'text', value: text }];
  }
  const parts: RichTextPart[] = [];
  let cursor = 0;
  for (const link of links) {
    if (link.start < cursor) continue;
    pushMentionedText(parts, text.slice(cursor, link.start));
    const nav = toNavigableHref(link.href);
    parts.push({ kind: 'link', raw: link.raw, href: nav.href, internal: nav.internal });
    cursor = link.end;
  }
  pushMentionedText(parts, text.slice(cursor));
  return parts.length ? parts : [{ kind: 'text', value: text }];
}
