'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useGamification } from '@/context/gamification-context';
import { WEEKLY_CHALLENGES, getChallengeProgress } from '@/lib/gamification/challenges';
import { Target } from 'lucide-react';

type WeeklyChallengesCardProps = {
  compact?: boolean;
  className?: string;
};

export function WeeklyChallengesCard({ compact = false, className }: WeeklyChallengesCardProps) {
  const { summary } = useGamification();

  if (compact) {
    return (
      <div className={cn('rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 flex-1 min-w-0', className)}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Target className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[9px] font-headline uppercase text-primary font-bold tracking-wide">Weekly Challenges</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1.5">
          {WEEKLY_CHALLENGES.map((c) => {
            const progress = getChallengeProgress(summary, c);
            const pct = Math.min(100, (progress / c.target) * 100);
            return (
              <div key={c.id} className="min-w-0 space-y-0.5">
                <div className="flex justify-between gap-2 text-[8px] font-code leading-none">
                  <span className="text-muted-foreground truncate">{c.label}</span>
                  <span className="font-bold shrink-0">{progress}/{c.target}</span>
                </div>
                <Progress value={pct} className="h-0.5 bg-primary/10" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border-primary/20 bg-primary/5', className)}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-headline uppercase flex items-center gap-2 text-primary">
          <Target className="h-4 w-4" /> Weekly Self-Challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        {WEEKLY_CHALLENGES.map((c) => {
          const progress = getChallengeProgress(summary, c);
          const pct = Math.min(100, (progress / c.target) * 100);
          return (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between text-[10px] font-code">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-bold">{progress}/{c.target}</span>
              </div>
              <Progress value={pct} className="h-1 bg-primary/10" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
