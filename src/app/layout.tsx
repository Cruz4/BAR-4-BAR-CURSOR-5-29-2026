import React from 'react';
import { cn } from '@/lib/utils';
import './globals.css';
import { ClientLayout } from '@/components/client-layout';
export { metadata } from './metadata';
import { buildStructuredDataGraph, SEO } from '@/lib/seo';
import {
  buildTikTokPixelBootstrap,
  getTikTokEventsScriptUrl,
  getTikTokPixelId,
  isTikTokPixelEnabledForBuild,
} from '@/lib/tiktok-pixel-config';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname.split('?')[0];var sheet=/^\\/albums\\/[^/]+\\/tracks\\/[^/]+\\/?$/.test(p);var t=sheet?localStorage.getItem('b4b-theme'):'dark';var dark=true;if(t==='light')dark=false;else if(sheet&&t==='system')dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=document.documentElement;if(dark)d.classList.add('dark');else d.classList.remove('dark');}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k='b4b_chunk_reload_at';function r(){var l=sessionStorage.getItem(k),n=Date.now();if(l&&n-Number(l)<1e4)return;sessionStorage.setItem(k,String(n));location.reload()}window.addEventListener('unhandledrejection',function(e){var m=String((e.reason&&e.reason.message)||e.reason||'');if(m.indexOf('ChunkLoadError')>-1||m.indexOf('Loading chunk')>-1){e.preventDefault();r()}});window.addEventListener('error',function(e){var m=String(e.message||'');if(m.indexOf('ChunkLoadError')>-1||m.indexOf('Loading chunk')>-1)r()})})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Root App Router layout: this stylesheet is global, despite the legacy pages/_document lint rule. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=IBM+Plex+Mono:wght@400;700&family=Inter:wght@400;500;700&family=Architects+Daughter&display=swap" rel="stylesheet" />
        <link rel="icon" href={`${SEO.faviconPath}?v=aka23`} type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png?v=aka23" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href={`${SEO.appIconPath}?v=aka23`} />
        {buildStructuredDataGraph().map((node, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
          />
        ))}
        {isTikTokPixelEnabledForBuild() ? (
          <>
            {/* TikTok Pixel Code Start */}
            <link rel="preconnect" href="https://analytics.tiktok.com" />
            <script
              id="tiktok-pixel"
              dangerouslySetInnerHTML={{
                __html: buildTikTokPixelBootstrap(getTikTokPixelId()),
              }}
            />
            <script
              async
              id="tiktok-pixel-events"
              src={getTikTokEventsScriptUrl(getTikTokPixelId())}
            />
            {/* TikTok Pixel Code End */}
          </>
        ) : null}
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background flex flex-col')} suppressHydrationWarning>
          <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
