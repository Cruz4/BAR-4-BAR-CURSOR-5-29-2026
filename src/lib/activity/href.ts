import { profileHref } from '@/lib/profile/profile-slug';
import type { ActivityEvent } from '@/lib/activity/types';
import { activityPostHash } from '@/lib/activity/post-deep-link';

/**
 * Rewrite a stored /profile/{slug}[#hash] path through live vanity rules.
 * Old activity docs still point at hyphen + uid-tail slugs (e.g. neomaiya-sol-paQXxm)
 * that 404 after the underscore migration.
 */
export function rewriteActivityProfileHref(href: string): string | undefined {
  const raw = (href || '').trim();
  if (!raw) return undefined;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      path = `${u.pathname}${u.hash}`;
    } catch {
      return undefined;
    }
  }
  const m = path.match(/^\/profile\/([^/?#]+)(?:\?[^#]*)?(?:#(.*))?$/);
  if (!m) return undefined;
  let slug = m[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep */
  }
  return profileHref(slug, m[2] || undefined);
}

/** Next.js Link-safe href so `#post-…` never gets folded into the `[slug]` param. */
export function activityOpenLinkHref(href: string): string | { pathname: string; hash: string } {
  const i = href.indexOf('#');
  if (i <= 0) return href;
  const pathname = href.slice(0, i);
  const hash = href.slice(i + 1);
  if (!pathname.startsWith('/') || !hash) return href;
  return { pathname, hash };
}

function scenePostHref(postId: string, hash: string): string {
  return `/#${hash || activityPostHash(postId)}`;
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

async function livePostHref(slug: string | undefined, hash: string): Promise<string | undefined> {
  if (!slug) return undefined;
  const href = profileHref(slug, hash);
  if (!href) return undefined;
  const liveSlug = href.match(/^\/profile\/([^/#]+)/)?.[1];
  if (!liveSlug || !(await isLivePublicProfileSlug(liveSlug))) return undefined;
  return href;
}

function postHashForEvent(event: ActivityEvent): string {
  return activityPostHash(event.postId || '', {
    commentId: event.commentId,
    comments: event.type === 'post_reply',
  });
}

export function activityOpenHref(event: ActivityEvent, viewerSlug?: string): string {
  if (event.lockId) return `/lock/${event.lockId}`;
  if (event.href?.startsWith('/lock/')) return event.href;
  if (event.shareId) return `/share/${event.shareId}`;

  if (event.postId) {
    const hash = postHashForEvent(event);
    if (event.direction === 'received') {
      return (
        profileHref(viewerSlug, hash) ||
        rewriteActivityProfileHref(event.href || '') ||
        scenePostHref(event.postId, hash)
      );
    }
    return (
      profileHref(event.targetSlug, hash) ||
      rewriteActivityProfileHref(event.href || '') ||
      profileHref(viewerSlug, hash) ||
      scenePostHref(event.postId, hash)
    );
  }

  if (event.href) {
    return rewriteActivityProfileHref(event.href) || event.href;
  }
  if (event.type === 'friend_accepted' && event.actorSlug) {
    return profileHref(event.actorSlug) || '/friends';
  }
  if (event.type === 'friend_request' || event.type === 'contact_request') return '/activity?tab=requests';
  if (event.type === 'fold_pass') return event.href || '/folds';
  if (event.type === 'contact_accepted' && event.actorSlug) {
    return profileHref(event.actorSlug) || '/activity';
  }
  return '/activity';
}

/**
 * Open target for an activity row. Never sends the user to a 404 Artist Home
 * (unpublished vanity slug, hyphen/uid leftovers). Posts fall back to Scene.
 */
export async function resolveActivityOpenHref(
  event: ActivityEvent,
  opts?: { viewerUserId?: string; viewerSlug?: string }
): Promise<string> {
  if (event.lockId) return `/lock/${event.lockId}`;
  if (event.href?.startsWith('/lock/')) return event.href;
  if (event.shareId) return `/share/${event.shareId}`;

  if (event.postId) {
    const hash = postHashForEvent(event);
    const { fetchLivePublicProfileByUserId } = await import('@/lib/profile/social-client');
    const ownerUserId =
      event.direction === 'received' ? opts?.viewerUserId : event.targetUserId;
    if (ownerUserId) {
      const live = await fetchLivePublicProfileByUserId(ownerUserId);
      const href = await livePostHref(live?.slug, hash);
      if (href) return href;
    }
    const baked =
      event.direction === 'received' ? opts?.viewerSlug : event.targetSlug || opts?.viewerSlug;
    const fromBaked = await livePostHref(baked, hash);
    if (fromBaked) return fromBaked;
    const rewritten = rewriteActivityProfileHref(event.href || '');
    if (rewritten) {
      const slug = rewritten.match(/^\/profile\/([^/#]+)/)?.[1];
      if (slug && (await isLivePublicProfileSlug(slug))) {
        const withHash = profileHref(slug, hash);
        return withHash || rewritten;
      }
    }
    return scenePostHref(event.postId, hash);
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
export function navigateActivityHref(push: (href: string) => void, href: string) {
  if (typeof window === 'undefined') {
    push(href);
    return;
  }
  if (href.includes('#')) {
    try {
      const next = new URL(href, window.location.origin);
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
    window.location.assign(href);
    return;
  }
  push(href);
}
