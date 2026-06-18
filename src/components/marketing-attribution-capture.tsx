'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureMarketingRefFromUrl } from '@/lib/marketing-attribution';
import { reportLandingHitIfNeeded } from '@/lib/landing-hit-client';
import { useAuth } from '@/hooks/use-auth';

/** Persists ?ref= from landing URLs for signup attribution + admin landing alerts. */
export function MarketingAttributionCapture() {
  const pathname = usePathname();
  const { authReady, loading } = useAuth();

  useEffect(() => {
    captureMarketingRefFromUrl();
    if (!authReady || loading) return;
    void reportLandingHitIfNeeded(pathname || '/');
  }, [pathname, authReady, loading]);

  return null;
}
