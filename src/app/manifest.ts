import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bar 4 Bar Studio',
    short_name: 'Bar 4 Bar',
    description: 'The Professional AI Rhyme Book & Studio Workstation.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#050a1e',
    theme_color: '#2563eb',
    categories: ['music', 'productivity', 'entertainment'],
    icons: [
      {
        src: '/Logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/Logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
