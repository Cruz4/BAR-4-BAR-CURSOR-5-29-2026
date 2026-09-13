'use client';

import { FileText } from 'lucide-react';
import { Hint } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const NO_LYRICS_DNA_LABEL = 'No Lyrics DNA attached';

const HINT = (
  <div className="max-w-[220px] space-y-0.5">
    <p className="text-[10px] font-bold uppercase">{NO_LYRICS_DNA_LABEL}</p>
    <p className="text-[10px] leading-relaxed text-muted-foreground">
      This song is music-only. DNA Drop lyrics are a separate Pro page.
    </p>
  </div>
);

export function NoLyricsDnaHint({
  variant = 'chip',
  className,
}: {
  variant?: 'note' | 'chip';
  className?: string;
}) {
  return (
    <Hint content={HINT} side="top">
      <button
        type="button"
        className={cn(
          'inline-flex cursor-default items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground',
          variant === 'note' && 'px-2.5 py-1 text-[10px]',
          className
        )}
      >
        <FileText className="h-2.5 w-2.5" /> No DNA
      </button>
    </Hint>
  );
}
