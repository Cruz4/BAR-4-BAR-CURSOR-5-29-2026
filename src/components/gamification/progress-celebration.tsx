'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  CalendarRange,
  Flame,
  Radio,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  CelebrationOverlayPortal,
  CELEBRATION_EMOJI_Z_CLASS,
  CELEBRATION_MODAL_Z_CLASS,
  CELEBRATION_OVERLAY_Z_CLASS,
} from '@/components/gamification/celebration-overlay-portal';
import {
  PROGRESS_CELEBRATION_EVENT,
  type ProgressCelebrationItem,
  type ProgressCelebrationDetail,
} from '@/lib/gamification/progress-celebrations';
import { SCALE_LABELS, TIER_LABELS, WEEKLY_CHALLENGES, MONTHLY_CHALLENGES, LIFETIME_MILESTONES } from '@/lib/gamification/challenges';
import { fireProgressConfetti } from '@/lib/gamification/celebration-confetti';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/profile/social-client';
import { ChallengeGoalFoilCard } from '@/components/gamification/challenge-goal-foil-card';
import { domNodeToFeedImageDataUrl } from '@/lib/gamification/feed-card-export';
import {
  loadSeenProgressKeys,
  markProgressCelebrationsSeen,
} from '@/lib/gamification/celebration-seen';
import { flushSync } from 'react-dom';

function confettiPalette(item: ProgressCelebrationItem): string[] {
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') return ['#22d3ee', '#06b6d4', '#67e8f9'];
    if (item.scale === 'monthly') return ['#a855f7', '#c084fc', '#e879f9'];
    return ['#fbbf24', '#f59e0b', '#fcd34d'];
  }
  if (item.type === 'streak_milestone') return ['#fb923c', '#f97316', '#fdba74'];
  return ['#34d399', '#10b981', '#6ee7b7'];
}

function fireItemConfetti(item: ProgressCelebrationItem) {
  fireProgressConfetti(confettiPalette(item));
}

function headline(item: ProgressCelebrationItem): string {
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') return 'Weekly Goal Complete';
    if (item.scale === 'monthly') return 'Monthly Challenge Complete';
    return 'Personal Milestone';
  }
  if (item.type === 'streak_milestone') return 'Streak Milestone';
  return 'New Personal Best';
}

function IconForItem({ item }: { item: ProgressCelebrationItem }) {
  const className = 'h-10 w-10';
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') return <CalendarCheck className={cn(className, 'text-cyan-400')} />;
    if (item.scale === 'monthly') return <CalendarRange className={cn(className, 'text-violet-400')} />;
    return <Star className={cn(className, 'text-amber-400')} />;
  }
  if (item.type === 'streak_milestone') return <Flame className={cn(className, 'text-orange-400')} />;
  return <TrendingUp className={cn(className, 'text-emerald-400')} />;
}

function iconRingClass(item: ProgressCelebrationItem): string {
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') return 'border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.35)]';
    if (item.scale === 'monthly') return 'border-violet-400/60 bg-violet-400/10 shadow-[0_0_40px_rgba(168,85,247,0.35)]';
    return 'border-amber-400/60 bg-amber-400/10 shadow-[0_0_40px_rgba(251,191,36,0.35)]';
  }
  if (item.type === 'streak_milestone') {
    return 'border-orange-400/60 bg-orange-400/10 shadow-[0_0_40px_rgba(251,146,60,0.35)]';
  }
  return 'border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_40px_rgba(52,211,153,0.35)]';
}

function accentTextClass(item: ProgressCelebrationItem): string {
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') return 'text-cyan-400/90';
    if (item.scale === 'monthly') return 'text-violet-400/90';
    return 'text-amber-400/90';
  }
  if (item.type === 'streak_milestone') return 'text-orange-400/90';
  return 'text-emerald-400/90';
}

function cardBorderClass(item: ProgressCelebrationItem): string {
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') return 'border-cyan-400/40 shadow-[0_0_60px_rgba(34,211,238,0.25)]';
    if (item.scale === 'monthly') return 'border-violet-400/40 shadow-[0_0_60px_rgba(168,85,247,0.25)]';
    return 'border-amber-400/40 shadow-[0_0_60px_rgba(251,191,36,0.25)]';
  }
  if (item.type === 'streak_milestone') return 'border-orange-400/40 shadow-[0_0_60px_rgba(251,146,60,0.25)]';
  return 'border-emerald-400/40 shadow-[0_0_60px_rgba(52,211,153,0.25)]';
}

