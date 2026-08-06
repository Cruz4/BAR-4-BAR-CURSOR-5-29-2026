'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Download,
  Droplets,
  Facebook,
  Mail,
  MessageCircle,
  Radio,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CelebrationOverlayPortal,
  CELEBRATION_EMOJI_Z_CLASS,
  CELEBRATION_MODAL_Z_CLASS,
  CELEBRATION_OVERLAY_Z_CLASS,
} from '@/components/gamification/celebration-overlay-portal';
import { AchievementFoilCard } from '@/components/gamification/achievement-foil-card';
import {
  ACHIEVEMENT_UNLOCK_EVENT,
  type AchievementUnlockDetail,
} from '@/lib/gamification/unlock-events';
import type { GamificationUnlock } from '@/lib/gamification/types';
import { getAchievement, type AchievementDef } from '@/lib/gamification/achievements';
import {
  buildAchievementShareText,
  downloadAchievementCardPng,
  achievementCardToFeedImageDataUrl,
} from '@/lib/gamification/achievement-card-export';
import {
  fireAchievementConfetti,
  stopCelebrationConfetti,
} from '@/lib/gamification/celebration-confetti';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/profile/social-client';
import {
  loadSeenAchievementIds,
  markAchievementsSeen,
} from '@/lib/gamification/celebration-seen';

type CelebrationItem = GamificationUnlock & { actionXpGain?: number };

