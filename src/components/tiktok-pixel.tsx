'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isTikTokPixelEnabled, trackTikTokPageView } from '@/lib/tiktok-pixel';

/** SPA route changes — base code is injected in root layout `<head>`. */
export function TikTokPixel() {
  const pathname = usePathname();
  const enabled = isTikTokPixelEnabled();

  useEffect(() => {
    if (!enabled) return;
    trackTikTokPageView();
  }, [pathname, enabled]);

  return null;
}
