'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGamification } from '@/context/gamification-context';
import { Flame, Trophy } from 'lucide-react';

type StudioRankBadgeProps = {
  className?: string;
  showStreak?: boolean;
};

export function StudioRankBadge({ className, showStreak = true }: StudioRankBadgeProps) {
  const { summary, rankLabel, loading } = useGamification();

  if (loading) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Badge variant="outline" className="border-primary/30 text-primary text-[9px] font-bold uppercase gap-1">
        <Trophy className="h-3 w-3" />
        {rankLabel}
      </Badge>
      {showStreak && summary.currentStreak > 0 && (
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase gap-1">
          <Flame className="h-3 w-3" />
          {summary.currentStreak}d streak
        </Badge>
      )}
    </div>
  );
}
