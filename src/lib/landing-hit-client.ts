'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';
import { getStoredMarketingRef, normalizeMarketingRef } from '@/lib/marketing-attribution';

const SENT_PREFIX = 'b4b_landing_hit_sent:';
const ALERT_PATHS = new Set(['/', '/pricing', '/login', '/welcome', '/discover']);

function resolveRef(urlRef: string | null): string {
  return urlRef || getStoredMarketingRef() || 'organic';
}

/** Report a public page visit once per tab session (ref or organic), with guest alias. */
export async function reportLandingHitIfNeeded(
  pathname: string,
  opts?: { signedIn?: boolean }
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const path = pathname || window.location.pathname || '/';
    if (!ALERT_PATHS.has(path)) return;

    const params = new URLSearchParams(window.location.search);
    const urlRef = normalizeMarketingRef(params.get('ref'));

    if ((path === '/login' || path === '/welcome') && !urlRef && !getStoredMarketingRef()) return;

    const ref = resolveRef(urlRef);
    // Organic login noise — skip; other public pages still record (signed-in names included).
    if ((path === '/login' || path === '/welcome') && ref === 'organic') return;

    const { guestId, guestAlias } = getOrCreateGuestIdentity();
    const dedupeKey = `${SENT_PREFIX}${ref}:${path}:${guestId.slice(0, 8)}`;
    if (sessionStorage.getItem(dedupeKey)) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let user = auth.currentUser;
    if (!user && opts?.signedIn) {
      try {
        await auth.authStateReady();
        user = auth.currentUser;
      } catch {
        /* record as guest */
      }
    }
    if (user) {
      try {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      } catch {
        /* still record as guest */
      }
    }

    const res = await fetch('/api/analytics/landing-hit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref,
        path,
        guestId,
        guestAlias,
        referrer: document.referrer || null,
      }),
    });
    if (!res.ok) return;

    const data = (await res.json().catch(() => null)) as { ok?: boolean; throttled?: boolean } | null;
    if (!data?.ok || data.throttled) return;

    sessionStorage.setItem(dedupeKey, '1');
  } catch {
    // Non-blocking
  }
}
