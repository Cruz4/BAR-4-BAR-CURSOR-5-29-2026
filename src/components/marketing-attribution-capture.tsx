'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureMarketingRefFromUrl } from '@/lib/marketing-attribution';
import { reportLandingHitIfNeeded } from '@/lib/landing-hit-client';

/** Persists ?ref= from landing URLs for signup attribution + admin landing alerts. */
export function MarketingAttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureMarketingRefFromUrl();
    void reportLandingHitIfNeeded(pathname || '/');
  }, [pathname]);

  return null;
}
