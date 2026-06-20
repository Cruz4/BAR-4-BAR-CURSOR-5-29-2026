'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureMarketingRefFromUrl } from '@/lib/marketing-attribution';
import { reportLandingHitIfNeeded } from '@/lib/landing-hit-client';
import { useAuth } from '@/hooks/use-auth';

/** Persists ?ref= from landing URLs for signup attribution + admin landing alerts. */
export function MarketingAttributionCapture() {
  const pathname = usePathname();
  const { loading } = useAuth();

  useEffect(() => {
    captureMarketingRefFromUrl();
    // Wait for auth state to resolve (logged in or not). authReady is only true when
    // signed in — using it blocked all anonymous landing/ref visit alerts.
    if (loading) return;
    void reportLandingHitIfNeeded(pathname || '/');
  }, [pathname, loading]);

  return null;
}
