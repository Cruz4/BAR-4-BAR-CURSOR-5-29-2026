'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { isAdsenseAllowedPath } from '@/lib/adsense-paths';

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? 'ca-pub-1403404509068347';

/** Loads AdSense only on public content pages (never on app shells, loaders, or capture routes). */
export function AdSenseRouteLoader() {
  const pathname = usePathname();

  if (!ADSENSE_CLIENT || !isAdsenseAllowedPath(pathname)) {
    return null;
  }

  return (
    <Script
      id="adsense-loader"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
