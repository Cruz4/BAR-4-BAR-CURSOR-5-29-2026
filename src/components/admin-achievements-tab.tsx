'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { isAchievementStarter } from '@/lib/gamification/achievements';
import { STUDIO_RANKS } from '@/lib/gamification/ranks';
import type { AdminGamificationRosterEntry } from '@/lib/gamification/admin-roster-types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, Minus, RefreshCw, Search, Trophy } from 'lucide-react';
import { StudioLoader } from '@/components/studio-loader';

type AdminAchievementsTabProps = {
  stats: Record<string, AdminGamificationRosterEntry>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

function rankLabel(rankId: string | undefined): string {
  return STUDIO_RANKS.find((r) => r.id === (rankId || 'open_mic'))?.label ?? 'Open Mic';
}

function abbrevTitle(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return title.slice(0, 8);
  return words.map((w) => w[0]).join('').slice(0, 6).toUpperCase();
}

export function AdminAchievementsTab({
  stats,
  loading,
  refreshing,
  onRefresh,
}: AdminAchievementsTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'has_trophies' | 'none'>('all');

  const rows = useMemo(() => {
    return Object.entries(stats)
      .map(([userId, entry]) => ({ userId, ...entry }))
      .filter((row) => {
        const q = search.trim().toLowerCase();
        if (q) {
          const hay = `${row.displayName} ${row.email}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        const unlockedCount = Object.keys(row.unlockedAchievements || {}).length;
        if (filter === 'active' && row.status === 'blocked') return false;
        if (filter === 'blocked' && row.status !== 'blocked') return false;
        if (filter === 'has_trophies' && unlockedCount === 0) return false;
        if (filter === 'none' && unlockedCount > 0) return false;
        return true;
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [stats, search, filter]);

  const summary = useMemo(() => {
    const all = Object.values(stats);
    const withTrophies = all.filter((e) => Object.keys(e.unlockedAchievements || {}).length > 0);
    const totalUnlocks = all.reduce(
      (acc, e) => acc + Object.keys(e.unlockedAchievements || {}).length,
      0
    );
    return {
      artists: all.length,
      withTrophies: withTrophies.length,
      totalUnlocks,
    };
  }, [stats]);

  const achievementCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of ACHIEVEMENTS) counts[a.id] = 0;
    for (const entry of Object.values(stats)) {
      for (const id of Object.keys(entry.unlockedAchievements || {})) {
        if (counts[id] !== undefined) counts[id] += 1;
      }
    }
    return counts;
  }, [stats]);

  if (loading && Object.keys(stats).length === 0) {
    return (
      <div className="py-20 text-center">
        <StudioLoader size="md" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-4">
          Loading studio trophy progress…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/60 border border-white/10">
          <CardContent className="pt-5 pb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1">
              All artists
            </p>
            <p className="text-2xl font-headline font-bold text-white">{summary.artists}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border border-amber-500/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300/80 mb-1">
              With trophies
            </p>
            <p className="text-2xl font-headline font-bold text-amber-300">{summary.withTrophies}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border border-emerald-500/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-300/80 mb-1">
              Total unlocks
            </p>
            <p className="text-2xl font-headline font-bold text-emerald-300">{summary.totalUnlocks}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-2 shadow-2xl">
        <CardHeader className="border-b flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              Studio Trophy Matrix
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-widest mt-1">
              Every artist × every achievement — hover headers for full trophy names
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search artist…"
                className="h-9 w-44 pl-8 text-[10px] font-bold bg-background/50"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="h-9 w-36 text-[9px] font-bold uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All artists</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="blocked">Blocked only</SelectItem>
                <SelectItem value="has_trophies">Has trophies</SelectItem>
                <SelectItem value="none">No trophies</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-[9px] font-bold uppercase"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card min-w-[160px]">Artist</TableHead>
                <TableHead className="min-w-[72px]">XP</TableHead>
                <TableHead className="min-w-[88px]">Rank</TableHead>
                <TableHead className="min-w-[56px] text-center">Count</TableHead>
                {ACHIEVEMENTS.map((achievement) => (
                  <TableHead key={achievement.id} className="text-center min-w-[52px] px-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="mx-auto flex flex-col items-center gap-0.5 cursor-help"
                        >
                          <span className="text-[8px] font-bold uppercase leading-none text-muted-foreground">
                            {abbrevTitle(achievement.title)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[7px] h-4 px-1 border-white/10"
                          >
                            {achievementCounts[achievement.id] ?? 0}
                          </Badge>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] p-2 space-y-1">
                        <p className="text-[10px] font-bold text-amber-200">{achievement.title}</p>
                        <p className="text-[9px] text-muted-foreground leading-snug">
                          {achievement.description}
                        </p>
                        <p className="text-[8px] text-emerald-300/90">
                          {achievementCounts[achievement.id] ?? 0} artists unlocked
                        </p>
                        {isAchievementStarter(achievement.id) && (
                          <Badge variant="secondary" className="text-[7px] h-4">
                            Starter
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => {
                  const unlocked = row.unlockedAchievements || {};
                  const unlockedCount = Object.keys(unlocked).length;
                  return (
                    <TableRow key={row.userId} className="border-b border-white/5 hover:bg-white/5">
                      <TableCell className="sticky left-0 z-10 bg-card">
                        <div className="font-bold text-white uppercase text-[10px] leading-tight">
                          {row.displayName}
                        </div>
                        <div className="text-[8px] text-muted-foreground truncate max-w-[150px]">
                          {row.email}
                        </div>
                        {row.status === 'blocked' && (
                          <Badge variant="outline" className="text-[7px] h-4 mt-1 border-red-500/40 text-red-400">
                            Blocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-white">
                        {row.xp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="inline-flex w-fit items-center whitespace-nowrap text-[7px] leading-none px-2 py-0.5 border-amber-500/30 text-amber-300 uppercase font-bold tracking-wide"
                        >
                          {rankLabel(row.rankId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-amber-300">
                        {unlockedCount}/{ACHIEVEMENTS.length}
                      </TableCell>
                      {ACHIEVEMENTS.map((achievement) => {
                        const unlockedAt = unlocked[achievement.id];
                        const isUnlocked = Boolean(unlockedAt);
                        return (
                          <TableCell key={achievement.id} className="text-center p-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'mx-auto flex h-7 w-7 items-center justify-center rounded-md border',
                                    isUnlocked
                                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                      : 'border-white/5 bg-white/[0.02] text-white/20'
                                  )}
                                >
                                  {isUnlocked ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Minus className="h-3 w-3" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] p-2">
                                <p className="text-[10px] font-bold">{achievement.title}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  {row.displayName}
                                </p>
                                {isUnlocked ? (
                                  <p className="text-[8px] text-emerald-400 mt-1 font-code">
                                    Unlocked {format(new Date(unlockedAt), 'MM/dd/yyyy')}
                                  </p>
                                ) : (
                                  <p className="text-[8px] text-muted-foreground mt-1">Not unlocked</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4 + ACHIEVEMENTS.length}
                    className="h-24 text-center text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    No artists match this filter
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
