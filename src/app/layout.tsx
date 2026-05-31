import React from 'react';
import { cn } from '@/lib/utils';
import './globals.css';
import { ClientLayout } from '@/components/client-layout';
export { metadata } from './metadata';
import { SEO } from '@/lib/studio-tiers';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=IBM+Plex+Mono:wght@400;700&family=Inter:wght@400;500;700&family=Architects+Daughter&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: SEO.siteName,
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web',
              description: SEO.description,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free Visitor tier with optional Studio Pro from $4.44/mo yearly',
              },
            }),
          }}
        />
      </head>
      <body className={cn('font-body antialiased min-h-screen studio-page-base flex flex-col')} suppressHydrationWarning>
          <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
