import { profileHref, slugFromProfileHref } from '@/lib/profile/profile-slug';
import type { ActivityEvent } from '@/lib/activity/types';
import { activityPostHash } from '@/lib/activity/post-deep-link';

/**
 * Rewrite a stored Artist Home path through live vanity rules.
 * Old activity docs still point at /profile/{hyphen-uid} slugs that 404 after
 * the underscore + root-vanity cutover.
 */
export function rewriteActivityProfileHref(href: string): string | undefined {
  const slug = slugFromProfileHref(href);
  if (!slug) return undefined;
  const hashIdx = href.indexOf('#');
  const hash = hashIdx >= 0 ? href.slice(hashIdx + 1) : undefined;
  return profileHref(slug, hash || undefined);
}

/** Artist Home + wall hash for a specific post (not the Scene `/p/` route). */
export function artistHomePostHref(slug: string | undefined | null, postId: string): string | undefined {
  const id = postId.trim();
  if (!id) return undefined;
  const base = profileHref(slug);
  if (!base) return undefined;
  return `${base}?p=${encodeURIComponent(id)}#${activityPostHash(id)}`;
}

/** Canonical public post URL for sharing, crawlers, and Scene permalinks. */
export function publicScenePostHref(postId: string): string {
  return `/p/${encodeURIComponent(postId.trim())}`;
}

/** Append `?from=` for smart back on public post pages. */
export function appendActivityFromHref(href: string, from?: string | null): string {
  const fromPath = from?.trim();
  if (!fromPath) return href;
  try {
    const url = new URL(href, 'https://akasheet.local');
    if (!url.pathname.startsWith('/p/')) return href;
    url.searchParams.set('from', fromPath);
    const query = url.searchParams.toString();
    return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
  } catch {
    return href;
  }
}

export function currentActivityFromPath(): string {
  if (typeof window === 'undefined') return '/activity';
  return `${window.location.pathname}${window.location.search}`;
}

/** Next.js Link-safe href so `#post-…` never gets folded into the `[slug]` param. */
export function activityOpenLinkHref(
  href: string
): string | { pathname: string; query?: Record<string, string>; hash?: string } {
  try {
    const url = new URL(href, 'https://akasheet.local');
    if (!url.hash && !url.search) return href;
    const query = Object.fromEntries(url.searchParams.entries());
    const hash = url.hash.replace(/^#/, '');
    if (!url.pathname.startsWith('/')) return href;
    return {
      pathname: url.pathname,
      ...(Object.keys(query).length ? { query } : {}),
      ...(hash ? { hash } : {}),
    };
  } catch {
    const i = href.indexOf('#');
    if (i <= 0) return href;
    const pathname = href.slice(0, i);
    const hash = href.slice(i + 1);
    if (!pathname.startsWith('/') || !hash) return href;
    return { pathname, hash };
  }
}

function publicPostHref(postId: string, hash: string): string {
  const target = hash || activityPostHash(postId);
  return `/p/${encodeURIComponent(postId)}${target ? `#${target}` : ''}`;
}

async function isLivePublicProfileSlug(slug: string): Promise<boolean> {
  const s = slug.trim();
  if (!s) return false;
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(s)}`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function postHashForEvent(event: ActivityEvent): string {
  return activityPostHash(event.postId || '', {
    commentId: event.commentId,
    comments: event.type === 'post_reply',
  });
}

export function activityOpenHref(event: ActivityEvent, _viewerSlug?: string): string {
  if (event.lockId) return `/lock/${event.lockId}`;
  if (event.href?.startsWith('/lock/')) return event.href;
  if (event.href?.startsWith('/song/')) return event.href;
  if (event.shareId) return `/share/${event.shareId}`;

  if (event.postId) {
    const hash = postHashForEvent(event);
    return publicPostHref(event.postId, hash);
  }

  if (event.href) {
    return rewriteActivityProfileHref(event.href) || event.href;
  }
  if (event.type === 'friend_accepted' && event.actorSlug) {
    return profileHref(event.actorSlug) || '/friends';
  }
  if (event.type === 'door_knock') {
    return event.href || '/activity';
  }
  if (event.type === 'friend_request' || event.type === 'contact_request') return '/activity?tab=requests';
  if (event.type === 'fold_pass') return event.href || '/msgs';
  if (event.type === 'contact_accepted' && event.actorSlug) {
    return profileHref(event.actorSlug) || '/activity';
  }
  return '/activity';
}

/**
 * Open target for an activity row. Post and comment events use their canonical
 * public post route; profile-only events still honor live vanity rules.
 */
export async function resolveActivityOpenHref(
  event: ActivityEvent,
  opts?: { viewerUserId?: string; viewerSlug?: string }
): Promise<string> {
  if (event.lockId) return `/lock/${event.lockId}`;
  if (event.href?.startsWith('/lock/')) return event.href;
  if (event.href?.startsWith('/song/')) return event.href;
  if (event.shareId) return `/share/${event.shareId}`;

  if (event.postId) {
    const hash = postHashForEvent(event);
    return publicPostHref(event.postId, hash);
  }

  if ((event.type === 'friend_accepted' || event.type === 'contact_accepted') && event.actorId) {
    try {
      const { fetchLivePublicProfileByUserId } = await import('@/lib/profile/social-client');
      const live = await fetchLivePublicProfileByUserId(event.actorId);
      if (live?.slug && (await isLivePublicProfileSlug(live.slug))) {
        return profileHref(live.slug) || (event.type === 'contact_accepted' ? '/activity' : '/friends');
      }
    } catch {
      /* fall through */
    }
    if (event.actorSlug && (await isLivePublicProfileSlug(event.actorSlug))) {
      return profileHref(event.actorSlug) || (event.type === 'contact_accepted' ? '/activity' : '/friends');
    }
    return event.type === 'contact_accepted' ? '/activity' : '/friends';
  }

  return activityOpenHref(event, opts?.viewerSlug);
}

/** Hash links need a full assign so `#post-…` survives Next.js routing. */
export function navigateActivityHref(
  push: (href: string) => void,
  href: string,
  opts?: { from?: string | null }
) {
  const target = appendActivityFromHref(href, opts?.from ?? currentActivityFromPath());
  if (typeof window === 'undefined') {
    push(target);
    return;
  }
  if (target.includes('#')) {
    try {
      const next = new URL(target, window.location.origin);
      if (next.pathname === window.location.pathname) {
        if (window.location.hash === next.hash) {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } else {
          window.location.hash = next.hash;
        }
        return;
      }
    } catch {
      /* fall through */
    }
    window.location.assign(target);
    return;
  }
  push(target);
}
