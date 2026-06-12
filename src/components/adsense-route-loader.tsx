'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isAdsenseAllowedPath } from '@/lib/adsense-paths';

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? 'ca-pub-1403404509068347';
const SCRIPT_ID = 'adsense-loader';

/** Loads AdSense only on public content pages (never on app shells, loaders, or capture routes). */
export function AdSenseRouteLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (!ADSENSE_CLIENT || !isAdsenseAllowedPath(pathname)) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, [pathname]);

  return null;
}
