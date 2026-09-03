'use client';

import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AchievementFoilCard } from '@/components/gamification/achievement-foil-card';
import {
  buildAchievementShareText,
  downloadAchievementCardPng,
  achievementCardToFeedImageDataUrl,
} from '@/lib/gamification/achievement-card-export';
import { formatUnlockDate } from '@/lib/gamification/achievement-card-theme';
import { achievementIcon } from '@/lib/gamification/achievement-icons';
import { isAchievementStarter, type AchievementDef } from '@/lib/gamification/achievements';
import {
  ACHIEVEMENT_CATEGORY,
  ACHIEVEMENT_CATEGORY_LOCKED,
} from '@/lib/gamification/badge-styles';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';
import { CheckCircle2, Copy, Download, Eye, Lock, Radio } from 'lucide-react';

type AchievementBadgeCellProps = {
  achievement: AchievementDef;
  unlocked: boolean;
  lockedPro: boolean;
  unlockedAt?: string;
  className?: string;
  /** Compact chip for Studio Progress rail. */
  variant?: 'cell' | 'chip';
};

const CATEGORY_CELL: Record<
  AchievementDef['category'],
  { border: string; bg: string; icon: string; label: string }
> = {
  activation: {
    border: 'border-sky-500/50',
    bg: 'bg-sky-950/40',
    icon: 'text-sky-400',
    label: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  },
  retention: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/35',
    icon: 'text-amber-400',
    label: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  },
  conversion: {
    border: 'border-fuchsia-500/50',
    bg: 'bg-fuchsia-950/35',
    icon: 'text-fuchsia-400',
    label: 'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-300',
  },
  mastery: {
    border: 'border-violet-500/50',
    bg: 'bg-violet-950/35',
    icon: 'text-violet-400',
    label: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
  },
  social: {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-950/35',
    icon: 'text-emerald-400',
    label: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  },
};

