'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Dna } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { proLockShell, proLockText } from '@/lib/pro-lock';

type LyricsDnaStatusBadgeProps = {
  /** Lyric snapshot exists on this song (strand bars or live drop). */
  attached: boolean;
  /** Pro (or owner) can open the drop. */
  openHref?: string;
  /** Guest or free member — sign-in or Studio upgrade. */
  lockedHref?: string;
  className?: string;
  /** Larger title-row treatment on pressed song pages. */
  variant?: 'chip' | 'title';
};

const NONE_LABEL = 'No Lyrics DNA Attached';
const OPEN_LABEL = 'Lyric DNA Drop';
const LOCKED_LABEL = 'Lyrics DNA';

const noneTooltip =
  'This song has no published lyric snapshot or Creative DNA strand on its release page.';
const lockedTooltip =
  'Studio Pro opens Lyrics DNA Drops — read lyrics, structure, and Creative DNA, or import into your vault.';
const openTooltip = 'Open this song’s Lyrics DNA Drop';

/** Song page: lit link when Pro can open; fuchsia Pro CTA when a strand exists but tier blocks access. */
export function LyricsDnaStatusBadge({
  attached,
  openHref,
  lockedHref,
  className,
  variant = 'chip',
}: LyricsDnaStatusBadgeProps) {
  const isTitle = variant === 'title';
  const baseClass = cn(
    'inline-flex items-center gap-1.5 rounded-full border font-bold uppercase',
    isTitle
      ? 'px-3 py-1.5 text-[10px] tracking-[0.18em] sm:text-[11px]'
      : 'gap-1 px-2 py-0.5 text-[8px] tracking-[0.16em]'
  );

  const wrapTooltip = (node: ReactNode, tip: string) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[16rem] text-[11px] leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (!attached) {
    return wrapTooltip(
      <span
        className={cn(
          baseClass,
          'cursor-default border-white/12 bg-white/5 text-muted-foreground/55',
          className
        )}
        aria-disabled="true"
      >
        <Dna className={cn('shrink-0 opacity-50', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
        {NONE_LABEL}
      </span>,
      noneTooltip
    );
  }

  if (openHref) {
    return wrapTooltip(
      <Link
        href={openHref}
        className={cn(
          baseClass,
          'border-cyan-400/55 bg-cyan-400/12 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)] transition-colors hover:border-cyan-300/75 hover:bg-cyan-400/22',
          className
        )}
      >
        <Dna className={cn('shrink-0', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
        {OPEN_LABEL}
      </Link>,
      openTooltip
    );
  }

  if (lockedHref) {
    return wrapTooltip(
      <Link
        href={lockedHref}
        className={cn(
          baseClass,
          proLockShell(isTitle ? 'md' : 'sm'),
          'border-dashed text-pink-200 transition-colors hover:border-pink-400/70 hover:bg-pink-600/20',
          proLockText(),
          className
        )}
      >
        <Dna className={cn('shrink-0', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
        {LOCKED_LABEL}
      </Link>,
      lockedTooltip
    );
  }

  return wrapTooltip(
    <span
      className={cn(
        baseClass,
        'cursor-default border-white/12 bg-white/5 text-muted-foreground/55',
        className
      )}
      aria-disabled="true"
    >
      <Dna className={cn('shrink-0 opacity-50', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      {OPEN_LABEL}
    </span>,
    lockedTooltip
  );
}
