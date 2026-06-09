'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  MARKETING_FEATURE_BANDS,
  type MarketingFeatureBand,
  type ShowcaseLayout,
} from '@/lib/marketing-features';
import { MARKETING_BAND_THEMES, type MarketingBandTheme } from '@/lib/marketing-band-themes';
import { MarketingMediaFrame } from '@/components/marketing/marketing-media-frame';
import { StrainPipelineStrip } from '@/components/marketing/strain-pipeline-strip';

const FEATURE_TITLE_CLASS =
  'relative z-[1] font-headline text-2xl md:text-[2.35rem] font-bold uppercase leading-[1.08] tracking-tight overflow-visible';

/** Brush font + bg-clip-text is unreliable — accent parts use solid colors from theme. */
function FeatureTitle({
  theme,
  bandId,
  align,
  isCenter,
}: {
  theme: MarketingBandTheme;
  bandId: string;
  align: 'left' | 'right' | 'center';
  isCenter: boolean;
}) {
  const alignClass = cn(
    isCenter && 'text-center',
    align === 'right' && 'lg:text-right',
    align === 'left' && 'text-left'
  );

  const partClass = (i: number) =>
    cn('inline-block shrink-0 pb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]', theme.titlePartColors[i]);

  if (theme.titleParts.length === 2) {
    return (
      <h3
        className={cn(
          FEATURE_TITLE_CLASS,
          alignClass,
          'flex flex-wrap items-baseline gap-x-2 gap-y-0.5',
          isCenter && 'justify-center',
          align === 'right' && 'lg:justify-end',
          align === 'left' && 'justify-start'
        )}
      >
        <span className={partClass(0)}>{theme.titleParts[0]}</span>
        <span className={partClass(1)}>{theme.titleParts[1]}</span>
      </h3>
    );
  }

  if (theme.titleParts.length === 3) {
    return (
      <h3
        className={cn(
          FEATURE_TITLE_CLASS,
          alignClass,
          'flex flex-wrap items-baseline gap-x-2 gap-y-0.5',
          isCenter && 'justify-center',
          align === 'right' && 'lg:justify-end',
          align === 'left' && 'justify-start'
        )}
      >
        <span className={partClass(0)}>{theme.titleParts[0]}</span>
        <span className={partClass(1)}>{theme.titleParts[1]}</span>
        <span className={partClass(2)}>{theme.titleParts[2]}</span>
      </h3>
    );
  }

  return (
    <h3 className={cn(FEATURE_TITLE_CLASS, alignClass)}>
      {theme.titleParts.map((part, i) => (
        <span key={`${bandId}-title-${i}`} className={partClass(i)}>
          {part}
        </span>
      ))}
    </h3>
  );
}

