import type { MetadataRoute } from 'next';
import { ANDROID_ICON_192_PATH, ANDROID_ICON_PATH, LOGO_PATH } from '@/lib/brand';
import { SEO } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  // Desktop Chromium PWAs use purpose:any (transparent Logo.png).
  // Android prefers purpose:maskable — navy burger so the launcher is not Logo on white.
  const desktopIcon = `${LOGO_PATH}?v=aka23`;
  const androidIcon192 = `${ANDROID_ICON_192_PATH}?v=aka24`;
  const androidIcon512 = `${ANDROID_ICON_PATH}?v=aka24`;
  return {
    name: SEO.appName,
    short_name: SEO.appName,
    description: SEO.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#05142A',
    theme_color: '#2563eb',
    categories: ['music', 'productivity', 'entertainment'],
    // Required by Chrome for FCM web push (fixed Firebase value — not your project sender id).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ gcm_sender_id: '103953800507' } as any),
    icons: [
      {
        src: desktopIcon,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: desktopIcon,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: androidIcon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: androidIcon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
