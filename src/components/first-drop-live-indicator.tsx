'use client';

import { Disc3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { hasLiveFirstDrop } from '@/lib/track-live-flags';
import type { Track } from '@/lib/types';

const LIVE_TOOLTIP = (
  <>
    <p className="text-[10px] font-bold uppercase text-fuchsia-300">First Drop live</p>
    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
      Song is pressed on your DNA Drop — fans can preview and buy in-app.
    </p>
  </>
);

export function FirstDropLiveIndicator({
  track,
  variant = 'badge',
  className,
}: {
  track: Pick<Track, 'dropAudio' | 'dropRightsAttestedAt' | 'shareId'>;
  variant?: 'badge' | 'dot' | 'compact';
  className?: string;
}) {
  if (!hasLiveFirstDrop(track)) return null;

  const indicator =
    variant === 'dot' ? (
      <span
        className={cn(
          'relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-fuchsia-500/45 bg-black/85 shadow-[0_0_14px_rgba(217,70,239,0.3)]',
          className
        )}
        aria-label="First Drop is live"
      >
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
        <Disc3 className="h-3.5 w-3.5 text-fuchsia-300" />
      </span>
    ) : variant === 'compact' ? (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/10 pl-1.5 pr-2 py-0.5 shrink-0',
          className
        )}
        aria-label="First Drop is live"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse shrink-0" />
        <Disc3 className="h-3 w-3 shrink-0 text-fuchsia-300" />
      </span>
    ) : (
      <Badge
        variant="outline"
        className={cn(
          'h-5 gap-1 px-1.5 text-[8px] font-bold uppercase tracking-wide border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200 shrink-0',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse shrink-0" />
        <Disc3 className="h-2.5 w-2.5 shrink-0" />
        Drop
      </Badge>
    );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          {LIVE_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
