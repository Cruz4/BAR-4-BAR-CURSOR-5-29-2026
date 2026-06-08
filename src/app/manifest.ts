import type { MetadataRoute } from 'next';
import { SEO } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO.siteName,
    short_name: 'Bar 4 Bar',
    description: SEO.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#050a1e',
    theme_color: '#2563eb',
    categories: ['music', 'productivity', 'entertainment'],
    icons: [
      {
        src: SEO.faviconIcoPath,
        sizes: '48x48',
        type: 'image/x-icon',
        purpose: 'any',
      },
      {
        src: SEO.faviconPath,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SEO.faviconPath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SEO.faviconPath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
