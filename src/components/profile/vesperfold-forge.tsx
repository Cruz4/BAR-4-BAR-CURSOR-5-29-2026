'use client';

/**
 * Edit Public Page — Vesperfold feed-star forge.
 * Generative star = Scene feed chip (+ small badge on Artist Home hero).
 * Hero photo stays separate (square portrait on the profile page).
 * Stock = initials star on the feed when generative is off and there is no photo.
 */

import React, { useState } from 'react';
import { Lock, LockOpen, Shuffle, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { VesperfoldMark } from '@/components/profile/vesperfold-mark';
import {
  VESPERFOLD_SLOT_LIMIT,
  VESPERFOLD_SPACE,
  randomVesperfoldSeed,
  unpackVesperfold,
  type VesperfoldSlot,
} from '@/lib/profile/vesperfold';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/gamification/studio-pass';

type VesperfoldForgeProps = {
  useStar: boolean;
  seed: number;
  slots: VesperfoldSlot[];
  /** Vault slot id pinned as the sticky active star (survives logout). */
  pinnedSlotId?: string | null;
  /** Stage name for the stock initials star preview. */
  displayName?: string;
  /** Custom hero photo — square on the feed when generative is off. */
  photoUrl?: string | null;
  busy?: boolean;
  onToggleUseStar: (useStar: boolean) => void;
  onSeedChange: (seed: number) => void;
  onLockSlot: () => void;
  onLoadSlot: (slot: VesperfoldSlot) => void;
  onPinSlot: (slot: VesperfoldSlot) => void;
  onUnpin: () => void;
  onClearSlot: (slotId: string) => void;
  /** Turn generative off (feed falls back to photo or stock initials). */
  onUseStockStar: () => void;
};

export function VesperfoldForge({
  useStar,
  seed,
  slots,
  pinnedSlotId,
  displayName = 'Artist',
  photoUrl,
  busy,
  onToggleUseStar,
  onSeedChange,
  onLockSlot,
  onLoadSlot,
  onPinSlot,
  onUnpin,
  onClearSlot,
  onUseStockStar,
}: VesperfoldForgeProps) {
  const stack = unpackVesperfold(seed);
  const [justRolled, setJustRolled] = useState(false);
  const pinned = Boolean(pinnedSlotId);
  const canLock =
    useStar &&
    !pinned &&
    slots.length < VESPERFOLD_SLOT_LIMIT &&
    !slots.some((s) => s.seed === seed);
  const hasCustomPhoto = typeof photoUrl === 'string' && photoUrl.trim().length > 0;

  return (
    <section className="space-y-4 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card/80 to-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 font-code text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
            <Star className="h-3.5 w-3.5" /> Feed star mark
          </p>
          <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-foreground">
            Your feed star
          </h2>
          <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
            Controls what people see next to your name on the Scene feed — not your big Artist Home
            portrait (set that under Hero photo below).
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Use on feed
          </span>
          <Switch
            checked={useStar}
            disabled={busy || pinned}
            onCheckedChange={onToggleUseStar}
            aria-label="Use generative star mark on the feed"
          />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground space-y-1.5">
        <p className="font-code text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
          Where each shows
        </p>
        <ul className="space-y-1 list-disc pl-4">
          <li>
            <strong className="text-foreground">Feed star on</strong> — round generative mark on the
            Scene feed; if you also have a hero photo, a small star sits on the bottom-right of that
            photo on your Artist Home.
          </li>
          <li>
            <strong className="text-foreground">Feed star off + hero photo</strong> — square photo
            chip on the feed; full portrait stays on Artist Home (no little star badge).
          </li>
          <li>
            <strong className="text-foreground">Feed star off + no photo</strong> — stock initials in
            a star on the feed only.
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            'relative mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border border-white/10 bg-black/40 sm:mx-0',
            justRolled && 'ring-2 ring-primary/50',
            pinned && 'ring-2 ring-amber-400/40'
          )}
        >
          {useStar ? (
            <span className="flex h-[7.5rem] w-[7.5rem] items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black/50">
              <VesperfoldMark seed={seed} size={120} />
            </span>
          ) : (
            <ArtistStarAvatar
              name={displayName}
              avatarUrl={hasCustomPhoto ? photoUrl! : undefined}
              size={112}
            />
          )}
          {pinned && (
            <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 text-amber-300">
              <Lock className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {useStar
                ? `Feed preview · generative${pinned ? ' · pinned' : ''}`
                : hasCustomPhoto
                  ? 'Feed preview · square photo'
                  : 'Feed preview · stock initials star'}
            </p>
            {useStar ? (
              <>
                <p className="mt-0.5 text-sm font-bold text-foreground">{stack.label}</p>
                <p className="font-code text-[10px] text-muted-foreground/80">
                  Seed {stack.seed.toLocaleString()} / {VESPERFOLD_SPACE.toLocaleString()}
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-sm font-bold text-foreground">
                {hasCustomPhoto
                  ? 'Your hero photo as a square feed chip'
                  : `${getInitials(displayName)} — until you upload a photo or turn the feed star on`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5 border-primary/40 bg-primary/10 font-bold uppercase text-primary hover:bg-primary/20"
              disabled={busy || pinned || !useStar}
              title={
                pinned
                  ? 'Unlock the pinned vault star to randomize'
                  : !useStar
                    ? 'Turn Use on feed on to randomize'
                    : 'Roll a new fold'
              }
              onClick={() => {
                onSeedChange(randomVesperfoldSeed(seed));
                setJustRolled(true);
                window.setTimeout(() => setJustRolled(false), 400);
              }}
            >
              <Shuffle className="h-3.5 w-3.5" /> Randomize
            </Button>
            <Button
              type="button"
              className="h-9 gap-1.5 font-bold uppercase"
              disabled={busy || !canLock}
              onClick={onLockSlot}
              title={
                pinned
                  ? 'Unlock first'
                  : !useStar
                    ? 'Turn Use on feed on to lock'
                    : slots.length >= VESPERFOLD_SLOT_LIMIT
                      ? `Vault full (${VESPERFOLD_SLOT_LIMIT})`
                      : slots.some((s) => s.seed === seed)
                        ? 'Already in vault'
                        : 'Save this star into your vault'
              }
            >
              <Lock className="h-3.5 w-3.5" /> Lock to vault
            </Button>
            {pinned && (
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 border-amber-400/40 bg-amber-500/10 font-bold uppercase text-amber-300 hover:bg-amber-500/20"
                disabled={busy}
                onClick={onUnpin}
              >
                <LockOpen className="h-3.5 w-3.5" /> Unlock
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5 font-bold uppercase"
              disabled={busy || !useStar}
              title={
                hasCustomPhoto
                  ? 'Turn feed star off — square photo on the feed again'
                  : 'Turn feed star off — stock initials star on the feed'
              }
              onClick={onUseStockStar}
            >
              {hasCustomPhoto ? 'Use photo on feed' : 'Use initials star'}
            </Button>
          </div>
          {pinned ? (
            <p className="text-[11px] text-amber-300/90">
              This feed star stays on until you unlock — or tap{' '}
              <strong>{hasCustomPhoto ? 'Use photo on feed' : 'Use initials star'}</strong> to clear
              it.
            </p>
          ) : !useStar ? (
            <p className="text-[11px] text-muted-foreground">
              {hasCustomPhoto ? (
                <>
                  Feed shows your <strong>square</strong> photo. Flip <strong>Use on feed</strong> to
                  put the generative star on the feed instead — your Artist Home portrait stays, with
                  a small star badge on it.
                </>
              ) : (
                <>
                  No photo yet — feed shows your <strong>initials star</strong>. Upload a hero photo
                  below for a square feed chip, or flip <strong>Use on feed</strong> for a generative
                  star.
                </>
              )}
            </p>
          ) : (
            <p className="text-[11px] text-primary/90">
              Generative star is live on the feed. Your hero photo (below) still shows on Artist Home
              {hasCustomPhoto ? ', with this star as a small badge on the bottom-right' : ''}. Tap{' '}
              <strong>{hasCustomPhoto ? 'Use photo on feed' : 'Use initials star'}</strong> to turn
              the feed star off.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Locked vault · {slots.length}/{VESPERFOLD_SLOT_LIMIT}
          </p>
        </div>
        {slots.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Lock up to {VESPERFOLD_SLOT_LIMIT} favorites, then tap Use — or the small lock beside it
            to keep that star on until you unlock.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {slots.map((slot) => {
              const isPinned = pinnedSlotId === slot.id;
              return (
                <li
                  key={slot.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-2.5 py-2',
                    isPinned
                      ? 'border-amber-400/45 bg-amber-500/10'
                      : slot.seed === seed && useStar
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-white/10 bg-black/20'
                  )}
                >
                  <VesperfoldMark seed={slot.seed} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{slot.label}</p>
                    <p className="font-code text-[9px] text-muted-foreground">
                      #{slot.seed.toLocaleString()}
                      {isPinned ? ' · pinned' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px] font-bold uppercase"
                      disabled={busy || isPinned}
                      onClick={() => onLoadSlot(slot)}
                    >
                      Use
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-7 w-7',
                        isPinned
                          ? 'text-amber-300 hover:text-amber-200'
                          : 'text-muted-foreground hover:text-primary'
                      )}
                      disabled={busy}
                      title={
                        isPinned
                          ? 'Unlock — allow changing this star again'
                          : 'Pin — keep this star on until you unlock (survives logout)'
                      }
                      aria-label={isPinned ? 'Unlock pinned star' : 'Pin this star'}
                      onClick={() => (isPinned ? onUnpin() : onPinSlot(slot))}
                    >
                      {isPinned ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-400"
                    disabled={busy || isPinned}
                    title={isPinned ? 'Unlock before removing' : 'Remove from vault'}
                    onClick={() => onClearSlot(slot.id)}
                    aria-label="Remove locked star"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
