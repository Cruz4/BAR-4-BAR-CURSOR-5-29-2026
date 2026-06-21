'use client';

import React, { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AchievementFoilCard } from '@/components/gamification/achievement-foil-card';
import {
  buildAchievementShareText,
  downloadAchievementCardPng,
} from '@/lib/gamification/achievement-card-export';
import { formatUnlockDate } from '@/lib/gamification/achievement-card-theme';
import { achievementIcon } from '@/lib/gamification/achievement-icons';
import { isAchievementStarter, type AchievementDef } from '@/lib/gamification/achievements';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CheckCircle2, Copy, Download, Lock } from 'lucide-react';

type AchievementBadgeCellProps = {
  achievement: AchievementDef;
  unlocked: boolean;
  lockedPro: boolean;
  unlockedAt?: string;
  className?: string;
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
};

export function AchievementBadgeCell({
  achievement,
  unlocked,
  lockedPro,
  unlockedAt,
  className,
}: AchievementBadgeCellProps) {
  const { user } = useAuth();
  const { summary, rankLabel } = useGamification();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const starter = isAchievementStarter(achievement.id);
  const cat = CATEGORY_CELL[achievement.category];
  const Icon = achievementIcon(achievement.icon);
  const displayName = user?.displayName || 'Studio Artist';
  const xp = summary.xp;
  const streak = summary.currentStreak;

  const statusLabel = unlocked
    ? `Unlocked ${formatUnlockDate(unlockedAt)}`
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

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'relative rounded-xl border-2 p-3 min-h-[108px] flex flex-col gap-2 cursor-help transition-all',
            unlocked
              ? cn('border-emerald-500/70 bg-emerald-950/30 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]', cat.bg)
              : lockedPro
                ? 'border-dashed border-orange-500/40 bg-black/50 opacity-90'
                : 'border-dashed border-white/25 bg-black/45 opacity-80',
            className
          )}
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
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={16}
        className="max-w-[min(calc(100vw-2rem),22rem)] p-4 space-y-3 pointer-events-auto z-[2300]"
      >
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

        {unlocked && (
          <div className="flex gap-2 pt-1 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-[10px] font-bold uppercase"
              onClick={() => void copySummary()}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 h-9 text-[10px] font-bold uppercase"
              disabled={exporting}
              onClick={() => void downloadPng()}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {exporting ? 'Saving…' : 'PNG'}
            </Button>
          </div>
        )}

        {unlocked && (
          <div
            className="pointer-events-none fixed left-0 top-0 -z-50 w-[360px] opacity-0"
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
              compact
            />
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
