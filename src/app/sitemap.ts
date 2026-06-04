import type { MetadataRoute } from 'next';
import { absoluteUrl, PUBLIC_SITEMAP_PATHS } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path || '/'),
    lastModified,
    changeFrequency,
    priority,
  }));
}
