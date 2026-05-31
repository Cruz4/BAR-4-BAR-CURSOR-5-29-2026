'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatUnlockDate } from '@/lib/gamification/achievement-card-theme';
import type { AchievementDef } from '@/lib/gamification/achievements';
import { Lock, Trophy } from 'lucide-react';

type AchievementBadgeCellProps = {
  achievement: AchievementDef;
  unlocked: boolean;
  lockedPro: boolean;
  unlockedAt?: string;
  compact?: boolean;
  className?: string;
};

export function AchievementBadgeCell({
  achievement,
  unlocked,
  lockedPro,
  unlockedAt,
  compact = false,
  className,
}: AchievementBadgeCellProps) {
  const statusLabel = unlocked
    ? 'Unlocked'
    : lockedPro
      ? 'Studio Pro required'
      : 'Locked — keep writing';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'rounded-lg border p-2 text-center space-y-1 cursor-help transition-colors hover:border-primary/40 min-w-0 overflow-hidden',
            unlocked ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-muted/10 opacity-70 hover:opacity-90',
            compact && 'p-1.5',
            className
          )}
        >
          {lockedPro && !unlocked ? (
            <Lock className={cn('mx-auto text-muted-foreground', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          ) : (
            <Trophy
              className={cn(
                'mx-auto',
                compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
                unlocked ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          )}
          <p
            className={cn(
              'font-bold uppercase leading-tight line-clamp-2 break-words hyphens-auto',
              compact ? 'text-[8px]' : 'text-[9px]'
            )}
          >
            {achievement.title}
          </p>
          {lockedPro && !unlocked && (
            <Badge variant="outline" className="text-[7px] h-4">
              Pro
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] space-y-1.5 p-3">
        <p className="text-xs font-bold uppercase tracking-wide">{achievement.title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{achievement.description}</p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Badge variant="outline" className="text-[9px] h-5 capitalize">
            {achievement.category}
          </Badge>
          {achievement.inkReward > 0 && (
            <Badge variant="outline" className="text-[9px] h-5">
              +{achievement.inkReward} Ink
            </Badge>
          )}
        </div>
        <p className="text-[10px] font-code pt-0.5">
          {unlocked ? (
            <span className="text-emerald-400">Unlocked {formatUnlockDate(unlockedAt)}</span>
          ) : (
            <span className="text-amber-200/80">{statusLabel}</span>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
