import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { ROBOTS_DISALLOW_PATHS } from '@/lib/robots-content';

// Match sitemap.xml: Firebase Hosting serves static ○ metadata routes unreliably;
// force runtime generation so /robots.txt hits the SSR backend (public/robots.txt is CDN fallback).
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
