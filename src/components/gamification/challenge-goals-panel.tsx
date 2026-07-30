'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChallengeDef } from '@/lib/gamification/challenges';
import {
  isChallengeComplete,
  LIFETIME_MILESTONES,
  MONTHLY_CHALLENGES,
  WEEKLY_CHALLENGES,
} from '@/lib/gamification/challenges';
import type { GamificationSummary } from '@/lib/gamification/types';
import { ChallengeRow } from '@/components/gamification/challenge-row';
import { Calendar, CalendarRange, Infinity } from 'lucide-react';

type GoalsGroup = {
  id: 'weekly' | 'monthly' | 'lifetime';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  challenges: ChallengeDef[];
  accentClass: string;
};

const GOAL_GROUPS: GoalsGroup[] = [
  {
    id: 'weekly',
    title: 'Weekly',
    subtitle: 'Resets Monday UTC',
    icon: <Calendar className="h-4 w-4 text-emerald-400" />,
    challenges: WEEKLY_CHALLENGES,
    accentClass: 'border-emerald-500/25',
  },
  {
    id: 'monthly',
    title: 'Monthly',
    subtitle: 'Resets 1st of month',
    icon: <CalendarRange className="h-4 w-4 text-violet-400" />,
    challenges: MONTHLY_CHALLENGES,
    accentClass: 'border-violet-500/25',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    subtitle: 'Never resets',
    icon: <Infinity className="h-4 w-4 text-amber-400" />,
    challenges: LIFETIME_MILESTONES,
    accentClass: 'border-amber-500/25',
  },
];

type ChallengeGoalsPanelProps = {
  summary: GamificationSummary;
  isPro?: boolean;
};

export function ChallengeGoalsPanel({ summary, isPro = false }: ChallengeGoalsPanelProps) {
  const completedByGroup = (challenges: ChallengeDef[]) =>
    challenges.filter((c) => isChallengeComplete(summary, c, isPro)).length;

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-white/5 bg-black/20">
        <h2 className="text-base font-headline font-bold uppercase tracking-tight">Studio goals</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Weekly, monthly, and lifetime progress.
        </p>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-muted/40 border-b border-white/5 rounded-none p-2">
          {GOAL_GROUPS.map((group) => {
            const done = completedByGroup(group.challenges);
            return (
              <TabsTrigger
                key={group.id}
                value={group.id}
                className="flex flex-col items-start gap-0.5 py-2.5 px-3 text-left data-[state=active]:bg-background/80 h-auto"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                  {group.icon}
                  {group.title}
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {done}/{group.challenges.length} done
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {GOAL_GROUPS.map((group) => (
          <TabsContent key={group.id} value={group.id} className="m-0 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">{group.title} goals</p>
                <p className="text-xs text-muted-foreground">{group.subtitle}</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] font-mono', group.accentClass)}>
                {completedByGroup(group.challenges)}/{group.challenges.length}
              </Badge>
            </div>
            <ul
              className={cn(
                'gap-2.5',
                group.id === 'lifetime' ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-2.5'
              )}
            >
              {group.challenges.map((challenge) => (
                <ChallengeRow
                  key={challenge.id}
                  challenge={challenge}
                  summary={summary}
                  isPro={isPro}
                  comfortable
                />
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
