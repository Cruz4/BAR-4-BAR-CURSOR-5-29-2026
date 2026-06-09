'use client';

import { normalizeMarketingRef } from '@/lib/marketing-attribution';

const SENT_PREFIX = 'b4b_landing_hit_sent:';

/** Report a marketing landing hit once per tab session (ref + path). */
export async function reportLandingHitIfNeeded(pathname: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeMarketingRef(params.get('ref'));
    if (!ref) return;

    const path = pathname || window.location.pathname || '/';
    const dedupeKey = `${SENT_PREFIX}${ref}:${path}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');

    await fetch('/api/analytics/landing-hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, path }),
    });
  } catch {
    // Non-blocking
  }
}
