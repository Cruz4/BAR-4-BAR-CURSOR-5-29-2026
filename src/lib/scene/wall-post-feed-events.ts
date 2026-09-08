import type { ProfilePost } from '@/lib/profile/social-client';

export const WALL_POST_FEED_EVENT = 'b4b-wall-post-feed';

export type WallPostFeedDetail =
  | { kind: 'upsert'; post: ProfilePost }
  | { kind: 'deleted'; postId: string };

/** Notify mounted feeds (Scene Your Block, etc.) that a wall post changed. */
export function emitWallPostFeed(detail: WallPostFeedDetail) {
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
