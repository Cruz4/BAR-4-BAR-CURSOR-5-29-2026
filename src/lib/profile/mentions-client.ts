'use client';

import { auth } from '@/lib/firebase/client/firebase';

export function notifyMentions(input: {
  sourceKind: 'post' | 'post_comment' | 'drop_comment';
  sourceId: string;
  commentId?: string;
}): void {
  void (async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch('/api/activity/mentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...input, actorId: user.uid }),
      });
    } catch {
      // Mention delivery must never make a successful post appear failed.
    }
  })();
}
