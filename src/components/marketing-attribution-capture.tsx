'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureMarketingRefFromUrl, getStoredMarketingRef } from '@/lib/marketing-attribution';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';
import { reportLandingHitIfNeeded } from '@/lib/landing-hit-client';
import { useAuth } from '@/hooks/use-auth';

/** Persists ?ref= from landing URLs for signup attribution + admin landing alerts. */
export function MarketingAttributionCapture() {
  const pathname = usePathname();
  const { loading, user } = useAuth();

  useEffect(() => {
    captureMarketingRefFromUrl();
    // Wait for auth state to resolve (logged in or not). authReady is only true when
    // signed in — using it blocked all anonymous landing/ref visit alerts.
    if (loading) return;
    // Ensure a stable Guest-* alias exists for attributed traffic before the hit fires.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('ref') || getStoredMarketingRef()) {
        getOrCreateGuestIdentity();
      }
    }
    void reportLandingHitIfNeeded(pathname || '/', { signedIn: Boolean(user) });
  }, [pathname, loading, user]);

  return null;
}