type CursorEmojiBurst = {
  id: string;
  emoji: string;
  x: number;
  y: number;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.833L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function buildUnlockFeedText(item: CelebrationItem, def?: AchievementDef | null): string {
  const title = def?.title || item.title;
  const desc = def?.description || item.description;
  const bits = [`🏆 Unlocked ${title}`];
  if (desc?.trim()) bits.push(desc.trim());
  const rewards: string[] = [];
  if (item.xpReward > 0) rewards.push(`+${item.xpReward} XP`);
  if (item.inkReward > 0) rewards.push(`+${item.inkReward} Ink`);
  if (rewards.length) bits.push(rewards.join(' · '));
  bits.push('#bar4bar.ink');
  return bits.join('\n');
}

export function AchievementUnlockCelebration() {
  const { user } = useAuth();
  const { summary, rankLabel } = useGamification();
  const { toast } = useToast();
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [active, setActive] = useState<CelebrationItem | null>(null);
  const [cursorEmojis, setCursorEmojis] = useState<CursorEmojiBurst[]>([]);
  const [foilOpen, setFoilOpen] = useState(false);
  const [postingFeed, setPostingFeed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const shownIdsRef = useRef(new Set<string>());
  const pointerRef = useRef({ x: 0, y: 0 });
  const emojiTimersRef = useRef<number[]>([]);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const foilCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shownIdsRef.current = user?.id ? loadSeenAchievementIds(user.id) : new Set();
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

  const enqueueUnlocks = useCallback(
    (unlocks: GamificationUnlock[], xpGain = 0) => {
      const fresh = unlocks.filter((u) => !shownIdsRef.current.has(u.id));
      if (!fresh.length) return;

      fresh.forEach((u) => shownIdsRef.current.add(u.id));
      if (user?.id) {
        markAchievementsSeen(
          user.id,
          fresh.map((u) => u.id)
        );
      }
      const items: CelebrationItem[] = fresh.map((u, i) => ({
        ...u,
        actionXpGain: i === 0 ? xpGain : 0,
      }));

      setQueue((prev) => [...prev, ...items]);
    },
    [user?.id]
  );

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
    setFoilOpen(false);
    spawnCursorEmojiSequence();
    fireAchievementConfetti();
  }, [active, queue, spawnCursorEmojiSequence]);

  const dismiss = () => {
    stopCelebrationConfetti();
    setFoilOpen(false);
    setActive(null);
  };

  const def = active ? getAchievement(active.id) : undefined;
  const totalXp = (active?.xpReward ?? 0) + (active?.actionXpGain ?? 0);
  const displayName = user?.displayName || 'Studio Artist';
  const unlockedAt =
    active && summary.unlockedAchievements?.[active.id]
      ? summary.unlockedAchievements[active.id]
      : new Date().toISOString();

  const shareText = active
    ? buildAchievementShareText(
        def,
        displayName,
        rankLabel,
        summary.xp,
        summary.currentStreak,
        unlockedAt
      )
    : '';

  const profileUrl =
    typeof window !== 'undefined' && summary.profileSlug
      ? `${window.location.origin}/profile/${summary.profileSlug}`
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';

  const handleShareToFeed = async () => {
    if (!active || !user) return;
    setPostingFeed(true);
    try {
      // Let the offscreen foil card paint before capture.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      const cardEl = exportCardRef.current;
      if (!cardEl) throw new Error('Foil card not ready — try again.');
      const imageUrl = await achievementCardToFeedImageDataUrl(cardEl, def || null);
      await createPost({
        text: buildUnlockFeedText(active, def),
        imageUrl,
        ownerName: displayName,
        ownerSlug: summary.profileSlug,
      });
      toast({
        title: 'Shared to your feed',
        description: summary.publicProfile
          ? 'Foil card posted on your Artist Home wall / The Scene.'
          : 'Foil card posted to your wall — flip Artist Home live so the block can see it.',
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

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(
        profileUrl ? `${shareText}\n${profileUrl}` : shareText
      );
      toast({ title: 'Copied', description: 'Paste anywhere — X, IG, Discord…' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  const handleDownloadFoil = async () => {
    if (!active) return;
    const cardEl = foilCardRef.current || exportCardRef.current;
    if (!cardEl) return;
    setExporting(true);
    try {
      await downloadAchievementCardPng(cardEl, def || null);
      toast({ title: 'Foil card downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed — try copy instead' });
    } finally {
      setExporting(false);
    }
  };

  const openExternalShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720');
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `${active?.title || 'Achievement'} — Bar 4 Bar`,
        text: shareText,
        url: profileUrl || undefined,
      });
    } catch {
      /* cancelled */
    }
  };

  const encodedText = encodeURIComponent(
    profileUrl ? `${shareText}\n${profileUrl}` : shareText
  );
  const encodedUrl = encodeURIComponent(profileUrl || '');
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      {active && (
        <div
          className="pointer-events-none fixed left-[-99999px] top-0 w-[400px] opacity-0"
          aria-hidden
        >
          <AchievementFoilCard
            ref={exportCardRef}
            achievement={def || null}
            displayName={displayName}
            rankLabel={rankLabel}
            xp={summary.xp}
            streak={summary.currentStreak}
            unlockedAt={unlockedAt}
            locked={false}
          />
        </div>
      )}

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
                    {def.category === 'mastery' && 'Deep craft — the vault remembers this.'}
                    {def.category === 'social' && 'The block noticed — keep the network hot.'}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 font-bold uppercase text-[10px] tracking-widest gap-2"
                    disabled={postingFeed || !user}
                    onClick={() => void handleShareToFeed()}
                  >
                    <Radio className="h-4 w-4" />
                    {postingFeed ? 'Posting foil…' : 'Share to feed'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 font-bold uppercase text-[10px] tracking-widest gap-2 border-amber-500/35 text-amber-200 hover:bg-amber-500/10"
                    onClick={() => setFoilOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share foil card
                  </Button>
                </div>

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

      <Dialog
        open={foilOpen && !!active}
        onOpenChange={(open) => {
          setFoilOpen(open);
        }}
      >
        <DialogContent
          overlayClassName={cn(CELEBRATION_OVERLAY_Z_CLASS, 'bg-black/85')}
          className={cn(
            'z-[7002]',
            'sm:max-w-lg max-h-[90vh] overflow-y-auto border-amber-500/30 bg-[hsl(216_28%_7%)] text-white'
          )}
        >
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-headline uppercase tracking-wide">
                  {active.title}
                </DialogTitle>
                <DialogDescription className="text-white/55">
                  Foil achievement card — view, download, or share. No lyrics included.
                </DialogDescription>
              </DialogHeader>

              <AchievementFoilCard
                ref={foilCardRef}
                achievement={def || null}
                displayName={displayName}
                rankLabel={rankLabel}
                xp={summary.xp}
                streak={summary.currentStreak}
                unlockedAt={unlockedAt}
                locked={false}
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 font-bold uppercase text-[10px] gap-2 col-span-2"
                  disabled={postingFeed || !user}
                  onClick={() => void handleShareToFeed()}
                >
                  <Radio className="h-4 w-4" />
                  {postingFeed ? 'Posting foil…' : 'Share foil to feed'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 font-bold uppercase text-[10px] gap-2"
                  disabled={exporting}
                  onClick={() => void handleDownloadFoil()}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Saving…' : 'Download PNG'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 font-bold uppercase text-[10px] gap-2"
                  onClick={() => void handleCopyShare()}
                >
                  <Copy className="h-4 w-4" /> Copy text
                </Button>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/45 flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Share elsewhere
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 text-[10px] font-bold uppercase gap-1.5"
                    onClick={() =>
                      openExternalShare(`https://twitter.com/intent/tweet?text=${encodedText}`)
                    }
                  >
                    <XIcon className="h-3.5 w-3.5" /> X
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 text-[10px] font-bold uppercase gap-1.5"
                    onClick={() =>
                      openExternalShare(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl || encodeURIComponent('https://bar4bar.ink')}&quote=${encodedText}`
                      )
                    }
                  >
                    <Facebook className="h-3.5 w-3.5" /> Facebook
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 text-[10px] font-bold uppercase gap-1.5"
                    onClick={() => openExternalShare(`https://wa.me/?text=${encodedText}`)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 text-[10px] font-bold uppercase gap-1.5"
                    onClick={() =>
                      openExternalShare(
                        `mailto:?subject=${encodeURIComponent(`${active.title} — Bar 4 Bar`)}&body=${encodedText}`
                      )
                    }
                  >
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Button>
                  {canNativeShare && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-9 text-[10px] font-bold uppercase gap-1.5 col-span-2 sm:col-span-1"
                      onClick={() => void handleNativeShare()}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Device share
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
