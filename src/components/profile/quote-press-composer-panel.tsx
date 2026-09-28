'use client';

/**
 * The Imprint — shuffle for everyone, lock slots for paid Pro.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, LockOpen, Shuffle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  QUOTE_PRESS_SLOT_LIMIT,
  allocateQuotePressSlotLabel,
  quotePressSlotLabel,
  type QuotePressFaders,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';
import { IMPRINT_LOCK_UPGRADE_PATH } from '@/lib/imprint-lock-access';
import { isProUser } from '@/lib/subscription';

type QuotePressComposerPanelProps = {
  slots: QuotePressSlot[];
  faders: QuotePressFaders;
  onShuffle: () => void;
  shuffleRemaining: number;
  shuffleCap: number;
  onLockSlot: (label: string) => void;
  onLoadSlot: (slot: QuotePressSlot) => void;
  onClearSlot: (slotId: string) => void;
  isPro: boolean;
  busy?: boolean;
  className?: string;
};

export function QuotePressComposerPanel({
  slots,
  faders,
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
  const router = useRouter();
  const paidPro = isPro && isProUser(user);
  const canLock = paidPro && slots.length < QUOTE_PRESS_SLOT_LIMIT;
  const shufflesLeft = `${shuffleRemaining}/${shuffleCap} left`;
  const [savedExpanded, setSavedExpanded] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockName, setLockName] = useState('');
  const showSavedToggle = paidPro && slots.length > 0;

  const openLockDialog = () => {
    setLockName(allocateQuotePressSlotLabel(slots, faders));
    setLockDialogOpen(true);
  };

  const confirmLock = () => {
    const trimmed = lockName.trim().slice(0, 48);
    const label = trimmed || allocateQuotePressSlotLabel(slots, faders);
    setLockDialogOpen(false);
    onLockSlot(label);
  };

  const handleLockClick = () => {
    if (!paidPro) {
      router.push(IMPRINT_LOCK_UPGRADE_PATH);
      return;
    }
    if (!canLock) return;
    openLockDialog();
  };

  return (
    <>
      <div
        className={cn(
          'rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] p-2.5',
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1 px-2 text-[9px] font-bold uppercase"
            disabled={busy || shuffleRemaining <= 0}
            onClick={onShuffle}
          >
            <Shuffle className="h-3 w-3" /> Shuffle
          </Button>
          <Hint content="Each shuffle comes back 24 hours after you use it.">
            <span className="cursor-default whitespace-nowrap text-[10px] font-medium tabular-nums text-white/45">
              {shufflesLeft}
            </span>
          </Hint>
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="sm"
              className={cn(
                'h-7 shrink-0 gap-1 px-2 text-[9px] font-bold uppercase',
                paidPro
                  ? 'border border-accent/25 bg-accent/12 text-accent/90 shadow-none hover:bg-accent/18'
                  : 'border border-dashed border-accent/50 bg-accent/[0.06] text-accent/85 hover:bg-accent/10'
              )}
              disabled={busy || (paidPro && !canLock)}
              onClick={handleLockClick}
              title={
                !paidPro
                  ? 'Studio Pro — lock and reload imprint styles'
                  : slots.length >= QUOTE_PRESS_SLOT_LIMIT
                    ? `${QUOTE_PRESS_SLOT_LIMIT} locks max`
                    : 'Save this look'
              }
            >
              <Lock className="h-3 w-3" /> Lock style
            </Button>
            {showSavedToggle ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 p-0 text-white/50 hover:text-white"
                disabled={busy}
                onClick={() => setSavedExpanded((v) => !v)}
                aria-expanded={savedExpanded}
                aria-label={
                  savedExpanded
                    ? `Hide ${slots.length} saved styles`
                    : `Show ${slots.length} saved styles`
                }
                title={savedExpanded ? 'Hide saved styles' : `Saved styles (${slots.length})`}
              >
                {savedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>
        </div>
        {paidPro && savedExpanded && slots.length > 0 ? (
          <ul className="mt-2 space-y-1.5 border-t border-cyan-500/20 pt-2">
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

      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">Lock this imprint</DialogTitle>
            <DialogDescription className="text-xs">
              Name it anything — we suggest a unique label. You can lock up to {QUOTE_PRESS_SLOT_LIMIT}{' '}
              styles on Pro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="imprint-lock-name" className="text-xs">Style name</Label>
            <Input
              id="imprint-lock-name"
              value={lockName}
              onChange={(e) => setLockName(e.target.value)}
              maxLength={48}
              placeholder="e.g. Midnight Press"
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmLock();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setLockDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-accent hover:bg-accent/90" onClick={confirmLock}>
              Lock style
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
