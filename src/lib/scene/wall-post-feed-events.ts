import type { ProfilePost } from '@/lib/profile/social-client';

export const WALL_POST_FEED_EVENT = 'b4b-wall-post-feed';

export type WallPostFeedDetail =
  | { kind: 'upsert'; post: ProfilePost }
  | { kind: 'deleted'; postId: string };

const RECENT_OWN_WALL_MS = 3 * 60 * 1000;
const recentOwnWallPosts = new Map<string, { post: ProfilePost; at: number }>();

function pruneRecentOwnWallPosts(now = Date.now()) {
  for (const [id, entry] of recentOwnWallPosts) {
    if (now - entry.at > RECENT_OWN_WALL_MS) recentOwnWallPosts.delete(id);
  }
}

/** Keep a post that was just written so a stale wall snapshot cannot hide it. */
export function rememberOwnWallPost(post: ProfilePost) {
  if (!post?.id || !post.ownerId) return;
  recentOwnWallPosts.set(post.id, { post, at: Date.now() });
}

export function forgetOwnWallPost(postId: string) {
  if (!postId) return;
  recentOwnWallPosts.delete(postId);
}

/**
 * Page 0 of an owner wall includes posts written in this tab.
 * A server page that already contains the post drops it from the cache.
 */
export function mergeRecentOwnWallPosts(
  ownerId: string,
  posts: ProfilePost[],
  page = 0
): ProfilePost[] {
  pruneRecentOwnWallPosts();
  if (!ownerId) return posts;
  const seen = new Set(posts.map((row) => row.id));
  for (const id of seen) {
    const entry = recentOwnWallPosts.get(id);
    if (entry && entry.post.ownerId === ownerId) recentOwnWallPosts.delete(id);
  }
  if (page !== 0) return posts;
  const extras: ProfilePost[] = [];
  for (const entry of recentOwnWallPosts.values()) {
    if (entry.post.ownerId !== ownerId || seen.has(entry.post.id)) continue;
    extras.push(entry.post);
  }
  if (!extras.length) return posts;
  extras.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return [...extras, ...posts];
}

/** Notify mounted feeds (Scene Your Block, Artist Home wall) that a wall post changed. */
export function emitWallPostFeed(detail: WallPostFeedDetail) {
  if (detail.kind === 'upsert') rememberOwnWallPost(detail.post);
  else forgetOwnWallPost(detail.postId);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WALL_POST_FEED_EVENT, { detail }));
}

export function mergeWallPostFeed(
  posts: ProfilePost[],
  post: ProfilePost
): ProfilePost[] {
  const idx = posts.findIndex((row) => row.id === post.id);
  if (idx >= 0) {
    const next = [...posts];
    next[idx] = post;
    return next;
  }
  return [post, ...posts];
}
