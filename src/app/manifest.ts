import type { MetadataRoute } from 'next';
import { SEO } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO.appName,
    short_name: SEO.appName,
    description: SEO.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#050a1e',
    theme_color: '#2563eb',
    categories: ['music', 'productivity', 'entertainment'],
    // Required by Chrome for FCM web push (fixed Firebase value — not your project sender id).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ gcm_sender_id: '103953800507' } as any),
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
  };
}
