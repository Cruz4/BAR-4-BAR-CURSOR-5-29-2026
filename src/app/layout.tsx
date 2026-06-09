import React from 'react';
import { cn } from '@/lib/utils';
import './globals.css';
import { ClientLayout } from '@/components/client-layout';
export { metadata } from './metadata';
import { absoluteUrl, buildStructuredDataGraph, SEO } from '@/lib/seo';

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
        <link rel="icon" href={SEO.faviconIcoPath} sizes="any" />
        <link rel="icon" href={absoluteUrl(SEO.faviconPath)} type="image/png" sizes="1024x1024" />
        <link rel="apple-touch-icon" href={absoluteUrl(SEO.faviconPath)} />
        {buildStructuredDataGraph().map((node, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
          />
        ))}
      </head>
      <body className={cn('font-body antialiased min-h-screen studio-page-base flex flex-col')} suppressHydrationWarning>
          <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
