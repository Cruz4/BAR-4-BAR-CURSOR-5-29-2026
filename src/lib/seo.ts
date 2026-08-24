import type { Metadata } from 'next';
import { getPublicAppUrl } from '@/lib/app-url';

/** Shared on-page SEO + sitemap/robots (production URL from NEXT_PUBLIC_APP_URL). */
export const SEO = {
  siteName: 'Bar 4 Bar DNA Notebook',
  /** Installed PWA / browser tab — keep short; Windows prepends manifest name to `<title>`. */
  appName: 'Bar 4 Bar',
  /** Default document title (tab + PWA window suffix). Match appName to avoid duplicate title bar text. */
  title: 'Bar 4 Bar',
  /** Open Graph / structured data — one clear line for search & shares. */
  titleLong: 'Bar 4 Bar — AI Songwriting Studio & Music Network',
  description:
    'Bar-by-bar AI songwriting studio and music network for artists, creators, and fans. Write with Creative DNA, discover music, collaborate, and sell First Drops.',
  keywords: [
    'bar 4 bar',
    'bar4bar',
    'artist home',
    'music fan profile',
    'public music profile',
    'the scene',
    'music discovery app',
    'independent music discovery',
    'emerging artist platform',
    'artist listener analytics',
    'sell music directly to fans',
    'first drops music',
    'DNA notebook',
    'AI rhyme book',
    'lyric notebook',
    'bar by bar songwriting',
    'rhyme book app',
    'songwriting studio',
    'lyric workstation',
    'rhyme scheme helper',
    'creative DNA lyrics',
    'poetry writing app',
    'concept album songwriting',
    'artist home page',
    'shareable lyric profile',
    'collab sheet',
    'live lyric collaboration',
    'real-time songwriting',
  ],
  url: getPublicAppUrl(),
  /** Tab, PWA, Google site icon, and social preview (BAR 4 BAR logo). */
  faviconPath: '/Logo.png',
  faviconIcoPath: '/favicon.ico',
  ogImagePath: '/Logo.png',
  twitterHandle: undefined as string | undefined,
};

export const PUBLIC_SITEMAP_PATHS: Array<{
  path: string;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/try', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.85 },
  { path: '/discover', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/charts', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/leaderboard', changeFrequency: 'weekly', priority: 0.75 },
  { path: '/login', changeFrequency: 'weekly', priority: 0.65 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/cookies', changeFrequency: 'monthly', priority: 0.35 },
];

export function absoluteUrl(path = ''): string {
  const base = SEO.url.replace(/\/$/, '');
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildStructuredDataGraph(): Record<string, unknown>[] {
  const appUrl = SEO.url;
  const imageUrl = absoluteUrl(SEO.ogImagePath);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SEO.siteName,
      url: appUrl,
      description: SEO.description,
      inLanguage: 'en-US',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SEO.siteName,
      url: appUrl,
      logo: imageUrl,
      email: 'bar4bar.support@gmail.com',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'bar4bar.support@gmail.com',
          availableLanguage: ['English'],
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SEO.siteName,
      url: appUrl,
      image: imageUrl,
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'Songwriting and music community',
      operatingSystem: 'Web',
      description: SEO.description,
      audience: {
        '@type': 'Audience',
        audienceType: 'Artists, songwriters, producers, engineers, DJs, and music fans',
      },
      featureList: [
        'Bar-by-bar AI-assisted lyric writing',
        'Creative DNA and album-aware songwriting',
        'Public music profiles for artists, creators, and music fans',
        'Owned or purchased featured-track excerpts',
        'Explainable taste and craft discovery',
        'Follow, Inner Circle, Friends, and live collaboration',
        'Qualified listener insights and transparent Emerging rankings',
        'Proof-based song and artist charts by genre and public Scene region',
        'First Drop direct-to-fan music sales',
        'Versioned non-destructive studio backups',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free Visitor tier with optional Studio Pro from $4.44/mo yearly',
      },
    },
  ];
}

/** Per-route metadata with canonical + Open Graph URL. */
export function pageMetadata(options: {
  title: string;
  description: string;
  path: string;
  openGraphTitle?: string;
  /** Account-only pages should be useful in-browser without entering search results. */
  index?: boolean;
}): Metadata {
  const canonical = absoluteUrl(options.path);
  const ogTitle = options.openGraphTitle ?? `${options.title} | ${SEO.siteName}`;
  return {
    title: options.title,
    description: options.description,
    ...(options.index === false ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: canonical,
      siteName: SEO.siteName,
      title: ogTitle,
      description: options.description,
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
      title: ogTitle,
      description: options.description,
      images: [SEO.ogImagePath],
      ...(SEO.twitterHandle ? { site: SEO.twitterHandle } : {}),
    },
  };
}
