'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { isProUser } from '@/lib/subscription';
import { rankFromXp } from '@/lib/gamification/ranks';
import { rankBadgeClass, STREAK_BADGE } from '@/lib/gamification/badge-styles';
import { Flame, Trophy } from 'lucide-react';

type StudioRankBadgeProps = {
  className?: string;
  showStreak?: boolean;
};

export function StudioRankBadge({ className, showStreak = true }: StudioRankBadgeProps) {
  const { summary, rankLabel, loading } = useGamification();
  const { user } = useAuth();
  const rank = rankFromXp(summary.xp, isProUser(user));

  if (loading) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Badge
        variant="outline"
        className={cn('text-[9px] font-bold uppercase gap-1', rankBadgeClass(rank.id))}
      >
        <Trophy className="h-3 w-3" />
        {rankLabel}
      </Badge>
      {showStreak && summary.currentStreak > 0 && (
        <Badge variant="outline" className={cn('text-[9px] font-bold uppercase gap-1', STREAK_BADGE)}>
          <Flame className="h-3 w-3" />
          {summary.currentStreak}d streak
        </Badge>
      )}
    </div>
  );
}
