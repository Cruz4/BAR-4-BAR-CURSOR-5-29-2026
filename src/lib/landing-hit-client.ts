'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';
import { getStoredMarketingRef, normalizeMarketingRef } from '@/lib/marketing-attribution';
import { loadLastCachedUserProfile } from '@/lib/offline/vault-cache';

const SENT_PREFIX = 'b4b_landing_hit_sent:';
const ALERT_PATHS = new Set(['/', '/pricing', '/login', '/welcome', '/discover']);

function resolveRef(urlRef: string | null): string {
  return urlRef || getStoredMarketingRef() || 'organic';
}

function isSignedInSession(explicit?: boolean): boolean {
  if (typeof explicit === 'boolean') return explicit;
  if (auth.currentUser) return true;
  // AuthProvider hydrates the last profile before Firebase restores currentUser.
  // Without this fallback, callers that do not yet know auth state can report a
  // logged-in Scene visit on / as a guest organic hit.
  return Boolean(loadLastCachedUserProfile());
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
    const signedIn = isSignedInSession(opts?.signedIn);

    // Logged-in Scene lives at / — skip organic noise; still alert on explicit ?ref= links.
    if (path === '/' && signedIn && !urlRef) return;
    // Discover alerts are specifically for anonymous visitors, not members browsing the feed.
    if (path === '/discover' && signedIn) return;
    // Logged-in pricing is reported via analytics pricing_view.
    if (path === '/pricing' && signedIn) return;
    // Login/welcome: only alert when a marketing ref is present (or stored).
    if ((path === '/login' || path === '/welcome') && signedIn) return;
    if ((path === '/login' || path === '/welcome') && !urlRef && !getStoredMarketingRef()) return;

    const ref = resolveRef(urlRef);
    // Organic login noise — skip; organic / and /pricing still alert for real guests.
    if ((path === '/login' || path === '/welcome') && ref === 'organic') return;

    const { guestId, guestAlias } = getOrCreateGuestIdentity();
    const dedupeKey = `${SENT_PREFIX}${ref}:${path}:${guestId.slice(0, 8)}`;
    if (sessionStorage.getItem(dedupeKey)) return;

    const res = await fetch('/api/analytics/landing-hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, path, guestId, guestAlias }),
    });
    if (!res.ok) return;

    const data = (await res.json().catch(() => null)) as { ok?: boolean; throttled?: boolean } | null;
    if (!data?.ok || data.throttled) return;

    sessionStorage.setItem(dedupeKey, '1');
  } catch {
    // Non-blocking
  }
}
