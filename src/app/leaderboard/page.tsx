'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudioLoader } from '@/components/studio-loader';
import { Trophy, Flame, Music, ChevronLeft, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { cn } from '@/lib/utils';
import { LeaderboardHeatBackground } from '@/components/studio-page-background';
import { linesToRhymeBars } from '@/lib/lyrics-units';

type Entry = {
  userId: string;
  displayName?: string;
  profileSlug?: string;
  barsWritten7d?: number;
  currentStreak?: number;
  tracksCompleted30d?: number;
  xp?: number;
};

type LeaderboardData = {
  weekKey: string;
  barsWritten7d: Entry[];
  longestStreak: Entry[];
  tracksCompleted30d: Entry[];
};

const EMBERS = [
  { left: '8%', delay: '0s', size: 10, duration: '5.5s' },
  { left: '22%', delay: '1.2s', size: 8, duration: '6.5s' },
  { left: '48%', delay: '0.6s', size: 9, duration: '5s' },
  { left: '71%', delay: '2s', size: 8, duration: '7s' },
  { left: '88%', delay: '0.3s', size: 9, duration: '6s' },
  { left: '35%', delay: '1.8s', size: 7, duration: '5.8s' },
  { left: '62%', delay: '2.4s', size: 10, duration: '6.2s' },
];

function rankStyle(index: number) {
  if (index === 0) {
    return {
      row: 'border-amber-400/35 bg-amber-500/[0.08] shadow-[0_0_28px_rgba(251,191,36,0.12)]',
      badge: 'border-amber-400/60 bg-amber-500/20 text-amber-300',
      value: 'text-amber-300',
      icon: Crown,
    };
  }
  if (index === 1) {
    return {
      row: 'border-orange-500/25 bg-orange-500/[0.06]',
      badge: 'border-orange-500/50 bg-orange-500/15 text-orange-300',
      value: 'text-orange-300',
      icon: Flame,
    };
  }
  if (index === 2) {
    return {
      row: 'border-red-500/20 bg-red-500/[0.05]',
      badge: 'border-red-500/40 bg-red-500/10 text-red-300',
      value: 'text-red-300',
      icon: Flame,
    };
  }
  return {
    row: 'border-white/5 bg-black/20 hover:border-orange-500/20 hover:bg-orange-500/5',
    badge: 'border-white/10 bg-black/30 text-muted-foreground',
    value: 'text-orange-400/90',
    icon: null,
  };
}

function LeaderboardArtistName({ row }: { row: Entry }) {
  const name = row.displayName || 'Artist';
  if (row.profileSlug) {
    return (
      <Link
        href={`/profile/${row.profileSlug}`}
        className="font-bold text-sm uppercase truncate text-white/90 hover:text-primary transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
      >
        {name}
      </Link>
    );
  }
  return <span className="font-bold text-sm uppercase truncate text-white/90">{name}</span>;
}

function LeaderboardTable({
  rows,
  valueKey,
  unit = '',
}: {
  rows: Entry[];
  valueKey: keyof Entry;
  unit?: string;
}) {
  const maxValue = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r[valueKey] || 0))),
    [rows, valueKey]
  );

  if (!rows.length) {
    return (
      <div className="text-center py-14 space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full border border-orange-500/30 bg-orange-500/10 flex items-center justify-center">
          <Flame className="h-7 w-7 text-orange-400/60" />
        </div>
        <p className="text-sm text-orange-200/50 uppercase tracking-widest font-bold">
          The board is cold — write bars this week to heat it up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => {
        const rawValue = Number(row[valueKey] || 0);
        const value =
          valueKey === 'barsWritten7d' ? linesToRhymeBars(rawValue) : rawValue;
        const heatPct = Math.min(100, (rawValue / maxValue) * 100);
        const style = rankStyle(i);
        const RankIcon = style.icon;

        return (
          <div
            key={row.userId}
            className={cn(
              'relative flex items-center justify-between overflow-hidden rounded-xl border px-4 py-3 transition-colors',
              style.row
            )}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 opacity-50 blur-[1px]"
              style={{ width: `${heatPct}%` }}
            >
              <div className="h-full w-full bg-gradient-to-r from-orange-500/30 via-amber-500/15 to-transparent" />
            </div>
            <div className="relative flex items-center gap-3 min-w-0">
              <Badge
                variant="outline"
                className={cn('w-9 h-9 shrink-0 justify-center font-mono text-xs p-0', style.badge)}
              >
                {RankIcon ? <RankIcon className="h-3.5 w-3.5" /> : i + 1}
              </Badge>
              <LeaderboardArtistName row={row} />
            </div>
            <div className={cn('relative flex items-center gap-1.5 font-code font-bold tabular-nums', style.value)}>
              {valueKey === 'currentStreak' && <Flame className="h-3.5 w-3.5 shrink-0" />}
              {valueKey === 'barsWritten7d' && <Music className="h-3.5 w-3.5 shrink-0 opacity-70" />}
              {valueKey === 'tracksCompleted30d' && <Trophy className="h-3.5 w-3.5 shrink-0 opacity-70" />}
              <span>
                {value}
                {unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const tabTriggerClass =
  'inline-flex h-full w-full items-center justify-center gap-1.5 rounded-[6px] py-0 text-[10px] font-bold uppercase tracking-wide text-orange-200/50 transition-all data-[state=active]:bg-orange-500/90 data-[state=active]:text-white data-[state=active]:shadow-[0_0_24px_rgba(249,115,22,0.35)]';

const heatCardClass =
  'border-orange-500/20 bg-black/35 backdrop-blur-sm shadow-[0_0_40px_rgba(249,115,22,0.06)] overflow-hidden relative';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = user ? `?userId=${user.id}` : '';
        const res = await fetch(`/api/gamification/leaderboard${q}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    };
    void load();
    if (user) {
      void trackStudioEvent(ANALYTICS_EVENTS.LEADERBOARD_VIEW, {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <StudioLoader />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <LeaderboardHeatBackground />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 overflow-hidden" aria-hidden>
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="leaderboard-ember absolute bottom-10 rounded-full bg-gradient-to-t from-orange-600/80 to-amber-200/90 blur-[1px]"
            style={{
              left: e.left,
              width: e.size,
              height: e.size,
              animationDelay: e.delay,
              animationDuration: e.duration,
            }}
          />
        ))}
      </div>

      <div className="container relative z-10 mx-auto max-w-3xl py-10 px-4 space-y-8">
        <div className="flex items-start gap-4">
          <Link
            href="/"
            className="mt-1 text-orange-300/60 hover:text-orange-300 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 blur-md bg-orange-500/50 rounded-full scale-150" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/40 bg-gradient-to-br from-orange-600/30 to-red-900/40 shadow-[0_0_24px_rgba(249,115,22,0.35)]">
                  <Flame className="h-7 w-7 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-headline font-bold uppercase leaderboard-fire-title">
                  Studio Leaderboard
                </h1>
                <p className="text-[10px] text-orange-200/50 font-code uppercase tracking-[0.25em] mt-0.5 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-400" /> Heat rankings · creative progress only
                </p>
              </div>
            </div>
            <p className="text-xs text-orange-100/40 font-code pl-[3.75rem]">
              Week of {data?.weekKey || '—'} · Not Ink spent — bars, streaks, and finished tracks
            </p>
          </div>
        </div>

        <Tabs defaultValue="bars" className="space-y-4">
          <TabsList className="grid h-11 w-full grid-cols-3 rounded-lg border border-orange-500/25 bg-black/40 p-1 shadow-[inset_0_0_20px_rgba(249,115,22,0.08)]">
            <TabsTrigger value="bars" className={tabTriggerClass}>
              <Music className="h-3 w-3 shrink-0" /> Bars (7d)
            </TabsTrigger>
            <TabsTrigger value="streak" className={tabTriggerClass}>
              <Flame className="h-3 w-3 shrink-0" /> Streak
            </TabsTrigger>
            <TabsTrigger value="tracks" className={tabTriggerClass}>
              <Trophy className="h-3 w-3 shrink-0" /> Tracks (30d)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bars">
            <Card className={heatCardClass}>
              <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
              <CardHeader>
                <CardTitle className="text-sm uppercase text-amber-200/90 flex items-center gap-2">
                  <Music className="h-4 w-4 text-orange-400" /> Hand-written bars this week
                </CardTitle>
                <CardDescription className="text-orange-200/40">
                  Rhyme bars saved this week (2 lines = 1 bar) — hottest writers rise to the top.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaderboardTable rows={data?.barsWritten7d || []} valueKey="barsWritten7d" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streak">
            <Card className={heatCardClass}>
              <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
              <CardHeader>
                <CardTitle className="text-sm uppercase text-amber-200/90 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" /> Longest active streak
                </CardTitle>
                <CardDescription className="text-orange-200/40">
                  Consecutive days in the booth — keep the flame alive.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaderboardTable rows={data?.longestStreak || []} valueKey="currentStreak" unit="d" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracks">
            <Card className={heatCardClass}>
              <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
              <CardHeader>
                <CardTitle className="text-sm uppercase text-amber-200/90 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-orange-400" /> Tracks completed (30d)
                </CardTitle>
                <CardDescription className="text-orange-200/40">
                  Finished tracks in the last 30 days — vault heat, not vanity metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaderboardTable rows={data?.tracksCompleted30d || []} valueKey="tracksCompleted30d" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-[10px] text-orange-200/35 text-center font-code">
          Opt out anytime in Studio Progress → Sharing &amp; visibility → Hide from leaderboard. Names link to public profiles when enabled.
        </p>
      </div>
    </div>
  );
}
