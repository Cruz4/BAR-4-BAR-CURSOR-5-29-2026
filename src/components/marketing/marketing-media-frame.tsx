'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { MarketingMediaType } from '@/lib/marketing-features';

type Props = {
  src: string;
  alt: string;
  mediaType: MarketingMediaType;
  className?: string;
  priority?: boolean;
};

/** Full-width sharp assets — vault glass, no solid slab background. */
export function MarketingMediaFrame({
  src,
  alt,
  mediaType,
  className,
  priority = false,
}: Props) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'border border-white/[0.07] bg-white/[0.025] backdrop-blur-md',
        'shadow-[0_12px_80px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-auto block min-w-0"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={{ imageRendering: 'auto' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/[0.04] via-transparent to-sky-400/[0.03]" />
      {mediaType === 'gif' ? (
        <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-[0.3em] text-primary/50 px-2 py-1 rounded-full border border-primary/15 bg-background/30 backdrop-blur-sm">
          Live
        </div>
      ) : null}
    </div>
  );
}
