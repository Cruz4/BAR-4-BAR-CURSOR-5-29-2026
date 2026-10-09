'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  ensureTikTokPixelLoaded,
  hasMarketingCookieConsent,
  isTikTokPixelEnabled,
  trackTikTokPageView,
} from '@/lib/tiktok-pixel';

/** SPA route changes — pixel loads only after cookie consent. */
export function TikTokPixel() {
  const pathname = usePathname();
  const enabled = isTikTokPixelEnabled();

  useEffect(() => {
    if (!enabled) return;
    const send = () => {
      if (!hasMarketingCookieConsent()) return;
      ensureTikTokPixelLoaded();
      trackTikTokPageView();
    };
    send();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, send);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, send);
  }, [pathname, enabled]);

  return null;
}
