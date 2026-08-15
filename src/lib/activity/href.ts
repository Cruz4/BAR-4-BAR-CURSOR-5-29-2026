import { profileHref } from '@/lib/profile/profile-slug';
import type { ActivityEvent } from '@/lib/activity/types';

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

function scenePostHref(postId: string): string {
  return `/#post-${postId}`;
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

async function livePostHref(slug: string | undefined, postId: string): Promise<string | undefined> {
  if (!slug) return undefined;
  const href = profileHref(slug, `post-${postId}`);
  if (!href) return undefined;
  const liveSlug = href.match(/^\/profile\/([^/#]+)/)?.[1];
  if (!liveSlug || !(await isLivePublicProfileSlug(liveSlug))) return undefined;
  return href;
}

export function activityOpenHref(event: ActivityEvent, viewerSlug?: string): string {
  if (event.lockId) return `/lock/${event.lockId}`;
  if (event.href?.startsWith('/lock/')) return event.href;
  if (event.shareId) return `/share/${event.shareId}`;

  if (event.postId) {
    const hash = `post-${event.postId}`;
    if (event.direction === 'received') {
      return (
        profileHref(viewerSlug, hash) ||
        rewriteActivityProfileHref(event.href || '') ||
        scenePostHref(event.postId)
      );
    }
    return (
      profileHref(event.targetSlug, hash) ||
      rewriteActivityProfileHref(event.href || '') ||
      profileHref(viewerSlug, hash) ||
      scenePostHref(event.postId)
    );
  }

  if (event.href) {
    return rewriteActivityProfileHref(event.href) || event.href;
  }
  if (event.type === 'friend_accepted' && event.actorSlug) {
    return profileHref(event.actorSlug) || '/friends';
  }
  if (event.type === 'friend_request') return '/activity?tab=requests';
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
    const { fetchLivePublicProfileByUserId } = await import('@/lib/profile/social-client');
    const ownerUserId =
      event.direction === 'received' ? opts?.viewerUserId : event.targetUserId;
    if (ownerUserId) {
      const live = await fetchLivePublicProfileByUserId(ownerUserId);
      const href = await livePostHref(live?.slug, event.postId);
      if (href) return href;
    }
    const baked =
      event.direction === 'received' ? opts?.viewerSlug : event.targetSlug || opts?.viewerSlug;
    const fromBaked = await livePostHref(baked, event.postId);
    if (fromBaked) return fromBaked;
    const rewritten = rewriteActivityProfileHref(event.href || '');
    if (rewritten) {
      const slug = rewritten.match(/^\/profile\/([^/#]+)/)?.[1];
      if (slug && (await isLivePublicProfileSlug(slug))) return rewritten;
    }
    return scenePostHref(event.postId);
  }

  if (event.type === 'friend_accepted' && event.actorId) {
    try {
      const { fetchLivePublicProfileByUserId } = await import('@/lib/profile/social-client');
      const live = await fetchLivePublicProfileByUserId(event.actorId);
      if (live?.slug && (await isLivePublicProfileSlug(live.slug))) {
        return profileHref(live.slug) || '/friends';
      }
    } catch {
      /* fall through */
    }
    if (event.actorSlug && (await isLivePublicProfileSlug(event.actorSlug))) {
      return profileHref(event.actorSlug) || '/friends';
    }
    return '/friends';
  }

  return activityOpenHref(event, opts?.viewerSlug);
}

/** Hash links to Scene (`/#post-…`) need a full assign so the hash survives. */
export function navigateActivityHref(push: (href: string) => void, href: string) {
  if (href.startsWith('/#') && typeof window !== 'undefined') {
    window.location.assign(href);
    return;
  }
  push(href);
}
