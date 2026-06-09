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
        '/maintenance',
        '/marketing/capture',
        '/studio-progress',
        '/usage',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SEO.url,
  };
}
