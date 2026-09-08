import type { ProfilePost } from '@/lib/profile/social-client';

/** Inline data URLs in Firestore posts are a major egress cost — prefer Storage paths. */
export function isInlineDataImageUrl(url: unknown): boolean {
  return typeof url === 'string' && url.startsWith('data:image/');
}

/**
 * Drop redundant inline image payloads when a Storage path exists (or when forced).
 * Keeps https URLs — only strips data:image/* blobs from feed/API payloads.
 */
export function sanitizePostMediaFields<T extends Pick<ProfilePost, 'imageUrl' | 'imageStoragePath' | 'reverbImageUrl'>>(
  post: T,
  opts?: { forceStripInline?: boolean }
): T {
  const force = opts?.forceStripInline ?? true;
  const next = { ...post };
  if (
    force &&
    next.imageStoragePath &&
    isInlineDataImageUrl(next.imageUrl)
  ) {
    delete next.imageUrl;
  }
  if (force && isInlineDataImageUrl(next.reverbImageUrl)) {
    delete next.reverbImageUrl;
  }
  return next;
}

export function sanitizePostsForFeed<T extends ProfilePost>(posts: T[]): T[] {
  return posts.map((post) => sanitizePostMediaFields(post));
}
