'use client';

import { useEffect } from 'react';
import { captureMarketingRefFromUrl } from '@/lib/marketing-attribution';

/** Persists ?ref= from landing URLs for signup attribution. */
export function MarketingAttributionCapture() {
  useEffect(() => {
    captureMarketingRefFromUrl();
  }, []);
  return null;
}
