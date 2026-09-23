'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';
import type { ReachAnalyticsResponse } from '@/lib/reach-analytics-types';
import { displayReachCount, displayLandingCount } from '@/lib/reach-display';

export { displayReachCount, displayLandingCount };

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

const SHARE_LANDING_PREFIX = 'b4b.shareLanding.';

export function recordShareLandingClient(shareId: string): void {
  const id = shareId.trim().toUpperCase();
  if (!id) return;
  try {
    if (sessionStorage.getItem(`${SHARE_LANDING_PREFIX}${id}`)) return;
    sessionStorage.setItem(`${SHARE_LANDING_PREFIX}${id}`, '1');
  } catch {
    /* server dedupes */
  }
  void (async () => {
    try {
      const headers = await authHeaders();
      const guestId = auth.currentUser ? null : getOrCreateGuestIdentity().guestId;
      await fetch(`/api/shares/${encodeURIComponent(id)}/landing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...(guestId ? { guestId } : {}) }),
      });
    } catch {
      /* ignore */
    }
  })();
}

export async function fetchShareReachAnalytics(
  shareId: string,
  days = 30
): Promise<ReachAnalyticsResponse | null> {
  const headers = await authHeaders();
  const res = await fetch(
    `/api/shares/${encodeURIComponent(shareId.trim().toUpperCase())}/reach?days=${days}`,
    { headers, cache: 'no-store' }
  );
  if (!res.ok) return null;
  return (await res.json()) as ReachAnalyticsResponse;
}

export async function fetchProfileReachAnalytics(
  slug: string,
  days = 30
): Promise<ReachAnalyticsResponse | null> {
  const headers = await authHeaders();
  const res = await fetch(
    `/api/profile/reach?slug=${encodeURIComponent(slug.trim())}&days=${days}`,
    { headers, cache: 'no-store' }
  );
  if (!res.ok) return null;
  return (await res.json()) as ReachAnalyticsResponse;
}
