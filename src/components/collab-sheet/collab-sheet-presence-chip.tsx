'use client';

import { Users, Radio } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function CollabSheetPresenceChip({
  liveCount,
  totalShared,
  className,
  onClick,
}: {
  liveCount: number;
  totalShared: number;
  className?: string;
  onClick?: () => void;
}) {
  if (totalShared <= 1) return null;

  const label = `${liveCount}/${totalShared}`;

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 font-code text-[10px] font-bold uppercase tracking-wider text-violet-200/90 transition-colors hover:border-violet-300/50 hover:bg-violet-500/15',
              className
            )}
            aria-label={`${liveCount} of ${totalShared} collaborators live on this sheet`}
          >
            <span className="tabular-nums">{label}</span>
            <Users className="h-3 w-3 opacity-80" />
            {liveCount > 0 ? (
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse shrink-0" aria-hidden />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px]">
          <p className="text-[10px] leading-relaxed">
            {liveCount} of {totalShared} people this sheet is shared with {liveCount === 1 ? 'is' : 'are'}{' '}
            active on the sheet right now.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
