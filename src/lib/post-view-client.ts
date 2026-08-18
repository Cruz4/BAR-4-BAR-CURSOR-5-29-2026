'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';

const SESSION_PREFIX = 'b4b.postView.';

function sessionKey(postId: string): string {
  return `${SESSION_PREFIX}${postId}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (!user) return headers;
  try {
    const token = await user.getIdToken();
    return { ...headers, Authorization: `Bearer ${token}` };
  } catch {
    return headers;
  }
}

/** Fire-and-forget unique view. Session + server tick dedupe. Owner is ignored server-side. */
export function recordPostViewClient(postId: string): void {
  const id = postId.trim();
  if (!id) return;
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey(id))) return;
    sessionStorage.setItem(sessionKey(id), '1');
  } catch {
    /* server still dedupes */
  }
  void (async () => {
    try {
      const headers = await authHeaders();
      const guestId = auth.currentUser ? null : getOrCreateGuestIdentity().guestId;
      await fetch('/api/posts/view', {
        method: 'POST',
        headers,
        body: JSON.stringify({ postId: id, ...(guestId ? { guestId } : {}) }),
      });
    } catch {
      /* ignore */
    }
  })();
}

export function compactReachCount(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v < 1000) return String(v);
  if (v < 10_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(v / 1000)}k`;
}
