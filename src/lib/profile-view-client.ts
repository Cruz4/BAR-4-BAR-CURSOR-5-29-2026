'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';

export { compactReachCount } from '@/lib/post-view-client';

const SESSION_PREFIX = 'b4b.profileView.';

function sessionKey(slug: string): string {
  return `${SESSION_PREFIX}${slug.toLowerCase()}`;
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

/** Fire-and-forget unique Artist Home visit. Session + server tick dedupe. Owner is ignored server-side. */
export function recordProfileViewClient(slug: string): void {
  const clean = slug.trim();
  if (!clean) return;
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey(clean))) return;
    sessionStorage.setItem(sessionKey(clean), '1');
  } catch {
    /* server still dedupes */
  }
  void (async () => {
    try {
      const headers = await authHeaders();
      const guestId = auth.currentUser ? null : getOrCreateGuestIdentity().guestId;
      await fetch('/api/profile/view', {
        method: 'POST',
        headers,
        body: JSON.stringify({ slug: clean, ...(guestId ? { guestId } : {}) }),
      });
    } catch {
      /* ignore */
    }
  })();
}
