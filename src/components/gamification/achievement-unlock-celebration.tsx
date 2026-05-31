'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Zap, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ACHIEVEMENT_UNLOCK_EVENT,
  type AchievementUnlockDetail,
} from '@/lib/gamification/unlock-events';
import type { GamificationUnlock } from '@/lib/gamification/types';
import { getAchievement } from '@/lib/gamification/achievements';
import { cn } from '@/lib/utils';

type CelebrationItem = GamificationUnlock & { actionXpGain?: number };

function fireAchievementConfetti() {
  const duration = 2800;
  const end = Date.now() + duration;
  const colors = ['#fbbf24', '#a855f7', '#22d3ee', '#f472b6', '#34d399'];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 62,
      origin: { x: 0, y: 0.65 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 62,
      origin: { x: 1, y: 0.65 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { x: 0.5, y: 0.45 },
      colors,
      startVelocity: 42,
      gravity: 0.9,
      scalar: 1.1,
      zIndex: 9999,
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  };

  frame();
}

export function AchievementUnlockCelebration() {
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [active, setActive] = useState<CelebrationItem | null>(null);
  const shownIdsRef = useRef(new Set<string>());

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
    fireAchievementConfetti();
  }, [active, queue]);

  const dismiss = () => setActive(null);

  const def = active ? getAchievement(active.id) : undefined;
  const totalXp = (active?.xpReward ?? 0) + (active?.actionXpGain ?? 0);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-unlock-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Dismiss achievement celebration"
            onClick={dismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/20 via-background to-background shadow-[0_0_80px_rgba(168,85,247,0.35)]"
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-400/20 to-transparent" />

            <div className="relative px-6 pt-8 pb-6 text-center space-y-5">
              <motion.div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/60 bg-amber-400/10 shadow-[0_0_40px_rgba(251,191,36,0.45)]"
                animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
              >
                <Trophy className="h-10 w-10 text-amber-400" />
              </motion.div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400/90 flex items-center justify-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Achievement Unlocked
                  <Sparkles className="h-3.5 w-3.5" />
                </p>
                <h2 id="achievement-unlock-title" className="text-2xl font-black uppercase tracking-tight text-foreground">
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
                size="lg"
                className={cn(
                  'w-full h-12 font-black uppercase tracking-widest text-xs',
                  'bg-gradient-to-r from-amber-500 to-primary hover:from-amber-400 hover:to-primary/90',
                  'shadow-[0_0_24px_rgba(251,191,36,0.35)] animate-pulse'
                )}
                onClick={dismiss}
              >
                {queue.length > 0 ? 'Next Achievement' : 'Keep Going'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