function buttonClass(item: ProgressCelebrationItem): string {
  if (item.type === 'challenge') {
    if (item.scale === 'weekly') {
      return 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 shadow-[0_0_24px_rgba(34,211,238,0.35)]';
    }
    if (item.scale === 'monthly') {
      return 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.35)]';
    }
    return 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]';
  }
  if (item.type === 'streak_milestone') {
    return 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 shadow-[0_0_24px_rgba(251,146,60,0.35)]';
  }
  return 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_24px_rgba(52,211,153,0.35)]';
}

function sublabel(item: ProgressCelebrationItem): string | null {
  if (item.type === 'challenge') {
    const scale = SCALE_LABELS[item.scale];
    const tier = TIER_LABELS[item.tier];
    return `${scale} · ${tier}`;
  }
  if (item.type === 'personal_best' && item.kind === 'barsInSession') {
    return 'Session record';
  }
  if (item.type === 'personal_best' && item.kind === 'barsInDay') {
    return 'Daily record';
  }
  if (item.type === 'streak_milestone') {
    return `${item.streak} days in a row`;
  }
  return null;
}

type CursorEmojiBurst = { id: string; emoji: string; x: number; y: number };

export function ProgressCelebration() {
  const { user } = useAuth();
  const { summary, rankLabel } = useGamification();
  const { toast } = useToast();
  const [queue, setQueue] = useState<ProgressCelebrationItem[]>([]);
  const [active, setActive] = useState<ProgressCelebrationItem | null>(null);
  const [cursorEmojis, setCursorEmojis] = useState<CursorEmojiBurst[]>([]);
  const [postingFeed, setPostingFeed] = useState(false);
  const shownKeysRef = useRef(new Set<string>());
  const pointerRef = useRef({ x: 0, y: 0 });
  const emojiTimersRef = useRef<number[]>([]);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const goalCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shownKeysRef.current = user?.id ? loadSeenProgressKeys(user.id) : new Set();
  }, [user?.id]);

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
    const emojiTimers = emojiTimersRef.current;
    return () => {
      emojiTimers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const spawnCursorEmoji = useCallback((item: ProgressCelebrationItem) => {
    const { x, y } = pointerRef.current;
    const px = x || window.innerWidth / 2;
    const py = y || window.innerHeight / 2;
    const emoji =
      item.type === 'challenge' && item.scale === 'weekly'
        ? '🎯'
        : item.type === 'streak_milestone'
          ? '🔥'
          : item.type === 'personal_best'
            ? '📈'
            : '⭐';
    const id = `progress-emoji-${Date.now()}`;
    setCursorEmojis((prev) => [...prev, { id, emoji, x: px, y: py }]);
    const t = window.setTimeout(() => {
      setCursorEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 900);
    emojiTimersRef.current.push(t);
  }, []);

  const enqueueItems = useCallback(
    (items: ProgressCelebrationItem[]) => {
      const fresh = items.filter((item) => !shownKeysRef.current.has(item.dedupeKey));
      if (!fresh.length) return;
      fresh.forEach((item) => shownKeysRef.current.add(item.dedupeKey));
      if (user?.id) {
        markProgressCelebrationsSeen(
          user.id,
          fresh.map((item) => item.dedupeKey)
        );
      }
      setQueue((prev) => [...prev, ...fresh]);
    },
    [user?.id]
  );

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<ProgressCelebrationDetail>).detail;
      if (detail?.items?.length) enqueueItems(detail.items);
    };
    window.addEventListener(PROGRESS_CELEBRATION_EVENT, onCelebrate);
    return () => window.removeEventListener(PROGRESS_CELEBRATION_EVENT, onCelebrate);
  }, [enqueueItems]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActive(next);
    spawnCursorEmoji(next);
    fireItemConfetti(next);
  }, [active, queue, spawnCursorEmoji]);

  const dismiss = () => setActive(null);
  const sub = active ? sublabel(active) : null;
  const displayName = user?.displayName || 'Studio Artist';

  const activeChallenge =
    active?.type === 'challenge'
      ? [...WEEKLY_CHALLENGES, ...MONTHLY_CHALLENGES, ...LIFETIME_MILESTONES].find((c) => c.id === active.id)
      : undefined;

  const shareGoalToFeed = async () => {
    if (!active || active.type !== 'challenge' || !activeChallenge || !user) return;
    flushSync(() => setPostingFeed(true));
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      let cardEl = goalCardRef.current;
      if (!cardEl) {
        await new Promise((r) => setTimeout(r, 80));
        cardEl = goalCardRef.current;
      }
      if (!cardEl) throw new Error('Goal card not ready — try again.');
      const imageUrl = await domNodeToFeedImageDataUrl(cardEl);
      await createPost({
        text: [
          `🎯 ${SCALE_LABELS[activeChallenge.scale]} goal complete: ${activeChallenge.label}`,
          activeChallenge.description.trim(),
          '#bar4bar.ink',
        ].join('\n'),
        imageUrl,
        ownerName: displayName,
        ownerSlug: summary.profileSlug,
      });
      toast({
        title: 'Shared to your feed',
        description: 'Goal card posted on your wall / The Scene.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not share to feed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPostingFeed(false);
    }
  };

  return (
    <>
      {activeChallenge && (
        <div
          className="pointer-events-none fixed left-[-99999px] top-0 w-[400px] opacity-0"
          aria-hidden
        >
          <ChallengeGoalFoilCard
            ref={goalCardRef}
            challenge={activeChallenge}
            displayName={displayName}
            rankLabel={rankLabel}
          />
        </div>
      )}

      <CelebrationOverlayPortal>
        <div className={cn('pointer-events-none fixed inset-0', CELEBRATION_EMOJI_Z_CLASS)} aria-hidden>
          <AnimatePresence>
            {cursorEmojis.map((item) => (
              <motion.span
                key={item.id}
                className="absolute select-none text-[2.25rem] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
                style={{ left: item.x, top: item.y, translateX: '-50%', translateY: '-50%' }}
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: -6 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {item.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </CelebrationOverlayPortal>

      <Dialog open={!!active} onOpenChange={(open) => !open && dismiss()}>
        <DialogContent
          overlayClassName={cn(CELEBRATION_OVERLAY_Z_CLASS, 'bg-black/75')}
          className={cn(
            CELEBRATION_MODAL_Z_CLASS,
            'sm:max-w-md gap-0 overflow-hidden rounded-2xl p-0',
            'bg-gradient-to-b from-background/90 via-background to-background',
            active ? cardBorderClass(active) : '',
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
              initial={{ scale: 0.88, y: 36, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <DialogTitle className="sr-only">
                {headline(active)}: {active.label}
              </DialogTitle>
              <div className="relative px-6 pt-8 pb-6 text-center space-y-5">
                <motion.div
                  className={cn(
                    'mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2',
                    iconRingClass(active)
                  )}
                  initial={{ scale: 0.88 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <IconForItem item={active} />
                </motion.div>

                <div className="space-y-2">
                  <p
                    className={cn(
                      'text-[10px] font-black uppercase tracking-[0.35em] flex items-center justify-center gap-2',
                      accentTextClass(active)
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {headline(active)}
                    <Sparkles className="h-3.5 w-3.5" />
                  </p>
                  <h2
                    id="progress-celebration-title"
                    className="text-2xl font-black uppercase tracking-tight text-foreground"
                  >
                    {active.label}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{active.description}</p>
                </div>

                {sub && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5">
                    {active.type === 'challenge' && active.scale === 'weekly' && (
                      <Target className="h-3.5 w-3.5 text-cyan-400" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {sub}
                    </span>
                  </div>
                )}

                {activeChallenge && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full h-11 font-bold uppercase tracking-widest text-[10px] gap-2"
                    disabled={postingFeed || !user}
                    onClick={() => void shareGoalToFeed()}
                  >
                    <Radio className="h-4 w-4" />
                    {postingFeed ? 'Posting foil…' : 'Share to feed'}
                  </Button>
                )}

                <Button
                  ref={dismissButtonRef}
                  size="lg"
                  className={cn(
                    'w-full h-12 font-black uppercase tracking-widest text-xs text-white',
                    buttonClass(active)
                  )}
                  onClick={dismiss}
                >
                  {queue.length > 0 ? 'Next' : 'Keep Going'}
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
