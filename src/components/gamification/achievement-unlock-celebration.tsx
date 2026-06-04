'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Zap, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  CelebrationOverlayPortal,
  CELEBRATION_EMOJI_Z_CLASS,
  CELEBRATION_MODAL_Z_CLASS,
  CELEBRATION_OVERLAY_Z_CLASS,
} from '@/components/gamification/celebration-overlay-portal';
import {
  ACHIEVEMENT_UNLOCK_EVENT,
  type AchievementUnlockDetail,
} from '@/lib/gamification/unlock-events';
import type { GamificationUnlock } from '@/lib/gamification/types';
import { getAchievement } from '@/lib/gamification/achievements';
import {
  fireAchievementConfetti,
  stopCelebrationConfetti,
} from '@/lib/gamification/celebration-confetti';
import { cn } from '@/lib/utils';

type CelebrationItem = GamificationUnlock & { actionXpGain?: number };

type CursorEmojiBurst = {
  id: string;
  emoji: string;
  x: number;
  y: number;
};

export function AchievementUnlockCelebration() {
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [active, setActive] = useState<CelebrationItem | null>(null);
  const [cursorEmojis, setCursorEmojis] = useState<CursorEmojiBurst[]>([]);
  const shownIdsRef = useRef(new Set<string>());
  const pointerRef = useRef({ x: 0, y: 0 });
  const emojiTimersRef = useRef<number[]>([]);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  useEffect(() => {
    return () => {
      emojiTimersRef.current.forEach((t) => window.clearTimeout(t));
      stopCelebrationConfetti();
    };
  }, []);

  const spawnCursorEmojiSequence = useCallback(() => {
    const { x, y } = pointerRef.current;
    const px = x || window.innerWidth / 2;
    const py = y || window.innerHeight / 2;
    const grimId = `grim-${Date.now()}`;

    setCursorEmojis((prev) => [...prev, { id: grimId, emoji: '😬', x: px, y: py }]);

    const t1 = window.setTimeout(() => {
      setCursorEmojis((prev) => prev.filter((e) => e.id !== grimId));
      const fireId = `fire-${Date.now()}`;
      setCursorEmojis((prev) => [...prev, { id: fireId, emoji: '🔥', x: px, y: py }]);
      const t2 = window.setTimeout(() => {
        setCursorEmojis((prev) => prev.filter((e) => e.id !== fireId));
      }, 900);
      emojiTimersRef.current.push(t2);
    }, 650);
    emojiTimersRef.current.push(t1);
  }, []);

  const enqueueUnlocks = useCallback((unlocks: GamificationUnlock[], xpGain = 0) => {
    const fresh = unlocks.filter((u) => !shownIdsRef.current.has(u.id));
    if (!fresh.length) return;

    fresh.forEach((u) => shownIdsRef.current.add(u.id));
    const items: CelebrationItem[] = fresh.map((u, i) => ({
      ...u,
      actionXpGain: i === 0 ? xpGain : 0,
    }));

    setQueue((prev) => [...prev, ...items]);
  }, []);

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const detail = (e as CustomEvent<AchievementUnlockDetail>).detail;
      if (detail?.unlocks?.length) {
        enqueueUnlocks(detail.unlocks, detail.xpGain ?? 0);
      }
    };
    window.addEventListener(ACHIEVEMENT_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(ACHIEVEMENT_UNLOCK_EVENT, onUnlock);
  }, [enqueueUnlocks]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActive(next);
    spawnCursorEmojiSequence();
    fireAchievementConfetti();
  }, [active, queue, spawnCursorEmojiSequence]);

  const dismiss = () => {
    stopCelebrationConfetti();
    setActive(null);
  };

  const def = active ? getAchievement(active.id) : undefined;
  const totalXp = (active?.xpReward ?? 0) + (active?.actionXpGain ?? 0);

  return (
    <>
      <CelebrationOverlayPortal>
        <div className={cn('pointer-events-none fixed inset-0', CELEBRATION_EMOJI_Z_CLASS)} aria-hidden>
          <AnimatePresence>
            {cursorEmojis.map((item) => (
              <motion.span
                key={item.id}
                className="absolute select-none text-[2.75rem] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
                style={{ left: item.x, top: item.y, translateX: '-50%', translateY: '-50%' }}
                initial={
                  item.emoji === '😬'
                    ? { opacity: 0, scale: 0.6 }
                    : { opacity: 0, scale: 0.75, y: 6 }
                }
                animate={
                  item.emoji === '😬'
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 1, scale: 1.05, y: -8 }
                }
                exit={
                  item.emoji === '😬'
                    ? { opacity: 0, scale: 0.85, y: -10 }
                    : { opacity: 0, scale: 1.15, y: -22 }
                }
                transition={
                  item.emoji === '😬'
                    ? { duration: 0.55, ease: 'easeOut' }
                    : { duration: 0.45, ease: 'easeOut' }
                }
              >
                {item.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </CelebrationOverlayPortal>

      <Dialog open={!!active} onOpenChange={(open) => !open && dismiss()}>
        <DialogContent
          overlayClassName={cn(CELEBRATION_OVERLAY_Z_CLASS, 'bg-black/80')}
          className={cn(
            CELEBRATION_MODAL_Z_CLASS,
            'sm:max-w-md gap-0 overflow-hidden rounded-2xl border border-primary/40',
            'bg-gradient-to-b from-primary/20 via-background to-background',
            'shadow-[0_0_80px_rgba(168,85,247,0.35)] p-0',
            '[&>button.absolute]:hidden'
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            dismissButtonRef.current?.focus();
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {active && (
            <motion.div
              initial={{ scale: 0.85, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <DialogTitle className="sr-only">Achievement unlocked: {active.title}</DialogTitle>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-400/20 to-transparent" />

              <div className="relative px-6 pt-8 pb-6 text-center space-y-5">
                <motion.div
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/60 bg-amber-400/10 shadow-[0_0_40px_rgba(251,191,36,0.45)]"
                  initial={{ scale: 0.85, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                >
                  <Trophy className="h-10 w-10 text-amber-400" />
                </motion.div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400/90 flex items-center justify-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Achievement Unlocked
                    <Sparkles className="h-3.5 w-3.5" />
                  </p>
                  <h2
                    id="achievement-unlock-title"
                    className="text-2xl font-black uppercase tracking-tight text-foreground"
                  >
                    {active.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{active.description}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {totalXp > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2">
                      <Zap className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm font-black text-cyan-300">+{totalXp} XP</span>
                    </div>
                  )}
                  {active.inkReward > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-400/10 px-4 py-2">
                      <Droplets className="h-4 w-4 text-violet-400" />
                      <span className="text-sm font-black text-violet-300">+{active.inkReward} Ink</span>
                    </div>
                  )}
                </div>

                {def?.category && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    {def.category === 'activation' && 'First steps in the booth — keep building.'}
                    {def.category === 'retention' && 'Momentum unlocked — don’t stop now.'}
                    {def.category === 'conversion' && 'Studio milestone — you’re leveling up.'}
                  </p>
                )}

                <Button
                  ref={dismissButtonRef}
                  size="lg"
                  className={cn(
                    'w-full h-12 font-black uppercase tracking-widest text-xs',
                    'bg-gradient-to-r from-amber-500 to-primary hover:from-amber-400 hover:to-primary/90',
                    'shadow-[0_0_24px_rgba(251,191,36,0.35)]'
                  )}
                  onClick={dismiss}
                >
                  {queue.length > 0 ? 'Next Achievement' : 'Keep Going'}
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
