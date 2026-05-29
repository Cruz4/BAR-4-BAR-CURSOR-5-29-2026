import type { MetadataRoute } from 'next';
import { SEO } from '@/lib/studio-tiers';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SEO.url;
  const routes = ['', '/login', '/pricing', '/usage', '/terms', '/privacy', '/cookies'];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.8,
  }));
}
