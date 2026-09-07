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
  applicationName: SEO.appName,
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
    title: SEO.titleLong,
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
    title: SEO.titleLong,
    description: SEO.description,
    images: [absoluteUrl(SEO.ogImagePath)],
    ...(SEO.twitterHandle ? { site: SEO.twitterHandle } : {}),
  },
  icons: {
    icon: [
      { url: `${SEO.faviconPath}?v=aka23`, type: 'image/svg+xml', sizes: 'any' },
      { url: '/favicon-32.png?v=aka23', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: SEO.faviconPath,
    apple: `${SEO.appIconPath}?v=aka23`,
  },
  alternates: {
    canonical: SEO.url,
  },
  manifest: '/manifest.webmanifest',
};
