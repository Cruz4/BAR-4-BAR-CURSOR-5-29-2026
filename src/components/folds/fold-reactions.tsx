'use client';

import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reactToFoldBarClient } from '@/lib/folds/client';
import {
  FOLD_REACTION_EMOJI,
  FOLD_REACTION_KINDS,
  type FoldReactionKind,
} from '@/lib/folds/attachments';
import { cn } from '@/lib/utils';

export function FoldReactions({
  foldId,
  barId,
  reactions,
  viewerId,
  mine,
}: {
  foldId: string;
  barId: string;
  reactions?: Record<string, FoldReactionKind>;
  viewerId: string;
  mine: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mineKind = reactions?.[viewerId];
  const counts = FOLD_REACTION_KINDS.map((kind) => ({
    kind,
    count: Object.values(reactions || {}).filter((value) => value === kind).length,
  })).filter((row) => row.count > 0);

  const react = async (kind: FoldReactionKind) => {
    if (busy) return;
    setBusy(true);
    try {
      await reactToFoldBarClient({ foldId, barId, kind });
      setOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not react',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('mt-1 flex flex-wrap items-center gap-1', mine ? 'justify-end' : 'justify-start')}>
      {counts.map((row) => (
        <button
          key={row.kind}
          type="button"
          disabled={busy}
          onClick={() => void react(row.kind)}
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] leading-none',
            mineKind === row.kind
              ? 'border-amber-300/50 bg-amber-400/15'
              : 'border-white/10 bg-black/20 hover:border-amber-300/30'
          )}
          aria-label={`${FOLD_REACTION_EMOJI[row.kind]} ${row.count}`}
        >
          <span>{FOLD_REACTION_EMOJI[row.kind]}</span>
          <span className="font-code text-[9px] text-amber-100/70">{row.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-amber-200/50 hover:border-amber-300/40 hover:text-amber-100"
          aria-label="React"
        >
          <SmilePlus className="h-3 w-3" />
        </button>
        {open ? (
          <div
            className={cn(
              'absolute z-20 flex gap-0.5 rounded-full border border-amber-400/25 bg-[#120e0a]/95 p-1 shadow-xl',
              mine ? 'right-0' : 'left-0',
              'bottom-7'
            )}
          >
            {FOLD_REACTION_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={busy}
                onClick={() => void react(kind)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-white/10',
                  mineKind === kind && 'bg-amber-400/20'
                )}
                aria-label={FOLD_REACTION_EMOJI[kind]}
              >
                {FOLD_REACTION_EMOJI[kind]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
