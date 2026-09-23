'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeAlbumMotifDebts,
  collectAlbumMotifPromises,
  type AlbumMotifDebt,
} from '@/lib/album-motif-debts';
import type { Album, Track } from '@/lib/types';
import { Hint } from '@/components/ui/tooltip';

type AlbumMotifDebtsPanelProps = {
  album: Album;
  track: Track;
  onAddToIntents?: (motif: string) => void;
  compact?: boolean;
  className?: string;
};

function statusBadge(debt: AlbumMotifDebt) {
  if (debt.status === 'here') {
    return (
      <Badge className="text-[8px] h-5 px-1.5 uppercase bg-green-600/20 text-green-400 border-green-500/30">
        This sheet
      </Badge>
    );
  }
  if (debt.status === 'elsewhere') {
    const where = debt.trackTitles.slice(0, 2).join(', ');
    const more = debt.trackTitles.length > 2 ? ` +${debt.trackTitles.length - 2}` : '';
    return (
      <Badge className="text-[8px] h-5 px-1.5 uppercase bg-amber-600/15 text-amber-300 border-amber-500/25 max-w-[9rem] truncate">
        On {where}{more}
      </Badge>
    );
  }
  return (
    <Badge className="text-[8px] h-5 px-1.5 uppercase bg-violet-600/20 text-violet-300 border-violet-500/30">
      Open
    </Badge>
  );
}

export function AlbumMotifDebtsPanel({
  album,
  track,
  onAddToIntents,
  compact = false,
  className,
}: AlbumMotifDebtsPanelProps) {
  const promises = useMemo(() => collectAlbumMotifPromises(album), [album]);
  const debts = useMemo(() => computeAlbumMotifDebts(album, track.id), [album, track.id]);

  if (!promises.length) return null;

  const openCount = debts.filter((d) => d.status === 'open').length;

  return (
    <div
      className={cn(
        'rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 space-y-2',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">
            Album motif ledger
          </p>
          <p className="text-[9px] text-muted-foreground leading-snug mt-0.5">
            {compact
              ? 'Promises vs lyrics — open means not written on the album yet.'
              : 'What the album promised vs what lyrics actually use. Open = nowhere on the album yet (not a command to repeat lines).'}
          </p>
        </div>
        {openCount > 0 ? (
          <Badge variant="outline" className="text-[8px] shrink-0 border-violet-500/40 text-violet-300">
            {openCount} open
          </Badge>
        ) : null}
      </div>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto studio-scrollbar">
        {debts.map((debt) => (
          <li
            key={debt.motif}
            className="flex items-start gap-2 justify-between rounded-md bg-background/30 px-2 py-1.5 border border-white/5"
          >
            <span className="text-[11px] font-code text-foreground/90 leading-snug min-w-0 break-words flex-1">
              {debt.motif}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {statusBadge(debt)}
              {onAddToIntents && debt.status !== 'here' ? (
                <Hint actionSafe content={<p className="text-[10px] font-bold">Add to this track&apos;s Intents</p>}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-sky-500 hover:bg-sky-500/10"
                    aria-label={`Add ${debt.motif} to intents`}
                    onClick={() => onAddToIntents(debt.motif)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                </Hint>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