export function AchievementBadgeCell({
  achievement,
  unlocked,
  lockedPro,
  unlockedAt,
  className,
  variant = 'cell',
}: AchievementBadgeCellProps) {
  const { user } = useAuth();
  const { summary, rankLabel } = useGamification();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [postingFeed, setPostingFeed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const starter = isAchievementStarter(achievement.id);
  const cat = CATEGORY_CELL[achievement.category];
  const Icon = achievementIcon(achievement.icon);
  const displayName = user?.displayName || 'Studio Artist';
  const xp = summary.xp;
  const streak = summary.currentStreak;

  const statusLabel = unlocked
    ? unlockedAt
      ? `Unlocked ${formatUnlockDate(unlockedAt)}`
      : 'Unlocked'
    : lockedPro
      ? 'Studio Pro required'
      : 'Not unlocked yet';

  const copySummary = async () => {
    const text = buildAchievementShareText(achievement, displayName, rankLabel, xp, streak, unlockedAt);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await downloadAchievementCardPng(cardRef.current, achievement);
      toast({ title: 'Card downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed — try copy instead' });
    } finally {
      setExporting(false);
    }
  };

  const shareToFeed = async () => {
    if (!user) return;
    flushSync(() => setPostingFeed(true));
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      let cardEl = cardRef.current;
      if (!cardEl) {
        await new Promise((r) => setTimeout(r, 80));
        cardEl = cardRef.current;
      }
      if (!cardEl) throw new Error('Foil card not ready — open Preview and try again.');

      const imageUrl = await achievementCardToFeedImageDataUrl(cardEl, achievement);
      const rewards: string[] = [];
      if (achievement.xpReward > 0) rewards.push(`+${achievement.xpReward} XP`);
      if (achievement.inkReward > 0) rewards.push(`+${achievement.inkReward} Ink`);
      const text = [
        `🏆 Unlocked ${achievement.title}`,
        achievement.description.trim(),
        rewards.length ? rewards.join(' · ') : '',
        '#akasheet',
      ]
        .filter(Boolean)
        .join('\n');
      await createPost({
        text,
        imageUrl,
        ownerName: displayName,
        ownerSlug: summary.profileSlug,
      });
      toast({
        title: 'Shared to your feed',
        description: 'Foil card posted on your Artist Home wall / The Scene.',
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

  const cell = (
    <div
      className={cn(
        'relative rounded-xl border-2 p-3 min-h-[108px] flex flex-col gap-2 transition-all',
        unlocked
          ? cn(
              'border-emerald-500/70 bg-emerald-950/30 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)] cursor-pointer',
              cat.bg
            )
          : lockedPro
            ? 'border-dashed border-orange-500/40 bg-black/50 opacity-90 cursor-help'
            : 'border-dashed border-white/25 bg-black/45 opacity-80 cursor-help',
        className
      )}
      onClick={unlocked ? () => setPreviewOpen(true) : undefined}
      onKeyDown={
        unlocked
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPreviewOpen(true);
              }
            }
          : undefined
      }
      role={unlocked ? 'button' : undefined}
      tabIndex={unlocked ? 0 : undefined}
      aria-label={unlocked ? `Preview ${achievement.title} card` : undefined}
    >
      {unlocked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[9px] font-bold uppercase text-emerald-300">Done</span>
        </div>
      )}

      {!unlocked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 border border-white/15 px-1.5 py-0.5">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">
            {lockedPro ? 'Pro' : 'Locked'}
          </span>
        </div>
      )}

      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2',
          unlocked ? cat.border : 'border-white/20',
          unlocked ? 'bg-black/30' : 'bg-black/50'
        )}
      >
        <Icon
          className={cn('h-5 w-5', unlocked ? cat.icon : 'text-muted-foreground/60')}
          strokeWidth={2}
        />
      </div>

      <p
        className={cn(
          'font-bold uppercase leading-snug pr-14',
          unlocked ? 'text-sm text-white' : 'text-sm text-muted-foreground'
        )}
      >
        {achievement.title}
      </p>

      <Badge variant="outline" className={cn('text-[9px] h-5 w-fit uppercase', cat.label)}>
        {achievement.category}
      </Badge>
    </div>
  );

  const chipHowTo = unlocked
    ? 'Unlocked — tap to open your foil card, post it to the wall, or download.'
    : lockedPro
      ? `Studio Pro required. ${achievement.howTo}`
      : achievement.howTo;

  const chip = (
    <button
      type="button"
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border h-auto min-h-5 py-0.5 px-2 font-bold uppercase',
        unlocked
          ? ACHIEVEMENT_CATEGORY[achievement.category]
          : ACHIEVEMENT_CATEGORY_LOCKED[achievement.category],
        unlocked ? 'cursor-pointer' : 'cursor-help',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (unlocked) setPreviewOpen(true);
      }}
      aria-label={
        unlocked
          ? `${achievement.title} — unlocked. Open foil card.`
          : `${achievement.title}. ${chipHowTo}`
      }
    >
      {unlocked ? (
        <Icon className="h-2.5 w-2.5 shrink-0 opacity-80" strokeWidth={2} />
      ) : (
        <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground dark:text-slate-400" />
      )}
      <span className="truncate">{achievement.title}</span>
    </button>
  );

  const trigger = variant === 'chip' ? chip : cell;

  const detailBody = (
    <>
      <div className="space-y-1">
        <p className="text-sm font-headline font-bold uppercase leading-tight text-foreground">
          {achievement.title}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{achievement.description}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={cn('text-[10px] h-5 capitalize', cat.label)}>
          {achievement.category}
        </Badge>
        {starter && (
          <Badge variant="secondary" className="text-[10px] h-5">
            Starter
          </Badge>
        )}
        {achievement.inkReward > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 border-orange-500/35 text-orange-300">
            +{achievement.inkReward} Ink
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] h-5">
          +{achievement.xpReward} XP
        </Badge>
      </div>

      <p
        className={cn(
          'text-xs font-code font-bold',
          unlocked ? 'text-emerald-400' : 'text-amber-200/90'
        )}
      >
        {statusLabel}
      </p>

      {!unlocked && achievement.howTo && (
        <p className="text-xs text-sky-100/90 leading-relaxed border-t border-white/10 pt-2">
          <span className="font-bold uppercase text-[10px] text-sky-300 block mb-1">How to unlock</span>
          {achievement.howTo}
        </p>
      )}
    </>
  );

  return (
    <>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side={variant === 'chip' ? 'right' : 'top'}
          align="center"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            'z-[2300]',
            variant === 'chip'
              ? 'max-w-[220px]'
              : cn(
                  'p-4 space-y-3 pointer-events-auto',
                  unlocked
                    ? 'max-w-[min(calc(100vw-1.5rem),24rem)]'
                    : 'max-w-[min(calc(100vw-2rem),22rem)]'
                )
          )}
        >
          {variant === 'chip' ? (
            <>
              <p className="text-[11px] font-bold leading-snug">{achievement.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {achievement.description}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{chipHowTo}</p>
            </>
          ) : (
            <>
              {detailBody}

              {unlocked && (
                <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-[10px] font-bold uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 h-9 text-[10px] font-bold uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewOpen(true);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> PNG
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full h-9 text-[10px] font-bold uppercase"
                    disabled={postingFeed || !user}
                    onClick={(e) => {
                      e.stopPropagation();
                      void shareToFeed();
                    }}
                  >
                    <Radio className="h-3.5 w-3.5 mr-1.5" />
                    {postingFeed ? 'Posting foil…' : 'Share to feed'}
                  </Button>
                </div>
              )}
            </>
          )}
        </TooltipContent>
      </Tooltip>

      {unlocked && !previewOpen && postingFeed && (
        <div
          className="pointer-events-none fixed left-[-99999px] top-0 w-[400px] opacity-0"
          aria-hidden
        >
          <AchievementFoilCard
            ref={cardRef}
            achievement={achievement}
            displayName={displayName}
            rankLabel={rankLabel}
            xp={xp}
            streak={streak}
            unlockedAt={unlockedAt}
          />
        </div>
      )}

      {unlocked && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-headline uppercase tracking-wide">
                {achievement.title}
              </DialogTitle>
              <DialogDescription>
                Preview your foil card, then share the image to your feed, copy text, or download a PNG.
                No lyrics included.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={cn('text-[10px] h-5 capitalize', cat.label)}>
                  {achievement.category}
                </Badge>
                {achievement.inkReward > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-orange-500/35 text-orange-300">
                    +{achievement.inkReward} Ink
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] h-5">
                  +{achievement.xpReward} XP
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 text-emerald-300 border-emerald-500/30">
                  {statusLabel}
                </Badge>
              </div>

              <AchievementFoilCard
                ref={cardRef}
                achievement={achievement}
                displayName={displayName}
                rankLabel={rankLabel}
                xp={xp}
                streak={streak}
                unlockedAt={unlockedAt}
              />

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={postingFeed || !user}
                  onClick={() => void shareToFeed()}
                >
                  <Radio className="h-4 w-4 mr-2" />
                  {postingFeed ? 'Posting foil…' : 'Share to feed'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void copySummary()}>
                  <Copy className="h-4 w-4 mr-2" /> Copy text
                </Button>
                <Button size="sm" disabled={exporting} onClick={() => void downloadPng()}>
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Saving…' : 'Download PNG'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
