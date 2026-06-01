'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ChallengeDef } from '@/lib/gamification/challenges';
import {
  getChallengePercent,
  getChallengeProgress,
  isChallengeComplete,
  resolveChallengeTarget,
  TIER_LABELS,
} from '@/lib/gamification/challenges';
import type { GamificationSummary } from '@/lib/gamification/types';
import { CheckCircle2, Circle, Crown, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TIER_STYLE: Record<ChallengeDef['tier'], string> = {
  standard: 'border-white/10 bg-black/20',
  epic: 'border-violet-500/25 bg-violet-950/20',
  legendary: 'border-amber-500/30 bg-amber-950/15 shadow-[0_0_16px_rgba(251,191,36,0.08)]',
};

const TIER_ICON = {
  standard: Circle,
  epic: Star,
  legendary: Crown,
} as const;

type ChallengeRowProps = {
  challenge: ChallengeDef;
  summary: GamificationSummary;
  isPro?: boolean;
};

export function ChallengeRow({ challenge, summary, isPro = false }: ChallengeRowProps) {
  const done = isChallengeComplete(summary, challenge, isPro);
  const progress = getChallengeProgress(summary, challenge, isPro);
  const percent = getChallengePercent(summary, challenge, isPro);
  const TierIcon = TIER_ICON[challenge.tier];
  const target = resolveChallengeTarget(challenge, isPro);
  const isRankGoal = challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect';

  const progressLabel = isRankGoal
    ? done
      ? 'Complete'
      : `${summary.xp.toLocaleString()} / ${challenge.target.toLocaleString()} XP`
    : `${progress}/${target}`;

  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-2.5 space-y-2 transition-colors',
        done ? 'border-emerald-500/30 bg-emerald-950/15' : TIER_STYLE[challenge.tier]
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <TierIcon className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  'text-[11px] font-bold leading-tight break-words',
                  done ? 'text-emerald-200' : 'text-white/90'
                )}
              >
                {challenge.label}
              </p>
              {challenge.tier !== 'standard' && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[7px] h-4 px-1.5 uppercase shrink-0',
                    challenge.tier === 'legendary' ? 'border-amber-500/40 text-amber-300' : 'border-violet-500/40 text-violet-300'
                  )}
                >
                  {TIER_LABELS[challenge.tier]}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug break-words">{challenge.description}</p>
          </div>
        </div>
        <span
          className={cn(
            'text-[10px] font-mono shrink-0 tabular-nums whitespace-nowrap sm:text-right sm:pl-2',
            done ? 'text-emerald-400' : 'text-muted-foreground'
          )}
        >
          {progressLabel}
        </span>
      </div>
      {!done && (
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              challenge.tier === 'legendary'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                : challenge.tier === 'epic'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-400'
                  : 'bg-gradient-to-r from-sky-600 to-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </li>
  );
}

type ChallengeSectionProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  challenges: ChallengeDef[];
  summary: GamificationSummary;
  isPro?: boolean;
  accentClass?: string;
};

export function ChallengeSection({
  title,
  subtitle,
  icon,
  challenges,
  summary,
  isPro,
  accentClass = 'border-primary/20',
}: ChallengeSectionProps) {
  const completed = challenges.filter((c) => isChallengeComplete(summary, c, isPro)).length;

  return (
    <section className={cn('rounded-xl border bg-card/40 overflow-hidden min-w-0', accentClass)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/5 bg-black/20 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="shrink-0">{icon}</span>
          <div className="min-w-0 overflow-hidden">
            <h2 className="text-sm font-headline font-bold uppercase tracking-tight truncate">{title}</h2>
            <p className="text-[10px] text-muted-foreground leading-snug break-words">{subtitle}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] font-mono shrink-0">
          {completed}/{challenges.length}
        </Badge>
      </div>
      <ul className="p-3 space-y-2">
        {challenges.map((challenge) => (
          <ChallengeRow key={challenge.id} challenge={challenge} summary={summary} isPro={isPro} />
        ))}
      </ul>
    </section>
  );
}

export function LeaderboardCompareCard({
  label,
  rank,
  value,
  unit = '',
  hidden,
  formatValue = (v: number) => v,
}: {
  label: string;
  rank: { rank: number; total: number; value: number } | null;
  value?: number;
  unit?: string;
  hidden?: boolean;
  formatValue?: (value: number) => number;
}) {
  const displayValue = formatValue(value ?? rank?.value ?? 0);

  return (
    <div className="rounded-lg border border-orange-500/20 bg-gradient-to-br from-black/40 to-orange-950/15 px-3 py-2.5 space-y-1 min-w-0 overflow-hidden">
      <p className="text-[9px] font-bold uppercase tracking-wide text-orange-300/80 truncate">{label}</p>
      {hidden ? (
        <p className="text-[10px] text-muted-foreground italic break-words">Hidden from leaderboard</p>
      ) : rank ? (
        <>
          <p className="text-lg font-headline font-bold text-orange-200 leading-tight">
            #{rank.rank}
            <span className="text-sm font-normal text-muted-foreground"> / {rank.total}</span>
          </p>
          <p className="text-[10px] font-code text-muted-foreground leading-snug break-words">
            {displayValue.toLocaleString()}
            {unit} · top {Math.max(1, Math.round((rank.rank / rank.total) * 100))}% this week
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">Not ranked yet</p>
          <p className="text-[10px] font-code text-muted-foreground/80 leading-snug break-words">
            You: {displayValue.toLocaleString()}
            {unit} — write this week to appear
          </p>
        </>
      )}
    </div>
  );
}
