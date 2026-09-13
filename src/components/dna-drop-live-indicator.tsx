'use client';

import { Globe } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { hasActiveDnaDrop } from '@/lib/dna-drop';
import { NoLyricsDnaHint } from '@/components/no-lyrics-dna-hint';
import type { DnaStatus } from '@/lib/types';

const LIVE_TOOLTIP = (
  <>
    <p className="text-[10px] font-bold uppercase text-emerald-300">DNA Drop live</p>
    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
      Public share link is active. Open DNA Drop to update the snapshot or take offline.
    </p>
  </>
);

type DnaDropLiveIndicatorProps = {
  shareId?: string | null;
  dnaStatus?: DnaStatus;
  variant?: 'badge' | 'dot' | 'compact';
  className?: string;
  href?: string;
  showMissing?: boolean;
};

export function DnaDropLiveIndicator({
  shareId,
  dnaStatus,
  variant = 'badge',
  className,
  href,
  showMissing = false,
}: DnaDropLiveIndicatorProps) {
  const live = dnaStatus ? dnaStatus === 'live' : hasActiveDnaDrop(shareId);
  if (!live) return showMissing ? <NoLyricsDnaHint variant="chip" className={className} /> : null;

  const indicator =
    variant === 'dot' ? (
      <span
        className={cn(
          'relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/45 bg-black/85 shadow-[0_0_14px_rgba(34,197,94,0.3)]',
          className
        )}
        aria-label="DNA Drop is live"
      >
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <Globe className="h-3.5 w-3.5 text-emerald-400" />
      </span>
    ) : variant === 'compact' ? (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 pl-1.5 pr-2 py-0.5 shrink-0 overflow-visible [&_svg]:!size-3',
          className
        )}
        aria-label="DNA Drop is live"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <Globe className="h-3 w-3 shrink-0 text-emerald-400" />
      </span>
    ) : (
      <Badge
        variant="outline"
        className={cn(
          'h-5 gap-1 px-1.5 text-[8px] font-bold uppercase tracking-wide border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <Globe className="h-2.5 w-2.5 shrink-0" />
        DNA Live
      </Badge>
    );

  const trigger = href ? (
    <Link
      href={href}
      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      aria-label="Open live DNA page"
      onClick={(event) => event.stopPropagation()}
    >
      {indicator}
    </Link>
  ) : indicator;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          {LIVE_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