function FeatureCopy({
  band,
  index,
  align,
}: {
  band: MarketingFeatureBand;
  index: number;
  align: 'left' | 'right' | 'center';
}) {
  const theme = MARKETING_BAND_THEMES[band.id];
  const isCenter = align === 'center';

  if (!theme) return null;

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-5 sm:p-6 md:p-7 overflow-visible',
        theme.panel,
        isCenter ? 'max-w-4xl mx-auto text-center w-full' : 'max-w-2xl w-full',
        align === 'right' && 'lg:ml-auto lg:text-right',
        align === 'left' && 'lg:mr-auto lg:text-left'
      )}
    >
      <div
        aria-hidden
        className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r to-transparent', theme.rule)}
      />

      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-4 font-headline text-[4.5rem] md:text-[5.5rem] font-bold leading-none text-white/[0.04] select-none',
          align === 'right' ? 'right-4' : 'left-4',
          isCenter && 'left-1/2 -translate-x-1/2'
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div
        className={cn(
          'flex items-center gap-3 mb-4 relative z-[1]',
          align === 'right' && 'lg:flex-row-reverse lg:justify-end',
          isCenter && 'justify-center'
        )}
      >
        <div className={cn('h-px w-10 bg-gradient-to-r to-transparent shrink-0', theme.rule)} />
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.38em] px-3 py-1 rounded-full border',
            theme.eyebrow
          )}
        >
          {band.eyebrow}
        </p>
      </div>

      <FeatureTitle theme={theme} bandId={band.id} align={align} isCenter={isCenter} />

      <p
        className={cn(
          'relative z-[1] mt-4 text-sm md:text-base font-code leading-[1.75] font-medium',
          theme.description,
          isCenter && 'mx-auto',
          align === 'right' && 'lg:ml-auto'
        )}
      >
        {band.description}
      </p>

      <ul
        className={cn(
          'relative z-[1] mt-5 space-y-2.5',
          align === 'right' && 'lg:ml-auto',
          isCenter && 'text-left max-w-lg mx-auto'
        )}
      >
        {band.bullets.map((bullet, bulletIdx) => (
          <li
            key={bullet}
            className={cn(
              'flex items-start gap-3 text-[13px] md:text-sm font-code leading-relaxed pl-3 border-l-2',
              theme.bulletRails[bulletIdx] ?? theme.bulletRails[0],
              align === 'right' && 'lg:flex-row-reverse lg:text-right lg:border-l-0 lg:border-r-2 lg:pr-3 lg:pl-0'
            )}
          >
            <span
              className={cn(
                'text-[10px] font-mono font-bold mt-0.5 shrink-0 tabular-nums',
                theme.bulletNums[bulletIdx] ?? theme.bulletNums[0]
              )}
            >
              {String(bulletIdx + 1).padStart(2, '0')}
            </span>
            <span className={theme.bulletText[bulletIdx] ?? theme.bulletText[0]}>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureRow({
  band,
  index,
  layout,
}: {
  band: MarketingFeatureBand;
  index: number;
  layout: ShowcaseLayout;
}) {
  const reverse = layout === 'split-reverse';
  const isHeroStack = layout === 'hero-stack';

  if (isHeroStack) {
    return (
      <article className="space-y-6 lg:space-y-8">
        <FeatureCopy band={band} index={index} align="center" />
        <MarketingMediaFrame
          src={band.mediaSrc}
          alt={band.mediaAlt}
          mediaType={band.mediaType}
          variant="hero-full"
          priority
        />
      </article>
    );
  }

  return (
    <article
      className={cn(
        'grid gap-8 lg:gap-10 items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]',
        reverse && 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1'
      )}
    >
      <div className="min-w-0 overflow-visible">
        <FeatureCopy band={band} index={index} align={reverse ? 'right' : 'left'} />
      </div>
      <MarketingMediaFrame
        src={band.mediaSrc}
        alt={band.mediaAlt}
        mediaType={band.mediaType}
        variant={band.mediaVariant ?? 'feature'}
        priority={index < 3}
      />
    </article>
  );
}

function BentoGroup({ bands, startIndex }: { bands: MarketingFeatureBand[]; startIndex: number }) {
  return (
    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
      {bands.map((band, i) => (
        <article key={band.id} className="flex flex-col gap-5">
          <FeatureCopy band={band} index={startIndex + i} align="left" />
          <MarketingMediaFrame
            src={band.mediaSrc}
            alt={band.mediaAlt}
            mediaType={band.mediaType}
            variant="bento"
            className="mt-auto"
          />
        </article>
      ))}
    </div>
  );
}

export function FeatureShowcaseSection() {
  const bentoBands = MARKETING_FEATURE_BANDS.filter((b) => b.layout === 'bento');
  const rowBands = MARKETING_FEATURE_BANDS.filter((b) => b.layout !== 'bento');

  return (
    <section id="features" className="py-12 px-4 relative z-10">
      <div className="container mx-auto max-w-6xl space-y-14">
        {/* Studio infrastructure FIRST — rhyme storage & load */}
        {bentoBands.length > 0 ? (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-amber-500/35 px-5 py-1.5 rounded-full">
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-300">
                  Studio infrastructure
                </span>
              </div>
              <h2 className="font-headline text-3xl md:text-[2.75rem] font-bold uppercase tracking-tight text-white leading-[0.92]">
                Your Rhymes.
                <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200">
                  Always Loaded.
                </span>
              </h2>
              <p className="font-code text-amber-100/80 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                Bar 4 Bar is a studio app — store bars, poems, loose lines, and half-baked hooks. Jot something down
                now, load it back when you are ready to digest, remix, or chase the next bar.
              </p>
            </div>
            <BentoGroup bands={bentoBands} startIndex={MARKETING_FEATURE_BANDS.indexOf(bentoBands[0])} />
          </div>
        ) : null}

        <div className="h-px w-full max-w-2xl mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Strain engine — DNA decode / save / remix */}
        <div className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-violet-500/35 px-5 py-1.5 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-violet-300">
                Creative DNA engine
              </span>
            </div>
            <h2 className="font-headline text-3xl md:text-[2.85rem] font-bold uppercase tracking-tight leading-[0.92]">
              <span className="text-violet-200">Strains First.</span>
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-primary to-sky-300">
                Bars Follow.
              </span>
            </h2>
            <p className="font-code text-violet-100/75 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              Decode creative DNA, save strains to your vault, mix across albums, then write bar-by-bar — not generic
              chat output.
            </p>
          </div>

          <StrainPipelineStrip />

          <div className="space-y-14 lg:space-y-16">
            {rowBands.map((band) => {
              const index = MARKETING_FEATURE_BANDS.indexOf(band);
              return <FeatureRow key={band.id} band={band} index={index} layout={band.layout} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
