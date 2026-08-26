'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const LIVE_TOOLTIP = (
  <>
    <p className="text-[10px] font-bold uppercase text-violet-300">Collab Sheet live</p>
    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
      Friends can edit this sheet with you in real time. Open Collab Sheet to manage access.
    </p>
  </>
);

export function CollabSheetLiveIndicator({
  collabSheetId,
  variant = 'badge',
  className,
}: {
  collabSheetId?: string | null;
  variant?: 'badge' | 'dot' | 'compact';
  className?: string;
}) {
  if (!collabSheetId) return null;

  const indicator =
    variant === 'dot' ? (
      <span
        className={cn(
          'relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-500/45 bg-black/85 shadow-[0_0_14px_rgba(139,92,246,0.3)]',
          className
        )}
        aria-label="Collab Sheet is live"
      >
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        <Users className="h-3.5 w-3.5 text-violet-300" />
      </span>
    ) : variant === 'compact' ? (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-violet-500/35 bg-violet-500/10 pl-1.5 pr-2 py-0.5 shrink-0',
          className
        )}
        aria-label="Collab Sheet is live"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
        <Users className="h-3 w-3 shrink-0 text-violet-300" />
      </span>
    ) : (
      <Badge
        variant="outline"
        className={cn(
          'h-5 gap-1 px-1.5 text-[8px] font-bold uppercase tracking-wide border-violet-500/40 bg-violet-500/10 text-violet-200 shrink-0',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
        <Users className="h-2.5 w-2.5 shrink-0" />
        Collab
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
