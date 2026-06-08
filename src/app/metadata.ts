import type { Metadata } from 'next';
import { absoluteUrl, SEO } from '@/lib/seo';

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
        url: absoluteUrl(SEO.ogImagePath),
        width: 1024,
        height: 1024,
        alt: `${SEO.siteName} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO.title,
    description: SEO.description,
    images: [absoluteUrl(SEO.ogImagePath)],
    ...(SEO.twitterHandle ? { site: SEO.twitterHandle } : {}),
  },
  icons: {
    icon: [
      { url: SEO.faviconIcoPath, sizes: 'any' },
      { url: absoluteUrl(SEO.faviconPath), type: 'image/png', sizes: '32x32' },
      { url: absoluteUrl(SEO.faviconPath), type: 'image/png', sizes: '192x192' },
      { url: absoluteUrl(SEO.faviconPath), type: 'image/png', sizes: '512x512' },
    ],
    shortcut: SEO.faviconIcoPath,
    apple: absoluteUrl(SEO.faviconPath),
  },
  alternates: {
    canonical: SEO.url,
  },
  manifest: '/manifest.webmanifest',
};
