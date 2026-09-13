'use client';

import { FileText } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const NO_LYRICS_DNA_LABEL = 'No Lyrics DNA attached';

export function NoLyricsDnaHint({
  variant = 'note',
  className,
}: {
  variant?: 'note' | 'chip';
  className?: string;
}) {
  if (variant === 'chip') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className={cn(
                'inline-flex cursor-default items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground',
                className
              )}
            >
              <FileText className="h-2.5 w-2.5" /> No DNA
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <p className="text-[10px] font-bold uppercase">{NO_LYRICS_DNA_LABEL}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              This song is music-only. DNA Drop lyrics are a separate Pro page.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <p
      className={cn(
        'rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground',
        className
      )}
    >
      <span className="font-bold uppercase tracking-wider text-fuchsia-200">{NO_LYRICS_DNA_LABEL}</span>
      {' '}(Pro) · Music still publishes. Add a lyric DNA Drop later from The Vault if you want.
    </p>
  );
}
