'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { MarketingMediaType, MarketingMediaVariant } from '@/lib/marketing-features';

type Props = {
  src: string;
  alt: string;
  mediaType: MarketingMediaType;
  className?: string;
  priority?: boolean;
  variant?: MarketingMediaVariant;
};

const FRAME_MAX: Record<MarketingMediaVariant, string> = {
  'hero-full': 'max-h-[min(72vh,680px)] w-full',
  showcase: 'max-h-[min(62vh,580px)] w-full',
  feature: 'max-h-[min(50vh,460px)] w-full',
  bento: 'max-h-[min(42vh,360px)] w-full',
};

const FRAME_SHELL: Record<MarketingMediaVariant, string> = {
  'hero-full':
    'w-full max-w-none rounded-2xl shadow-[0_20px_90px_rgba(0,0,0,0.5)] border-white/[0.1]',
  showcase: 'max-w-4xl lg:max-w-5xl rounded-2xl shadow-[0_16px_80px_rgba(0,0,0,0.45)] border-white/[0.09]',
  feature: 'max-w-3xl lg:max-w-4xl rounded-xl shadow-[0_12px_56px_rgba(0,0,0,0.4)]',
  bento: 'max-w-full rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]',
};

/** Legible marketing asset frame — full width for hero, never crops UI. */
export function MarketingMediaFrame({
  src,
  alt,
  mediaType,
  className,
  priority = false,
  variant = 'feature',
}: Props) {
  const isHero = variant === 'hero-full';

  return (
    <div
      className={cn(
        'relative overflow-hidden border bg-white/[0.03] backdrop-blur-md',
        FRAME_SHELL[variant],
        !isHero && 'mx-auto w-full',
        className
      )}
    >
      <div
        className={cn(
          'relative flex items-center justify-center bg-gradient-to-b from-black/15 to-black/45',
          isHero ? 'px-1 py-1 sm:px-2 sm:py-2' : 'px-2 py-2 sm:px-3 sm:py-3'
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(
            'block mx-auto',
            isHero ? 'w-full h-auto max-h-[min(72vh,680px)] object-cover object-top' : 'object-contain object-center',
            !isHero && FRAME_MAX[variant]
          )}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/[0.04] via-transparent to-emerald-400/[0.03]" />
    </div>
  );
}
