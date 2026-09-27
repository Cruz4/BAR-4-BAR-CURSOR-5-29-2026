'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { DiscoverHeatKind } from '@/lib/discover-heat';

/** Tell the server a verified Love, reply, or Reverb changed, so Discover heat can move. */
export function syncDiscoverHeat(input: {
  postId: string;
  kind: Exclude<DiscoverHeatKind, 'view'>;
  direction: 'grant' | 'revoke';
  commentId?: string;
}): void {
  const user = auth.currentUser;
  const postId = input.postId.trim();
  if (!user || !postId) return;
  void user
    .getIdToken()
    .then((token) =>
      fetch('/api/social/discover-heat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          postId,
          kind: input.kind,
          direction: input.direction,
          ...(input.commentId ? { commentId: input.commentId } : {}),
        }),
      })
    )
    .catch(() => undefined);
}
