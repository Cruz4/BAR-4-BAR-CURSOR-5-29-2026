'use client';

/**
 * The Imprint — shuffle for everyone, lock slots for paid Pro.
 */

import React from 'react';
import { Lock, LockOpen, Shuffle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  QUOTE_PRESS_SLOT_LIMIT,
  quotePressSlotLabel,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';
import { isProUser } from '@/lib/subscription';

type QuotePressComposerPanelProps = {
  slots: QuotePressSlot[];
  onShuffle: () => void;
  shuffleRemaining: number;
  shuffleCap: number;
  onLockSlot: () => void;
  onLoadSlot: (slot: QuotePressSlot) => void;
  onClearSlot: (slotId: string) => void;
  isPro: boolean;
  busy?: boolean;
  className?: string;
};

export function QuotePressComposerPanel({
  slots,
  onShuffle,
  shuffleRemaining,
  shuffleCap,
  onLockSlot,
  onLoadSlot,
  onClearSlot,
  isPro,
  busy,
  className,
}: QuotePressComposerPanelProps) {
  const { user } = useAuth();
  const paidPro = isPro && isProUser(user);
  const canLock = paidPro && slots.length < QUOTE_PRESS_SLOT_LIMIT;
  const shufflesLeft = `${shuffleRemaining}/${shuffleCap} left`;

  return (
    <div className={cn('space-y-2 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] p-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[9px] font-bold uppercase"
          disabled={busy || shuffleRemaining <= 0}
          onClick={onShuffle}
        >
          <Shuffle className="h-3 w-3" /> Shuffle
        </Button>
        <Hint content="Each shuffle comes back 24 hours after you use it.">
          <span className="cursor-default text-[10px] font-medium tabular-nums text-white/45">
            {shufflesLeft}
          </span>
        </Hint>
        {paidPro ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[9px] font-bold uppercase"
            disabled={busy || !canLock}
            onClick={onLockSlot}
          >
            <Lock className="h-3 w-3" /> Lock style
          </Button>
        ) : null}
        {paidPro && slots.length >= QUOTE_PRESS_SLOT_LIMIT ? (
          <span className="text-[9px] text-muted-foreground">{QUOTE_PRESS_SLOT_LIMIT} locks max</span>
        ) : null}
      </div>
      {paidPro && slots.length ? (
        <ul className="space-y-1.5">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-1.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left text-[10px] font-semibold text-white/90 hover:text-cyan-200"
                disabled={busy}
                onClick={() => onLoadSlot(slot)}
              >
                <LockOpen className="mr-1 inline h-3 w-3 text-cyan-400" />
                {slot.label || quotePressSlotLabel(slot.faders)}
              </button>
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-red-400"
                disabled={busy}
                onClick={() => onClearSlot(slot.id)}
                aria-label="Remove locked style"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
