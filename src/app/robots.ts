import type { MetadataRoute } from 'next';
import { absoluteUrl, SEO } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/albums/',
        '/activity',
        '/earnings',
        '/feed',
        '/friends',
        '/insights',
        '/library',
        '/maintenance',
        '/marketing/capture',
        '/msgs',
        '/profile/customize',
        '/studio-progress',
        '/supporters',
        '/usage',
        '/vault',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SEO.url,
  };
}
