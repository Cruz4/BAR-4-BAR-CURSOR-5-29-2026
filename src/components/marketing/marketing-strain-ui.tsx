'use client';

import React from 'react';
import {
  ArrowRightLeft,
  Compass,
  Fingerprint,
  Link2,
  Target,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getStrainDestinationTheme } from '@/lib/dna-strands';
import type { WizardAnalysis } from '@/lib/types';

export function MarketingDestinationPill({ title, legible }: { title: string; legible?: boolean }) {
  const theme = getStrainDestinationTheme(title);
  return (
    <span
      className={cn(
        'inline-flex font-bold uppercase px-2 py-0.5 rounded-full border',
        legible ? 'text-[11px] tracking-[0.12em]' : 'text-[9px] tracking-[0.14em]',
        theme.badgeBg,
        theme.badgeBorder,
        theme.pill
      )}
    >
      → {theme.hubSection ?? theme.hubField ?? 'Hub'}
    </span>
  );
}

export function MarketingInjectButton({
  title,
  size = 'sm',
  pulse,
}: {
  title: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}) {
  const theme = getStrainDestinationTheme(title);
  return (
    <button
      type="button"
      className={cn(
        'rounded-full border flex items-center justify-center shrink-0 transition-colors',
        theme.inject,
        theme.injectHover,
        theme.badgeBorder,
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        pulse && 'ring-2 ring-primary/50 animate-pulse'
      )}
      aria-label={`Inject ${title}`}
    >
      <Zap className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </button>
  );
}

export function MarketingBadgeStrainCard({
  title,
  badges,
  icon: Icon,
  highlight,
  legible,
}: {
  title: string;
  badges: string[];
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  legible?: boolean;
}) {
  const theme = getStrainDestinationTheme(title);
  return (
    <Card
      className={cn(
        'p-4 space-y-3 border shadow-lg h-full flex flex-col',
        theme.cardBg,
        theme.cardBorder,
        highlight && 'ring-1 ring-primary/40'
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1.5 min-w-0">
          <div className={cn('flex items-center gap-2', theme.icon)}>
            <Icon className="h-4 w-4 shrink-0" />
            <h5
              className={cn(
                'font-bold uppercase',
                legible ? 'text-sm tracking-[0.14em]' : 'text-[11px] tracking-[0.18em]',
                theme.title
              )}
            >
              {title}
            </h5>
          </div>
          <MarketingDestinationPill title={title} legible={legible} />
        </div>
        <MarketingInjectButton title={title} pulse={highlight} />
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Badge
            key={badge}
            variant="outline"
            className={cn(
              'font-bold uppercase py-1 px-2.5',
              legible ? 'text-xs' : 'text-[10px]',
              theme.badgeBg,
              theme.badgeBorder,
              theme.badgeText
            )}
          >
            {badge}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

export function MarketingExpandedStrainCard({
  title,
  content,
  icon: Icon,
  highlight,
  legible,
}: {
  title: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  legible?: boolean;
}) {
  const theme = getStrainDestinationTheme(title);
  return (
    <Card
      className={cn(
        'p-4 space-y-3 border shadow-lg h-full flex flex-col',
        theme.cardBg,
        theme.cardBorder,
        highlight && 'ring-1 ring-primary/40'
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1.5 min-w-0">
          <div className={cn('flex items-center gap-2', theme.icon)}>
            <Icon className="h-4 w-4 shrink-0" />
            <h5
              className={cn(
                'font-bold uppercase',
                legible ? 'text-sm tracking-[0.14em]' : 'text-[11px] tracking-[0.18em]',
                theme.title
              )}
            >
              {title}
            </h5>
          </div>
          <MarketingDestinationPill title={title} legible={legible} />
        </div>
        <MarketingInjectButton title={title} pulse={highlight} />
      </div>
      <p
        className={cn(
          'font-code font-bold italic leading-relaxed opacity-90',
          legible ? 'text-base' : 'text-sm',
          theme.title
        )}
      >
        &ldquo;{content}&rdquo;
      </p>
    </Card>
  );
}

export function MarketingStyleStrainCard({ analysis, legible }: { analysis: WizardAnalysis; legible?: boolean }) {
  const theme = getStrainDestinationTheme('Style');
  const metrics = analysis.styleMetrics!;
  return (
    <Card className={cn('p-4 space-y-3 border shadow-lg flex flex-col', theme.cardBg, theme.cardBorder)}>
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1.5 min-w-0">
          <div className={cn('flex items-center gap-2', theme.icon)}>
            <Fingerprint className="h-4 w-4 shrink-0" />
            <h5
              className={cn(
                'font-bold uppercase',
                legible ? 'text-sm tracking-[0.14em]' : 'text-[11px] tracking-[0.18em]',
                theme.title
              )}
            >
              Style
            </h5>
          </div>
          <MarketingDestinationPill title="Style" legible={legible} />
        </div>
        <MarketingInjectButton title="Style" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className={cn('font-bold uppercase', legible ? 'text-[11px]' : 'text-[9px]', theme.pill)}>
            Vocab · {metrics.vocabularyScore}
          </p>
          <Progress value={metrics.vocabularyScore} className="h-1.5 bg-fuchsia-500/10" />
        </div>
        <div className="space-y-1">
          <p className={cn('font-bold uppercase', legible ? 'text-[11px]' : 'text-[9px]', theme.pill)}>
            Rhyme · {metrics.rhymeComplexity}
          </p>
          <Progress value={metrics.rhymeComplexity} className="h-1.5 bg-fuchsia-500/10" />
        </div>
      </div>
      <p
        className={cn(
          'font-code font-bold italic leading-relaxed opacity-90',
          legible ? 'text-base' : 'text-sm',
          theme.title
        )}
      >
        &ldquo;{analysis.styleAnalysis}&rdquo;
      </p>
    </Card>
  );
}

/** Full decoded strain grid — mirrors Calibration Hub analysis layout. */
export function MarketingDecodedStrainGrid({
  analysis,
  highlightTitle,
  legible,
}: {
  analysis: WizardAnalysis;
  highlightTitle?: string;
  /** Larger type for GIF capture routes — does not affect landing screenshots. */
  legible?: boolean;
}) {
  const emotion = [analysis.emotionalTone.primaryEmotion, analysis.emotionalTone.secondaryEmotion]
    .filter(Boolean)
    .join(' / ');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MarketingBadgeStrainCard
          title="Themes"
          badges={analysis.themes}
          icon={Link2}
          highlight={highlightTitle === 'Themes'}
          legible={legible}
        />
        <MarketingBadgeStrainCard
          title="Motifs"
          badges={analysis.motifs}
          icon={Target}
          highlight={highlightTitle === 'Motifs'}
          legible={legible}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-7">
          <MarketingExpandedStrainCard
            title="Shift"
            content={analysis.emotionalShift}
            icon={ArrowRightLeft}
            highlight={highlightTitle === 'Shift'}
            legible={legible}
          />
        </div>
        <div className="md:col-span-5">
          <MarketingExpandedStrainCard
            title="Emotion"
            content={emotion}
            icon={Compass}
            highlight={highlightTitle === 'Emotion'}
            legible={legible}
          />
        </div>
      </div>
      <MarketingStyleStrainCard analysis={analysis} legible={legible} />
    </div>
  );
}
