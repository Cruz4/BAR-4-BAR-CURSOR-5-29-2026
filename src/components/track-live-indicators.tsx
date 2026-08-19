'use client';

import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DnaDropLiveIndicator } from '@/components/dna-drop-live-indicator';
import { CollabSheetLiveIndicator } from '@/components/collab-sheet/collab-sheet-live-indicator';
import { FirstDropLiveIndicator } from '@/components/first-drop-live-indicator';
import type { Track } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TrackLiveIndicators({
  track,
  variant = 'compact',
  className,
  showComplete = true,
}: {
  track: Track;
  variant?: 'badge' | 'dot' | 'compact';
  className?: string;
  showComplete?: boolean;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <DnaDropLiveIndicator shareId={track.shareId} variant={variant} />
      <FirstDropLiveIndicator track={track} variant={variant} />
      <CollabSheetLiveIndicator collabSheetId={track.collabSheetId} variant={variant} />
      {showComplete && track.status === 'complete' ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              {variant === 'compact' ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-green-500/35 bg-green-500/10 pl-1.5 pr-2 py-0.5 shrink-0"
                  aria-label="Track marked complete"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
                </span>
              ) : (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 px-1.5 text-[8px] font-bold uppercase tracking-wide border-green-500/40 bg-green-500/10 text-green-300 shrink-0"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                  Done
                </Badge>
              )}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-[10px] font-bold uppercase text-green-300">Track complete</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Marked finished in Track Status.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
