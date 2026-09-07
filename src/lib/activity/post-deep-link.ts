/**
 * Activity → wall post deep links.
 * Hash shapes:
 *   #post-{id}
 *   #post-{id}:comments
 *   #post-{id}:c-{commentId}
 */

export type ActivityPostTarget = {
  postId: string;
  commentId?: string;
  openComments: boolean;
};

export function activityPostHash(
  postId: string,
  opts?: { commentId?: string; comments?: boolean }
): string {
  const id = postId.trim();
  if (!id) return '';
  if (opts?.commentId?.trim()) return `post-${id}:c-${opts.commentId.trim()}`;
  if (opts?.comments) return `post-${id}:comments`;
  return `post-${id}`;
}

export function parseActivityPostHash(hash: string | null | undefined): ActivityPostTarget | null {
  const raw = (hash || '').replace(/^#/, '').trim();
  if (!raw.startsWith('post-')) return null;
  const rest = raw.slice('post-'.length);
  const colon = rest.indexOf(':');
  const postId = (colon >= 0 ? rest.slice(0, colon) : rest).trim();
  if (!postId) return null;
  if (colon < 0) return { postId, openComments: false };
  const extra = rest.slice(colon + 1);
  if (extra === 'comments') return { postId, openComments: true };
  if (extra.startsWith('c-')) {
    const commentId = extra.slice(2).trim();
    if (commentId) return { postId, commentId, openComments: true };
  }
  return { postId, openComments: false };
}

export function activityPostElementId(postId: string): string {
  return `post-${postId}`;
}

export function activityCommentElementId(commentId: string): string {
  return `comment-${commentId}`;
}

export function scrollActivityPostTarget(target: ActivityPostTarget): boolean {
  if (typeof document === 'undefined') return false;
  const commentEl = target.commentId
    ? document.getElementById(activityCommentElementId(target.commentId))
    : null;
  const postEl = document.getElementById(activityPostElementId(target.postId));
  const el = commentEl || postEl;
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.setAttribute('data-activity-focus', '1');
  window.setTimeout(() => el.removeAttribute('data-activity-focus'), 2600);
  return true;
}
