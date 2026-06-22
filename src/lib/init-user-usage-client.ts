'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { initUserUsageAction } from '@/lib/server/usage-actions';

/** Bootstrap welcome Ink + monthly grants — prefers fresh ID token after email verify. */
export async function syncUserUsageBootstrap(forceRefresh = false): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const idToken = await user.getIdToken(forceRefresh);
  const userId = user.uid;

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
}
