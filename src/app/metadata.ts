import type { Metadata } from 'next';
import { SEO } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SEO.url),
  title: {
    default: SEO.title,
    template: `%s | ${SEO.siteName}`,
  },
  description: SEO.description,
  keywords: [...SEO.keywords],
  applicationName: SEO.siteName,
  authors: [{ name: SEO.siteName }],
  creator: SEO.siteName,
  publisher: SEO.siteName,
  category: 'music',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SEO.url,
    siteName: SEO.siteName,
    title: SEO.title,
    description: SEO.description,
    images: [
      {
        url: SEO.ogImagePath,
        width: 512,
        height: 512,
        alt: `${SEO.siteName} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO.title,
    description: SEO.description,
    images: [SEO.ogImagePath],
    ...(SEO.twitterHandle ? { site: SEO.twitterHandle } : {}),
  },
  icons: {
    icon: [
      { url: SEO.faviconPath, type: 'image/png' },
      { url: SEO.faviconPath, type: 'image/png', sizes: '192x192' },
      { url: SEO.faviconPath, type: 'image/png', sizes: '512x512' },
    ],
    shortcut: SEO.faviconPath,
    apple: SEO.faviconPath,
  },
  alternates: {
    canonical: SEO.url,
  },
  manifest: '/manifest.webmanifest',
};
