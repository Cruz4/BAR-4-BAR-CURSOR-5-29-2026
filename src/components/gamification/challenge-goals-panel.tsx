'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ChallengeDef, ChallengeTier } from '@/lib/gamification/challenges';
import {
  getChallengePercent,
  isChallengeComplete,
  LIFETIME_MILESTONES,
  MONTHLY_CHALLENGES,
  WEEKLY_CHALLENGES,
} from '@/lib/gamification/challenges';
import type { GamificationSummary } from '@/lib/gamification/types';
import { ChallengeRow } from '@/components/gamification/challenge-row';
import { ArrowUpDown, Calendar, CalendarRange, Infinity } from 'lucide-react';

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

type GoalSortId =
  | 'default'
  | 'completed-first'
  | 'incomplete-first'
  | 'tier-high'
  | 'tier-low'
  | 'progress-high'
  | 'progress-low'
  | 'title';

const GOAL_SORT_STORAGE_KEY = 'b4b-studio-goal-sort';

const GOAL_SORT_OPTIONS: Array<{ id: GoalSortId; label: string }> = [
  { id: 'default', label: 'Catalog order' },
  { id: 'completed-first', label: 'Completed first' },
  { id: 'incomplete-first', label: 'In progress first' },
  { id: 'tier-high', label: 'Tier · legendary → standard' },
  { id: 'tier-low', label: 'Tier · standard → legendary' },
  { id: 'progress-high', label: 'Progress · high → low' },
  { id: 'progress-low', label: 'Progress · low → high' },
  { id: 'title', label: 'Title A–Z' },
];

const TIER_ORDER: Record<ChallengeTier, number> = {
  standard: 0,
  epic: 1,
  legendary: 2,
};

function parseGoalSort(raw: string | null): GoalSortId {
  if (GOAL_SORT_OPTIONS.some((o) => o.id === raw)) return raw as GoalSortId;
  return 'default';
}

function compareChallenges(
  a: ChallengeDef,
  b: ChallengeDef,
  summary: GamificationSummary,
  isPro: boolean,
  sort: GoalSortId
): number {
  const doneA = isChallengeComplete(summary, a, isPro);
  const doneB = isChallengeComplete(summary, b, isPro);
  const completeCmp = Number(doneB) - Number(doneA);
  const pctA = getChallengePercent(summary, a, isPro);
  const pctB = getChallengePercent(summary, b, isPro);

  switch (sort) {
    case 'completed-first':
      return completeCmp || a.label.localeCompare(b.label);
    case 'incomplete-first':
      return -completeCmp || a.label.localeCompare(b.label);
    case 'tier-high':
      return TIER_ORDER[b.tier] - TIER_ORDER[a.tier] || a.label.localeCompare(b.label);
    case 'tier-low':
      return TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.label.localeCompare(b.label);
    case 'progress-high':
      return pctB - pctA || a.label.localeCompare(b.label);
    case 'progress-low':
      return pctA - pctB || a.label.localeCompare(b.label);
    case 'title':
      return a.label.localeCompare(b.label);
    case 'default':
    default:
      return 0;
  }
}

function sortChallenges(
  challenges: ChallengeDef[],
  summary: GamificationSummary,
  isPro: boolean,
  sort: GoalSortId
): ChallengeDef[] {
  if (sort === 'default') return challenges;
  return [...challenges].sort((a, b) => compareChallenges(a, b, summary, isPro, sort));
}

type ChallengeGoalsPanelProps = {
  summary: GamificationSummary;
  isPro?: boolean;
};

export function ChallengeGoalsPanel({ summary, isPro = false }: ChallengeGoalsPanelProps) {
  const [goalSort, setGoalSort] = useState<GoalSortId>('default');

  useEffect(() => {
    try {
      setGoalSort(parseGoalSort(localStorage.getItem(GOAL_SORT_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
  }, []);

  const handleGoalSortChange = useCallback((next: string) => {
    const id = parseGoalSort(next);
    setGoalSort(id);
    try {
      localStorage.setItem(GOAL_SORT_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const completedByGroup = (challenges: ChallengeDef[]) =>
    challenges.filter((c) => isChallengeComplete(summary, c, isPro)).length;

  const sortedGroups = useMemo(
    () =>
      GOAL_GROUPS.map((group) => ({
        ...group,
        challenges: sortChallenges(group.challenges, summary, isPro, goalSort),
      })),
    [summary, isPro, goalSort]
  );

  const totalGoals = GOAL_GROUPS.reduce((n, g) => n + g.challenges.length, 0);
  const totalDone = GOAL_GROUPS.reduce((n, g) => n + completedByGroup(g.challenges), 0);

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-3.5 border-b border-white/5 bg-black/20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-headline font-bold uppercase tracking-tight">Studio goals</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Weekly, monthly, and lifetime progress. Completed goals can be shared to your feed.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-initial">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <Select value={goalSort} onValueChange={handleGoalSortChange}>
              <SelectTrigger
                className="h-8 w-full min-w-0 text-[10px] font-bold uppercase tracking-wide bg-black/30 border-white/10 sm:w-[13.5rem]"
                aria-label="Sort studio goals"
              >
                <SelectValue placeholder="Sort goals" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
            {totalDone}/{totalGoals} done
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-muted/40 border-b border-white/5 rounded-none p-2">
          {sortedGroups.map((group) => {
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

        {sortedGroups.map((group) => (
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
