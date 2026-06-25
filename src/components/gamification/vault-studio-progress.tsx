'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { WEEKLY_CHALLENGES, LIFETIME_MILESTONES, getChallengeProgress, isChallengeComplete, resolveChallengeTarget } from '@/lib/gamification/challenges';
import { rankFromXp, STUDIO_RANKS, xpProgressInRank } from '@/lib/gamification/ranks';
import { ACHIEVEMENTS, type AchievementDef } from '@/lib/gamification/achievements';
import { isProUser } from '@/lib/subscription';
import { CheckCircle2, Circle, Flame, Lock, Trophy, ChevronRight, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const RECENT_EARN_MS = 48 * 60 * 60 * 1000;

const RANK_BADGE: Record<string, string> = {
  open_mic: 'border-slate-400/40 bg-slate-500/10 text-slate-200',
  demo_tape: 'border-sky-500/45 bg-sky-500/12 text-sky-300',
  session_ready: 'border-cyan-500/45 bg-cyan-500/12 text-cyan-200',
  headliner: 'border-amber-500/45 bg-amber-500/12 text-amber-300',
  vault_architect: 'border-violet-500/50 bg-violet-500/15 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.2)]',
};

const ACHIEVEMENT_CATEGORY: Record<AchievementDef['category'], string> = {
  activation: 'border-sky-500/45 bg-sky-500/12 text-sky-200',
  retention: 'border-amber-500/45 bg-amber-500/12 text-amber-200',
  conversion: 'border-fuchsia-500/45 bg-fuchsia-500/12 text-fuchsia-200',
};

const ACHIEVEMENT_CATEGORY_LOCKED: Record<AchievementDef['category'], string> = {
  activation: 'border-sky-500/25 bg-sky-950/35 text-slate-200',
  retention: 'border-amber-500/25 bg-amber-950/35 text-slate-200',
  conversion: 'border-fuchsia-500/25 bg-fuchsia-950/35 text-slate-200',
};

function shortRankLabel(label: string): string {
  const first = label.split(' ')[0] || label;
  return first.length > 8 ? first.slice(0, 7) : first;
}

export function VaultStudioProgress({
  variant = 'banner',
  tourForceExpanded = false,
}: {
  variant?: 'banner' | 'sidebar';
  /** Vault guided tour — expand panel so the spotlight covers the full progress card. */
  tourForceExpanded?: boolean;
}) {
  const { user } = useAuth();
  const { summary, rankLabel, loading } = useGamification();
  const isSidebar = variant === 'sidebar';
  const [expanded, setExpanded] = useState(false);
  const initializedRef = useRef(false);
  const xpRingGradientId = useId();

  useEffect(() => {
    if (tourForceExpanded) setExpanded(true);
  }, [tourForceExpanded]);

  const showExpanded = tourForceExpanded || expanded;

  const unlocked = summary?.unlockedAchievements || {};

  const hasRecentEarn = useMemo(() => {
    const now = Date.now();
    return Object.values(unlocked).some((iso) => now - new Date(iso).getTime() < RECENT_EARN_MS);
  }, [unlocked]);

  useEffect(() => {
    if (initializedRef.current || loading) return;
    initializedRef.current = true;
    if (hasRecentEarn) setExpanded(true);
  }, [hasRecentEarn, loading]);

  useEffect(() => {
    const onUnlock = () => setExpanded(true);
    window.addEventListener('b4b-achievement-unlock', onUnlock);
    return () => window.removeEventListener('b4b-achievement-unlock', onUnlock);
  }, []);

  const { unlockedBadges, lockedPreview } = useMemo(() => {
    const unlockedList = ACHIEVEMENTS.filter((a) => unlocked[a.id]).sort(
      (a, b) => (unlocked[b.id] || '').localeCompare(unlocked[a.id] || '')
    );
    const lockedList = ACHIEVEMENTS.filter((a) => !unlocked[a.id]).slice(0, 4);
    return { unlockedBadges: unlockedList, lockedPreview: lockedList };
  }, [unlocked]);

  if (!user || loading) return null;

  const isPro = isProUser(user);
  const rank = rankFromXp(summary.xp, isPro);
  const { current, next } = xpProgressInRank(summary.xp, rank);
  const nextRank = STUDIO_RANKS[STUDIO_RANKS.findIndex((r) => r.id === rank.id) + 1];
  const achievementCount = Object.keys(unlocked).length;
  const xpPercent = next ? Math.min(100, Math.round((current / next) * 100)) : 100;

  const xpShort = summary.xp >= 1000 ? `${(summary.xp / 1000).toFixed(summary.xp >= 10000 ? 0 : 1)}k` : String(summary.xp);
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - xpPercent / 100);

  const sidebarBubble = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            'group relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-full',
            'border-2 transition-all duration-300 hover:scale-105',
            'border-primary/25 bg-gradient-to-br from-white via-sky-50/95 to-violet-100/75',
            'shadow-[0_4px_18px_rgba(59,130,246,0.1),0_0_20px_rgba(139,92,246,0.06)]',
            'hover:border-primary/40 hover:shadow-[0_4px_22px_rgba(59,130,246,0.16),0_0_28px_rgba(139,92,246,0.1)]',
            'dark:border-primary/35 dark:from-black/90 dark:via-violet-950/50 dark:to-black/90',
            'dark:shadow-[0_4px_28px_rgba(0,0,0,0.45),0_0_32px_rgba(139,92,246,0.25)]',
            'dark:hover:border-primary/55 dark:hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]',
            hasRecentEarn &&
              'border-amber-500/45 shadow-[0_0_22px_rgba(251,191,36,0.18)] dark:border-amber-400/50 dark:shadow-[0_0_36px_rgba(251,191,36,0.35)]'
          )}
          aria-label={`Studio progress: ${rankLabel}, ${summary.xp.toLocaleString()} XP. Click to expand.`}
          aria-expanded={false}
        >
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 64 64"
            aria-hidden
          >
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              fill="none"
              className="stroke-slate-200/90 dark:stroke-white/10"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              fill="none"
              stroke={`url(#${xpRingGradientId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id={xpRingGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <Trophy className="relative h-5 w-5 text-amber-600 drop-shadow-[0_0_6px_rgba(245,158,11,0.25)] dark:text-amber-400 dark:drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          {summary.currentStreak > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-orange-400/55 bg-orange-100 shadow-[0_0_8px_rgba(249,115,22,0.18)] dark:border-orange-500/50 dark:bg-orange-950/80 dark:shadow-[0_0_10px_rgba(249,115,22,0.35)]">
              <Flame className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            </span>
          )}
          {hasRecentEarn && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-px text-[7px] font-black uppercase tracking-wide text-white dark:bg-amber-400 dark:text-black">
              New
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Studio Progress</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {rankLabel} · {summary.xp.toLocaleString()} XP
        </p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">Click to expand</p>
      </TooltipContent>
    </Tooltip>
  );

  const headerBlock = (
    <div
      className={cn(
        'flex flex-row items-center justify-between gap-2 cursor-pointer select-none min-w-0 border-b border-border',
        isSidebar ? 'px-2.5 py-2 bg-muted/40' : 'px-3 py-2 bg-muted/30'
      )}
      onClick={() => {
        if (!tourForceExpanded) setExpanded((v) => !v);
      }}
      aria-expanded={showExpanded}
    >
      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            !showExpanded && '-rotate-90'
          )}
          aria-hidden
        />
        <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            className={cn(
              'font-headline uppercase tracking-tight text-foreground truncate leading-none',
              isSidebar ? 'text-[11px]' : 'text-[10px]'
            )}
          >
            {isSidebar && !showExpanded ? 'Progress' : 'Studio Progress'}
          </p>
          {!showExpanded && (
            <p className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground truncate leading-tight mt-0.5">
              {isSidebar
                ? `${shortRankLabel(rankLabel)} · ${xpShort} XP`
                : `${rankLabel} · ${summary.xp.toLocaleString()} XP · ${achievementCount}/${ACHIEVEMENTS.length} badges`}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className={cn(
          'h-6 px-1.5 font-bold uppercase tracking-wider text-muted-foreground hover:text-primary shrink-0',
          isSidebar ? 'text-[9px]' : 'text-[8px]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Link href="/studio-progress">
          {isSidebar ? 'All' : 'View all'}
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );

  const bodyBlock = showExpanded && (
    <div
      className={cn(
        'grid gap-2 px-3 pb-3 pt-2 min-w-0',
        isSidebar ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
      )}
    >
        <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-muted/80 to-sky-100/60 dark:from-black/40 dark:to-sky-950/20 px-2.5 py-2 space-y-1.5 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                isSidebar ? 'text-[10px] font-bold uppercase gap-1 px-2 py-0 h-5' : 'text-[9px] font-bold uppercase gap-1 px-2 py-0 h-5',
                RANK_BADGE[rank.id] ?? RANK_BADGE.open_mic
              )}
            >
              <Trophy className="h-3 w-3" />
              {rankLabel}
            </Badge>
            {summary.currentStreak > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  'border-orange-500/45 bg-orange-500/12 text-orange-200 font-bold uppercase gap-1 px-2 py-0 h-5 shadow-[0_0_10px_rgba(249,115,22,0.15)]',
                  isSidebar ? 'text-[10px]' : 'text-[9px]'
                )}
              >
                <Flame className="h-3 w-3" />
                {summary.currentStreak}d
              </Badge>
            )}
            <span className={cn('font-code text-sky-800 dark:text-sky-100/90 font-bold', isSidebar ? 'text-[11px]' : 'text-[10px]')}>
              {summary.xp.toLocaleString()} XP
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-600 via-primary to-violet-500 transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <p className={cn('text-muted-foreground font-code leading-snug break-words', isSidebar ? 'text-[11px]' : 'text-[10px]')}>
            {nextRank ? (
              <>
                {Math.max(0, next - current).toLocaleString()} XP to{' '}
                <span className="text-primary">{nextRank.label}</span>
              </>
            ) : (
              'Top rank — keep building.'
            )}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-500/15 bg-gradient-to-br from-muted/80 to-emerald-100/50 dark:from-black/40 dark:to-emerald-950/15 px-2.5 py-2 min-w-0 overflow-hidden">
          <p className={cn('font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-1.5 leading-snug', isSidebar ? 'text-[10px]' : 'text-[9px]')}>
            <span className="block sm:inline">Weekly goals</span>
            <span className="block sm:inline font-normal normal-case tracking-normal text-muted-foreground sm:before:content-['·_']">
              Mon reset
            </span>
          </p>
          <ul className="space-y-1 min-w-0">
            {WEEKLY_CHALLENGES.map((challenge) => {
              const progress = getChallengeProgress(summary, challenge, isPro);
              const done = isChallengeComplete(summary, challenge, isPro);
              const target = resolveChallengeTarget(challenge, isPro);
              return (
                <li key={challenge.id} className="flex items-center gap-2 min-h-[18px] min-w-0">
                  {done ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground/35 shrink-0" aria-hidden />
                  )}
                  <p
                    className={cn(
                      'font-code leading-snug truncate flex-1 min-w-0',
                      isSidebar ? 'text-[11px]' : 'text-[10px]',
                      done ? 'text-emerald-700 dark:text-emerald-300/95' : 'text-foreground/90'
                    )}
                  >
                    {challenge.label}
                  </p>
                  <span
                    className={cn(
                      'font-mono shrink-0 tabular-nums whitespace-nowrap',
                      isSidebar ? 'text-[10px]' : 'text-[9px]',
                      done ? 'text-emerald-400/80' : 'text-muted-foreground'
                    )}
                  >
                    {progress}/{target}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {isSidebar && (
          <div className="rounded-lg border border-amber-500/15 bg-gradient-to-br from-muted/80 to-amber-100/50 dark:from-black/40 dark:to-amber-950/15 px-2.5 py-2 min-w-0 overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200 mb-1.5 leading-snug">
              Personal milestones
            </p>
            <ul className="space-y-1 min-w-0">
              {LIFETIME_MILESTONES.map((challenge) => {
                const progress = getChallengeProgress(summary, challenge, isPro);
                const target = resolveChallengeTarget(challenge, isPro);
                const done = isChallengeComplete(summary, challenge, isPro);
                const isRankGoal =
                  challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect';
                const progressLabel = isRankGoal
                  ? done
                    ? 'Done'
                    : `${summary.xp.toLocaleString()}/${challenge.target.toLocaleString()}`
                  : `${progress}/${target}`;
                return (
                  <li key={challenge.id} className="flex items-center gap-2 min-h-[18px] min-w-0">
                    {done ? (
                      <CheckCircle2 className="h-3 w-3 text-amber-400 shrink-0" aria-hidden />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground/35 shrink-0" aria-hidden />
                    )}
                    <p
                      className={cn(
                        'text-[11px] font-code leading-snug truncate flex-1 min-w-0',
                        done ? 'text-amber-800 dark:text-amber-200/95' : 'text-foreground/90'
                      )}
                    >
                      {challenge.label}
                    </p>
                    <span
                      className={cn(
                        'text-[10px] font-mono shrink-0 tabular-nums whitespace-nowrap',
                        done ? 'text-amber-400/80' : 'text-muted-foreground'
                      )}
                    >
                      {progressLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div
          className={cn(
            'rounded-lg border border-violet-500/20 bg-gradient-to-r from-violet-100/70 via-muted/60 to-fuchsia-100/50 dark:from-violet-950/25 dark:via-black/30 dark:to-fuchsia-950/20 px-2.5 py-2 min-w-0 overflow-hidden',
            !isSidebar && 'md:col-span-2'
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
            <p className={cn('font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300/90 shrink-0', isSidebar ? 'text-[10px]' : 'text-[9px]')}>
              Achievements
            </p>
            <span className={cn('font-mono text-violet-700/80 dark:text-violet-200/60 tabular-nums shrink-0 whitespace-nowrap', isSidebar ? 'text-[10px]' : 'text-[9px]')}>
              {achievementCount}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {unlockedBadges.map((a) => (
              <Badge
                key={a.id}
                variant="outline"
                className={cn(
                  'inline-flex max-w-full min-w-0 h-auto min-h-5 py-0.5 px-2 font-bold uppercase',
                  isSidebar ? 'text-[9px]' : 'text-[8px]',
                  ACHIEVEMENT_CATEGORY[a.category]
                )}
                title={a.description}
              >
                <Trophy className="h-2.5 w-2.5 mr-1 shrink-0 opacity-80" />
                <span className="truncate">{a.title}</span>
              </Badge>
            ))}
            {unlockedBadges.length === 0 && (
              <p className={cn('text-muted-foreground/80 italic py-0.5 break-words', isSidebar ? 'text-[11px]' : 'text-[10px]')}>
                Write, generate, and explore — badges unlock as you go.
              </p>
            )}
            {lockedPreview.map((a) => (
              <Badge
                key={`locked-${a.id}`}
                variant="outline"
                className={cn(
                  'inline-flex max-w-full min-w-0 h-auto min-h-5 py-0.5 px-2 font-bold uppercase',
                  isSidebar ? 'text-[9px]' : 'text-[8px]',
                  ACHIEVEMENT_CATEGORY_LOCKED[a.category]
                )}
                title={a.description}
              >
                <Lock className="h-2.5 w-2.5 mr-1 shrink-0 text-slate-400" />
                <span className="truncate">{a.title}</span>
              </Badge>
            ))}
          </div>
        </div>
    </div>
  );

  const cardClassName = cn(
    'mb-0 border rounded-xl shadow-none shrink-0',
    isSidebar
      ? 'w-[236px] 2xl:w-[256px] overflow-visible border-border bg-card/95'
      : 'overflow-hidden mb-4 border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card/50 to-amber-500/[0.06] shadow-[0_0_32px_rgba(59,130,246,0.08)]'
  );

  if (isSidebar && !showExpanded) {
    return (
      <div
        className="mr-40 2xl:mr-48 shrink-0 -translate-y-2 2xl:-translate-y-4"
        data-tour="vault-progress-desktop"
      >
        {sidebarBubble}
      </div>
    );
  }

  return (
    <Card
      data-tour={isSidebar ? 'vault-progress-desktop' : 'vault-progress-mobile'}
      className={cn(
        cardClassName,
        isSidebar && 'animate-in fade-in slide-in-from-left-2 duration-200',
        tourForceExpanded && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
      )}
    >
      {headerBlock}
      {bodyBlock}
    </Card>
  );
}
