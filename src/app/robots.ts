import type { MetadataRoute } from 'next';
import { SEO } from '@/lib/studio-tiers';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: `${SEO.url}/sitemap.xml`,
  };
}
