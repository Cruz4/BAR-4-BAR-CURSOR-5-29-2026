import type { MetadataRoute } from 'next';
import { LOGO_PATH } from '@/lib/brand';
import { SEO } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  // Same transparent Logo.png as the installed taskbar icon — never app-icon navy square.
  const desktopIcon = `${LOGO_PATH}?v=aka23`;
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
    // Desktop PWA only — transparent Logo.png. Never android-icon / maskable / navy app-icon.
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
    ],
  };
}
