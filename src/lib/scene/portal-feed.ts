/**
 * Scene portal swipe feeds live at /?scene=block|discover so the phone back
 * button can return to the same feed after opening a profile.
 */

import type { ProfilePost } from '@/lib/profile/social-client';
import type { DiscoverData } from '@/lib/scene/discover-client';

export const SCENE_PORTAL_PARAM = 'scene';

export type ScenePortalFeed = 'block' | 'discover';

const SLIDE_KEY = 'aka.scene.portal.slide';
const FEED_CACHE_KEY = 'aka.scene.portal.feed';
const FEED_CACHE_MAX_MS = 30 * 60 * 1000;

export type ScenePortalFeedCache = {
  savedAt: string;
  posts: ProfilePost[];
  discover: DiscoverData | null;
};

export function parseScenePortalFeed(
  search: string | { get: (key: string) => string | null } | null | undefined
): ScenePortalFeed | null {
  if (!search) return null;
  const value =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(SCENE_PORTAL_PARAM)
      : search.get(SCENE_PORTAL_PARAM);
  return value === 'block' || value === 'discover' ? value : null;
}

export function scenePortalHref(mode: ScenePortalFeed): string {
  return `/?${SCENE_PORTAL_PARAM}=${mode}`;
}

export function rememberScenePortalSlide(mode: ScenePortalFeed, itemKey: string | undefined) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SLIDE_KEY, JSON.stringify({ mode, itemKey: itemKey || '' }));
  } catch {
    /* ignore */
  }
}

export function readScenePortalSlide(mode: ScenePortalFeed): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(SLIDE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { mode?: string; itemKey?: string };
    if (parsed.mode !== mode || !parsed.itemKey) return undefined;
    return parsed.itemKey;
  } catch {
    return undefined;
  }
}

export function clearScenePortalSlide() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SLIDE_KEY);
  } catch {
    /* ignore */
  }
}

/** Snapshot Block + Discover so phone back from a profile restores the feed instantly. */
export function rememberScenePortalFeedCache(posts: ProfilePost[], discover: DiscoverData | null) {
  if (typeof window === 'undefined') return;
  if (!posts.length && !discover) return;
  try {
    sessionStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        posts,
        discover,
      } satisfies ScenePortalFeedCache)
    );
  } catch {
    /* quota */
  }
}

export function readScenePortalFeedCache(): ScenePortalFeedCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScenePortalFeedCache;
    if (!parsed?.savedAt || !Array.isArray(parsed.posts)) return null;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(age) || age > FEED_CACHE_MAX_MS) {
      sessionStorage.removeItem(FEED_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** True when an in-feed link leaves Scene home (profile, vault, drop, lock, …). */
export function isLeavingSceneHome(href: string | null | undefined): boolean {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  let path = href;
  if (/^https?:\/\//i.test(href)) {
    try {
      path = new URL(href).pathname;
    } catch {
      return false;
    }
  } else {
    path = (href.split('#')[0] || href).split('?')[0] || '/';
  }
  if (path === '/' || path === '') return false;
  return true;
}

export function closeScenePortalFeed(router: { back: () => void; replace: (href: string) => void }) {
  clearScenePortalSlide();
  if (typeof window === 'undefined') return;
  if (!parseScenePortalFeed(window.location.search)) return;
  const idx =
    window.history.state && typeof window.history.state === 'object'
      ? (window.history.state as { idx?: unknown }).idx
      : undefined;
  if (typeof idx === 'number' && idx > 0) router.back();
  else router.replace('/');
}
