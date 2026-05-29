import type { Metadata } from 'next';
import { SEO } from '@/lib/studio-tiers';

export const metadata: Metadata = {
  metadataBase: new URL(SEO.url),
  title: {
    default: SEO.title,
    template: `%s | ${SEO.siteName}`,
  },
  description: SEO.description,
  keywords: [...SEO.keywords],
  applicationName: SEO.siteName,
  authors: [{ name: 'Bar 4 Bar Studio' }],
  creator: 'Bar 4 Bar Studio',
  publisher: 'Bar 4 Bar Studio',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SEO.url,
    siteName: SEO.siteName,
    title: SEO.title,
    description: SEO.description,
    images: [{ url: '/Logo.png', width: 512, height: 512, alt: 'Bar 4 Bar Studio Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO.title,
    description: SEO.description,
    images: ['/Logo.png'],
  },
  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    apple: '/Logo.png',
  },
  alternates: {
    canonical: SEO.url,
  },
};
