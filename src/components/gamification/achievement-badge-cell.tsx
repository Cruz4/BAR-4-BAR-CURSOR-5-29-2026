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
import { getAchievementCardTheme, formatUnlockDate } from '@/lib/gamification/achievement-card-theme';
import { achievementIcon } from '@/lib/gamification/achievement-icons';
import { isAchievementStarter, type AchievementDef } from '@/lib/gamification/achievements';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Copy, Download, Lock } from 'lucide-react';

type AchievementBadgeCellProps = {
  achievement: AchievementDef;
  unlocked: boolean;
  lockedPro: boolean;
  unlockedAt?: string;
  compact?: boolean;
  comfortable?: boolean;
  className?: string;
};

const CATEGORY_PILL: Record<AchievementDef['category'], string> = {
  activation: 'border-sky-500/35 bg-sky-500/12 text-sky-300',
  retention: 'border-amber-500/35 bg-amber-500/12 text-amber-300',
  conversion: 'border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-300',
  mastery: 'border-violet-500/35 bg-violet-500/12 text-violet-300',
};

export function AchievementBadgeCell({
  achievement,
  unlocked,
  lockedPro,
  unlockedAt,
  compact = false,
  comfortable = false,
  className,
}: AchievementBadgeCellProps) {
  const { user } = useAuth();
  const { summary, rankLabel } = useGamification();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const starter = isAchievementStarter(achievement.id);
  const roomy = comfortable && !compact;
  const theme = getAchievementCardTheme(achievement);
  const Icon = achievementIcon(achievement.icon);
  const displayName = user?.displayName || 'Studio Artist';
  const xp = summary.xp;
  const streak = summary.currentStreak;

  const statusLabel = unlocked
    ? 'Unlocked'
    : lockedPro
      ? 'Studio Pro required'
      : 'Locked — keep writing';

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
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'group relative rounded-lg border text-center cursor-help transition-all min-w-0 overflow-hidden',
            roomy ? 'p-2.5' : compact ? 'p-1.5' : 'p-2',
            unlocked
              ? 'hover:scale-[1.02] hover:shadow-lg'
              : 'opacity-75 hover:opacity-95',
            className
          )}
          style={{
            borderColor: unlocked ? `${theme.accent}44` : 'rgba(255,255,255,0.08)',
            background: unlocked
              ? `linear-gradient(145deg, ${theme.accentSoft} 0%, rgba(2,6,23,0.55) 100%)`
              : 'rgba(255,255,255,0.03)',
            boxShadow: unlocked ? `0 0 0 1px ${theme.accent}22` : undefined,
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: theme.accent, opacity: unlocked ? 1 : 0.45 }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-2 -top-3 text-lg font-headline font-bold opacity-[0.12] select-none"
            style={{ color: theme.accent }}
            aria-hidden
          >
            {theme.watermark}
          </div>

          <div className="relative space-y-1.5">
            <div
              className={cn(
                'mx-auto flex items-center justify-center rounded-lg border',
                compact ? 'h-7 w-7' : roomy ? 'h-10 w-10' : 'h-8 w-8'
              )}
              style={{
                borderColor: `${theme.accent}44`,
                backgroundColor: theme.accentSoft,
                boxShadow: unlocked ? `0 0 16px ${theme.glow}` : undefined,
              }}
            >
              {lockedPro && !unlocked ? (
                <Lock
                  className={cn(
                    'text-muted-foreground',
                    compact ? 'h-3.5 w-3.5' : roomy ? 'h-5 w-5' : 'h-4 w-4'
                  )}
                />
              ) : (
                <Icon
                  className={cn(
                    compact ? 'h-3.5 w-3.5' : roomy ? 'h-5 w-5' : 'h-4 w-4'
                  )}
                  style={{ color: unlocked ? theme.accent : 'rgba(255,255,255,0.45)' }}
                />
              )}
            </div>

            <p
              className={cn(
                'font-bold uppercase leading-tight line-clamp-2 break-words hyphens-auto',
                compact ? 'text-[8px]' : roomy ? 'text-xs' : 'text-[9px]',
                unlocked ? 'text-white' : 'text-muted-foreground'
              )}
            >
              {achievement.title}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-1">
              <Badge
                variant="outline"
                className={cn(
                  'text-[6px] h-4 px-1 uppercase tracking-wider border',
                  CATEGORY_PILL[achievement.category]
                )}
              >
                {theme.categoryLabel}
              </Badge>
              {starter && !unlocked && !lockedPro && (
                <Badge variant="secondary" className={cn(roomy ? 'text-[7px] h-4' : 'text-[6px] h-3.5')}>
                  Starter
                </Badge>
              )}
              {lockedPro && !unlocked && (
                <Badge variant="outline" className={cn(roomy ? 'text-[7px] h-4' : 'text-[6px] h-3.5')}>
                  Pro
                </Badge>
              )}
              {unlocked && achievement.inkReward > 0 && (
                <Badge
                  variant="outline"
                  className="text-[6px] h-4 border-orange-500/30 text-orange-300"
                >
                  +{achievement.inkReward}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="center"
        sideOffset={10}
        collisionPadding={20}
        className="p-0 border-0 bg-transparent shadow-none max-w-[min(calc(100vw-1.5rem),340px)] pointer-events-auto z-[2300]"
      >
        <div className="rounded-xl border border-white/10 bg-[#0a1018]/98 backdrop-blur-md p-2.5 space-y-2.5 shadow-2xl">
          <AchievementFoilCard
            ref={cardRef}
            achievement={achievement}
            displayName={displayName}
            rankLabel={rankLabel}
            xp={xp}
            streak={streak}
            unlockedAt={unlockedAt}
            locked={!unlocked}
            lockedPro={lockedPro}
            compact
            showStats={unlocked}
          />

          <div className="px-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn('text-[9px] h-5 capitalize border', CATEGORY_PILL[achievement.category])}>
                {achievement.category}
              </Badge>
              {starter && (
                <Badge variant="secondary" className="text-[9px] h-5">
                  Starter
                </Badge>
              )}
              {achievement.inkReward > 0 && (
                <Badge variant="outline" className="text-[9px] h-5 border-orange-500/30 text-orange-300">
                  +{achievement.inkReward} Ink
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] h-5 border-white/15">
                +{achievement.xpReward} XP
              </Badge>
            </div>

            <p className="text-[10px] font-code">
              {unlocked ? (
                <span className="text-emerald-400">Unlocked {formatUnlockDate(unlockedAt)}</span>
              ) : (
                <span className="text-amber-200/80">{statusLabel}</span>
              )}
            </p>

            {!unlocked && achievement.howTo && (
              <p className="text-[10px] text-sky-200/90 leading-snug border-t border-white/10 pt-2">
                <span className="font-bold uppercase text-[9px] text-sky-300/80">How: </span>
                {achievement.howTo}
              </p>
            )}

            {unlocked && (
              <div className="flex gap-2 pt-1 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[9px] font-bold uppercase tracking-wider"
                  onClick={() => void copySummary()}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 h-8 text-[9px] font-bold uppercase tracking-wider"
                  disabled={exporting}
                  onClick={() => void downloadPng()}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {exporting ? 'Saving…' : 'PNG'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
