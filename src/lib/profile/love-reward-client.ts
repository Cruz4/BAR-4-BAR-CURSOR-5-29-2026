'use client';

import { auth } from '@/lib/firebase/client/firebase';

/** Server-verified XP for the post/comment author when someone loves their work. */
export function notifyLoveReward(input: {
  postId?: string;
  commentId?: string;
  shareId?: string;
}): void {
  const user = auth.currentUser;
  if (!user) return;
  void user
    .getIdToken()
    .then((token) =>
      fetch('/api/social/love-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.uid, ...input }),
      })
    )
    .catch(() => undefined);
}
