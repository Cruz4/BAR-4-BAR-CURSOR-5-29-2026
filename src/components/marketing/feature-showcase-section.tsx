'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MARKETING_FEATURE_BANDS, type MarketingFeatureBand } from '@/lib/marketing-features';
import { MarketingMediaFrame } from '@/components/marketing/marketing-media-frame';

function splitFeatureTitle(title: string): { lead: string; accent: string | null } {
  if (title.includes('→')) {
    const parts = title.split('→').map((p) => p.trim());
    return { lead: parts.slice(0, -1).join(' → '), accent: parts[parts.length - 1] ?? null };
  }
  const comma = title.indexOf(',');
  if (comma > 0) {
    return { lead: title.slice(0, comma + 1), accent: title.slice(comma + 1).trim() };
  }
  const dot = title.indexOf('.');
  if (dot > 0 && dot < title.length - 2) {
    return { lead: title.slice(0, dot + 1), accent: title.slice(dot + 1).trim() };
  }
  return { lead: title, accent: null };
}

function FeatureBandCopy({ band, index }: { band: MarketingFeatureBand; index: number }) {
  const { lead, accent } = splitFeatureTitle(band.title);
  const alignRight = !!band.reverse;

  return (
    <div
      className={cn(
        'relative max-w-2xl',
        alignRight ? 'lg:ml-auto lg:text-right' : 'lg:mr-auto lg:text-left'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-8 font-headline text-[6.5rem] md:text-[7.5rem] font-bold leading-none text-white/[0.03] select-none',
          alignRight ? 'right-0' : 'left-0'
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className={cn('flex items-center gap-3 mb-6', alignRight && 'lg:flex-row-reverse lg:justify-end')}>
        <div className="h-px w-10 bg-gradient-to-r from-primary/60 to-transparent shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-orange-400/90">{band.eyebrow}</p>
      </div>

      <h3 className="font-headline text-[1.85rem] md:text-[2.5rem] font-bold uppercase leading-[0.94] tracking-tight">
        <span className="block text-white">{lead}</span>
        {accent ? (
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-300 to-primary/75">
            {accent}
          </span>
        ) : null}
      </h3>

      <p
        className={cn(
          'mt-6 text-sm md:text-[15px] font-code leading-[1.8] text-muted-foreground/90 max-w-lg',
          alignRight && 'lg:ml-auto'
        )}
      >
        {band.description}
      </p>

      <ul className={cn('mt-7 space-y-2.5 max-w-lg', alignRight && 'lg:ml-auto')}>
        {band.bullets.map((bullet, bulletIdx) => (
          <li
            key={bullet}
            className={cn(
              'flex items-start gap-3 text-[13px] font-code text-foreground/70 leading-relaxed',
              alignRight && 'lg:flex-row-reverse lg:text-right'
            )}
          >
            <span className="text-[10px] font-mono font-bold text-primary/40 mt-1 shrink-0 tabular-nums">
              {String(bulletIdx + 1).padStart(2, '0')}
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeatureShowcaseSection() {
  return (
    <section id="features" className="py-20 px-4 relative z-10">
      <div className="container mx-auto max-w-6xl space-y-24">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-orange-500/35 px-5 py-1.5 rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Inside the studio</span>
          </div>
          <h2 className="font-headline text-4xl md:text-[3.1rem] font-bold uppercase tracking-tight text-white leading-[0.9] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            Bars In.
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-300 to-primary">
              Chaos Out.
            </span>
          </h2>
          <p className="font-code text-foreground/75 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            The rhyme book and co-writer for artists who think in structure — albums, DNA, guardrails, one bar at a time.
          </p>
        </div>

        {MARKETING_FEATURE_BANDS.map((band, index) => (
          <div key={band.id} className="space-y-8">
            <FeatureBandCopy band={band} index={index} />
            <MarketingMediaFrame
              src={band.mediaSrc}
              alt={band.mediaAlt}
              mediaType={band.mediaType}
              priority={index < 2}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
