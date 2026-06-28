'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { isProUser } from '@/lib/subscription';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { rankFromXp, STUDIO_RANKS, xpProgressInRank } from '@/lib/gamification/ranks';
import {
  RANK_BADGE,
  STREAK_BADGE,
  XP_LABEL,
} from '@/lib/gamification/badge-styles';
import { AchievementBadgeCell } from '@/components/gamification/achievement-badge-cell';
import { ChallengeGoalsPanel } from '@/components/gamification/challenge-goals-panel';
import { StudioSharingSection } from '@/components/gamification/studio-profile-section';
import { LeaderboardCompareCard } from '@/components/gamification/challenge-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StudioLoader } from '@/components/studio-loader';
import { cn } from '@/lib/utils';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import {
  ChevronLeft,
  Flame,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

type UserRank = { rank: number; total: number; value: number } | null;

type LeaderboardPayload = {
  weekKey: string;
  userRanks?: {
    barsWritten7d: UserRank;
    longestStreak: UserRank;
    tracksCompleted30d: UserRank;
    xp: UserRank;
  };
};


export function StudioProgressBoard() {
  const { user } = useAuth();
  const { summary, rankLabel, loading } = useGamification();
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [lbLoading, setLbLoading] = useState(true);

  const isPro = isProUser(user);
  const unlocked = summary?.unlockedAchievements || {};

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLbLoading(true);
    fetch(`/api/gamification/leaderboard?userId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLeaderboard(data);
      })
      .catch(() => {
        if (!cancelled) setLeaderboard(null);
      })
      .finally(() => {
        if (!cancelled) setLbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const badgeGrid = useMemo(
    () =>
      ACHIEVEMENTS.map((a) => ({
        ...a,
        unlocked: Boolean(unlocked[a.id]),
        lockedPro: Boolean(a.proOnly && !isPro),
        unlockedAt: unlocked[a.id],
      })),
    [unlocked, isPro]
  );

  if (!user || loading) {
    return (
      <div className="flex justify-center py-24">
        <StudioLoader />
      </div>
    );
  }

  const rank = rankFromXp(summary.xp, isPro);
  const { current, next } = xpProgressInRank(summary.xp, rank);
  const nextRank = STUDIO_RANKS[STUDIO_RANKS.findIndex((r) => r.id === rank.id) + 1];
  const xpPercent = next ? Math.min(100, Math.round((current / next) * 100)) : 100;
  const achievementCount = Object.keys(unlocked).length;
  const ranks = leaderboard?.userRanks;
  const hidden = summary.leaderboardHidden;

  return (
    <TooltipProvider delayDuration={280} disableHoverableContent={false}>
      <div className="space-y-7 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary mb-2"
            >
              <ChevronLeft className="h-4 w-4" /> Vault
            </Link>
            <h1 className="text-3xl md:text-4xl font-headline font-bold uppercase tracking-tight flex items-center gap-2.5">
              <Trophy className="h-8 w-8 text-amber-400" />
              Studio Progress
            </h1>
            <p className="text-base text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
              Weekly goals, monthly arcs, lifetime milestones, and trophies — plus how you stack up against the
              community. Writing goals count <strong className="text-foreground/90 font-semibold">hand-typed</strong> lines only; AI-generated lines are tracked separately.
            </p>
          </div>
          <Button variant="outline" className="text-xs font-bold uppercase" asChild>
            <Link href="/leaderboard">Full leaderboard</Link>
          </Button>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card/50 to-violet-500/[0.06]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-headline uppercase">Your studio standing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-muted/80 to-sky-100/60 dark:from-black/40 dark:to-sky-950/20 px-3.5 py-3 space-y-2.5 md:col-span-2 min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', RANK_BADGE[rank.id])}>
                  {rankLabel}
                </Badge>
                {summary.currentStreak > 0 && (
                  <Badge variant="outline" className={cn('text-[10px] gap-1', STREAK_BADGE)}>
                    <Flame className="h-3.5 w-3.5" /> {summary.currentStreak}d streak
                  </Badge>
                )}
                <span className={cn('text-xs', XP_LABEL)}>{summary.xp.toLocaleString()} XP</span>
              </div>
              <div className="h-2 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 via-primary to-violet-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground font-code leading-snug break-words">
                {nextRank
                  ? `${Math.max(0, next - current).toLocaleString()} XP to ${nextRank.label}`
                  : 'Top rank — keep building.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold uppercase tracking-wide">
                <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-800 dark:text-emerald-300/90">
                  Written: {linesToRhymeBars(summary.lifetimeBarsWritten).toLocaleString()} bars
                </span>
                <span className="rounded border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-violet-800 dark:text-violet-300/90">
                  Generated: {linesToRhymeBars(summary.lifetimeLinesGenerated || 0).toLocaleString()} bars
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STUDIO_RANKS.map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    className={cn(
                      'text-[8px] h-5 px-2',
                      summary.xp >= r.minXp ? 'border-primary/30 text-primary/90' : 'opacity-40'
                    )}
                  >
                    {r.label}
                  </Badge>
                ))}
              </div>
            </div>

            {lbLoading ? (
              <div className="md:col-span-2 flex items-center justify-center py-6">
                <StudioLoader size="sm" />
              </div>
            ) : (
              <>
                <LeaderboardCompareCard
                  label="Written bars (7 days)"
                  rank={ranks?.barsWritten7d ?? null}
                  value={summary.barsWritten7d}
                  formatValue={linesToRhymeBars}
                  hidden={hidden}
                  comfortable
                />
                <LeaderboardCompareCard
                  label="Streak"
                  rank={ranks?.longestStreak ?? null}
                  value={summary.currentStreak}
                  unit="d"
                  hidden={hidden}
                  comfortable
                />
                <LeaderboardCompareCard
                  label="Tracks (30 days)"
                  rank={ranks?.tracksCompleted30d ?? null}
                  value={summary.tracksCompleted30d}
                  hidden={hidden}
                  comfortable
                />
                <LeaderboardCompareCard
                  label="Total XP"
                  rank={ranks?.xp ?? null}
                  value={summary.xp}
                  hidden={hidden}
                  comfortable
                />
              </>
            )}
          </CardContent>
        </Card>

        <section className="rounded-xl border border-violet-500/20 bg-card/40 overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b border-white/5 bg-black/20 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Sparkles className="h-5 w-5 text-violet-300 shrink-0" />
              <div className="min-w-0 overflow-hidden">
                <h2 className="text-lg font-headline font-bold uppercase tracking-tight">Studio trophies</h2>
                <p className="text-xs text-muted-foreground leading-snug break-words mt-0.5">
                  Green border + Done = unlocked · dashed border + Locked = still earning · hover for details and share
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs shrink-0 font-mono">
              {achievementCount}/{ACHIEVEMENTS.length} earned
            </Badge>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
            {badgeGrid.map((b) => (
              <AchievementBadgeCell
                key={b.id}
                achievement={b}
                unlocked={b.unlocked}
                lockedPro={b.lockedPro}
                unlockedAt={b.unlockedAt}
              />
            ))}
          </div>
          <div className="px-4 pb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground border-t border-white/5 pt-3.5 mx-4 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border-2 border-emerald-500/70 bg-emerald-950/40" /> Unlocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-white/30 bg-black/40" /> Locked
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-sky-400" /> Activation
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-400" /> Retention
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-fuchsia-400" /> Pro
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Mastery
            </span>
          </div>
        </section>

        <ChallengeGoalsPanel summary={summary} isPro={isPro} />

        <StudioSharingSection />

        {hidden && (
          <p className="text-[11px] text-center text-muted-foreground italic">
            You are hidden from the public leaderboard. Rankings above are only visible to you until you turn off Hide
            from leaderboard in Sharing &amp; visibility above.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
