'use client';

/**
 * The Imprint — Pro faders, shuffle, and lock slots for booth composer.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, LockOpen, Shuffle, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  QUOTE_PRESS_SLOT_LIMIT,
  quotePressSlotLabel,
  randomQuotePressFaders,
  type QuotePressFaders,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';

const FADER_META: Array<{ key: keyof QuotePressFaders; label: string; low: string; high: string }> = [
  { key: 'heat', label: 'Color', low: 'washed', high: 'vivid' },
  { key: 'grain', label: 'Texture', low: 'clean', high: 'gritty' },
  { key: 'pace', label: 'Rhythm', low: 'calm', high: 'tight' },
  { key: 'ink', label: 'Depth', low: 'lifted', high: 'deep night' },
];

type QuotePressComposerPanelProps = {
  faders: QuotePressFaders;
  onFadersChange: (next: QuotePressFaders) => void;
  slots: QuotePressSlot[];
  onLockSlot: () => void;
  onLoadSlot: (slot: QuotePressSlot) => void;
  onClearSlot: (slotId: string) => void;
  isPro: boolean;
  busy?: boolean;
  className?: string;
};

export function QuotePressComposerPanel({
  faders,
  onFadersChange,
  slots,
  onLockSlot,
  onLoadSlot,
  onClearSlot,
  isPro,
  busy,
  className,
}: QuotePressComposerPanelProps) {
  const [open, setOpen] = useState(false);
  const canLock = isPro && slots.length < QUOTE_PRESS_SLOT_LIMIT;

  return (
    <div className={cn('space-y-2 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] p-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Imprint mix
          <span className="text-muted-foreground/70">{open ? '▲' : '▼'}</span>
        </button>
        {isPro ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[9px] font-bold uppercase"
            disabled={busy}
            onClick={() => onFadersChange(randomQuotePressFaders())}
          >
            <Shuffle className="h-3 w-3" /> Shuffle
          </Button>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            <Link href="/pricing" className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
              Pro
            </Link>
            {' '}unlocks faders, shuffle, and saved style slots.
          </p>
        )}
      </div>

      {open ? (
        <div className="space-y-3">
          {isPro ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {FADER_META.map((fader) => (
                  <div key={fader.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">
                        {fader.label}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                        {fader.low} ⟷ {fader.high}
                      </span>
                    </div>
                    <Slider
                      value={[faders[fader.key]]}
                      min={0}
                      max={100}
                      step={1}
                      disabled={busy}
                      onValueChange={([value]) =>
                        onFadersChange({ ...faders, [fader.key]: value })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 font-bold uppercase"
                  disabled={busy || !canLock}
                  onClick={onLockSlot}
                >
                  <Lock className="h-3.5 w-3.5" /> Lock style
                </Button>
                {slots.length >= QUOTE_PRESS_SLOT_LIMIT ? (
                  <span className="text-[9px] text-muted-foreground">Slot vault full ({QUOTE_PRESS_SLOT_LIMIT})</span>
                ) : null}
              </div>
              {slots.length ? (
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
            </>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Your imprint style is pressed from the words you type. Studio Pro lets you remix color, texture, rhythm,
              and depth — then lock up to five looks.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
