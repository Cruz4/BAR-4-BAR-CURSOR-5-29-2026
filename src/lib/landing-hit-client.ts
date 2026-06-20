'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getStoredMarketingRef, normalizeMarketingRef } from '@/lib/marketing-attribution';

const SENT_PREFIX = 'b4b_landing_hit_sent:';
const ALERT_PATHS = new Set(['/', '/pricing']);

function resolveRef(urlRef: string | null): string {
  return urlRef || getStoredMarketingRef() || 'organic';
}

/** Report a public page visit once per tab session (ref or organic). */
export async function reportLandingHitIfNeeded(pathname: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const path = pathname || window.location.pathname || '/';
    if (!ALERT_PATHS.has(path)) return;

    const params = new URLSearchParams(window.location.search);
    const urlRef = normalizeMarketingRef(params.get('ref'));
    const user = auth.currentUser;

    // Logged-in vault home: skip organic noise; still alert on explicit ?ref= links.
    if (path === '/' && user && !urlRef) return;
    // Logged-in pricing is reported via analytics pricing_view.
    if (path === '/pricing' && user) return;

    const ref = resolveRef(urlRef);
    const dedupeKey = `${SENT_PREFIX}${ref}:${path}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');

    const res = await fetch('/api/analytics/landing-hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, path }),
    });
    if (!res.ok) {
      sessionStorage.removeItem(dedupeKey);
    }
  } catch {
    // Non-blocking
  }
}
