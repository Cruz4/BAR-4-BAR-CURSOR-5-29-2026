'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { isProUser } from '@/lib/subscription';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import {
  LIFETIME_MILESTONES,
  MONTHLY_CHALLENGES,
  WEEKLY_CHALLENGES,
} from '@/lib/gamification/challenges';
import { rankFromXp, STUDIO_RANKS, xpProgressInRank } from '@/lib/gamification/ranks';
import { AchievementBadgeCell } from '@/components/gamification/achievement-badge-cell';
import { ChallengeSection, LeaderboardCompareCard } from '@/components/gamification/challenge-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StudioLoader } from '@/components/studio-loader';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CalendarRange,
  ChevronLeft,
  Flame,
  Infinity,
  Music,
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

const RANK_BADGE: Record<string, string> = {
  open_mic: 'border-slate-400/40 bg-slate-500/10 text-slate-200',
  demo_tape: 'border-sky-500/45 bg-sky-500/12 text-sky-300',
  session_ready: 'border-cyan-500/45 bg-cyan-500/12 text-cyan-200',
  headliner: 'border-amber-500/45 bg-amber-500/12 text-amber-300',
  vault_architect: 'border-violet-500/50 bg-violet-500/15 text-violet-200',
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
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary mb-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Vault
            </Link>
            <h1 className="text-2xl md:text-3xl font-headline font-bold uppercase tracking-tight flex items-center gap-2">
              <Trophy className="h-7 w-7 text-amber-400" />
              Studio Progress
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Weekly goals, monthly arcs, lifetime milestones, and trophies — plus how you stack up against the
              community.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-[10px] font-bold uppercase" asChild>
              <Link href="/leaderboard">Full leaderboard</Link>
            </Button>
            <Button size="sm" variant="ghost" className="text-[10px] font-bold uppercase" asChild>
              <Link href="/usage?tab=settings">Profile settings</Link>
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card/50 to-violet-500/[0.06]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-headline uppercase">Your studio standing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-primary/15 bg-black/30 px-3 py-2.5 space-y-2 md:col-span-2 min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('text-[9px] font-bold uppercase', RANK_BADGE[rank.id])}>
                  {rankLabel}
                </Badge>
                {summary.currentStreak > 0 && (
                  <Badge variant="outline" className="border-orange-500/45 text-orange-200 text-[9px] gap-1">
                    <Flame className="h-3 w-3" /> {summary.currentStreak}d streak
                  </Badge>
                )}
                <span className="text-[11px] font-code font-bold">{summary.xp.toLocaleString()} XP</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 via-primary to-violet-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-code leading-snug break-words">
                {nextRank
                  ? `${Math.max(0, next - current).toLocaleString()} XP to ${nextRank.label}`
                  : 'Top rank — keep building.'}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {STUDIO_RANKS.map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    className={cn(
                      'text-[7px] h-4 px-1.5',
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
                  label="Bars (7 days)"
                  rank={ranks?.barsWritten7d ?? null}
                  value={summary.barsWritten7d}
                  hidden={hidden}
                />
                <LeaderboardCompareCard
                  label="Streak"
                  rank={ranks?.longestStreak ?? null}
                  value={summary.currentStreak}
                  unit="d"
                  hidden={hidden}
                />
                <LeaderboardCompareCard
                  label="Tracks (30 days)"
                  rank={ranks?.tracksCompleted30d ?? null}
                  value={summary.tracksCompleted30d}
                  hidden={hidden}
                />
                <LeaderboardCompareCard
                  label="Total XP"
                  rank={ranks?.xp ?? null}
                  value={summary.xp}
                  hidden={hidden}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChallengeSection
            title="Weekly goals"
            subtitle="Resets every Monday (UTC)"
            icon={<Calendar className="h-4 w-4 text-emerald-400" />}
            challenges={WEEKLY_CHALLENGES}
            summary={summary}
            isPro={isPro}
            accentClass="border-emerald-500/20"
          />
          <ChallengeSection
            title="Monthly challenges"
            subtitle="Resets on the 1st of each month"
            icon={<CalendarRange className="h-4 w-4 text-violet-400" />}
            challenges={MONTHLY_CHALLENGES}
            summary={summary}
            isPro={isPro}
            accentClass="border-violet-500/20"
          />
          <ChallengeSection
            title="Lifetime milestones"
            subtitle="Grand achievements — no reset"
            icon={<Infinity className="h-4 w-4 text-amber-400" />}
            challenges={LIFETIME_MILESTONES}
            summary={summary}
            isPro={isPro}
            accentClass="border-amber-500/20"
          />
        </div>

        <section className="rounded-xl border border-violet-500/20 bg-card/40 overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/5 bg-black/20 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sparkles className="h-4 w-4 text-violet-300 shrink-0" />
              <div className="min-w-0 overflow-hidden">
                <h2 className="text-sm font-headline font-bold uppercase tracking-tight">Studio trophies</h2>
                <p className="text-[10px] text-muted-foreground leading-snug break-words">
                  Hover any badge for how to unlock · {achievementCount}/{ACHIEVEMENTS.length} earned
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] shrink-0 max-w-full truncate">
              Activation · Retention · Pro
            </Badge>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 min-w-0">
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
          <div className="px-4 pb-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground border-t border-white/5 pt-3 mx-4 mb-4">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-sky-400" /> Activation — first wins
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-400" /> Retention — streaks & sessions
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3 text-fuchsia-400" /> Pro — vault & sharing
            </span>
            <span className="flex items-center gap-1">
              <Music className="h-3 w-3 text-primary" /> Ink rewards on select badges
            </span>
          </div>
        </section>

        {hidden && (
          <p className="text-[10px] text-center text-muted-foreground italic">
            You are hidden from the public leaderboard. Rankings above are only visible to you until you opt in under
            Settings → Studio Profile.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
