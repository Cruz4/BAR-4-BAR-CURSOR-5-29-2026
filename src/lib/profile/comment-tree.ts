import type { PostComment } from '@/lib/profile/social-client';

export type CommentNode = PostComment & { replies: CommentNode[] };

export function buildCommentTree(comments: PostComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) continue;
    const parentId = comment.parentCommentId?.trim();
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
