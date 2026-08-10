'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { initUserUsageAction } from '@/lib/server/usage-actions';

const inflightByUid = new Map<string, Promise<boolean>>();

/** Bootstrap welcome Ink + monthly grants — prefers fresh ID token after email verify. */
export async function syncUserUsageBootstrap(forceRefresh = false): Promise<boolean> {
  const user = auth.currentUser;
  if (!user?.uid) return false;

  const userId = user.uid;
  const existing = inflightByUid.get(userId);
  if (existing) return existing;

  const run = (async () => {
    const idToken = await user.getIdToken(forceRefresh);
    if (!idToken) return false;

    try {
      const res = await fetch('/api/usage/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) return true;
    } catch {
      /* fall through to server action */
    }

    try {
      const result = await initUserUsageAction(idToken, userId);
      return result.ok;
    } catch {
      return false;
    }
  })();

  inflightByUid.set(userId, run);
  try {
    return await run;
  } finally {
    inflightByUid.delete(userId);
  }
}
