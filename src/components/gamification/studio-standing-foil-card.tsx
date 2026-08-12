'use client';

import React from 'react';
import type { RankId } from '@/lib/gamification/types';
import { STUDIO_RANKS, xpProgressInRank } from '@/lib/gamification/ranks';
import { getStudioPassId, getBoothStatus } from '@/lib/gamification/studio-pass';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import { FoilStatusPill } from '@/components/gamification/foil-status-pill';
import { cn } from '@/lib/utils';
import { Crown, Flame, Zap } from 'lucide-react';

const RANK_THEME: Record<
  RankId,
  { from: string; via: string; to: string; accent: string; glow: string; bg: string }
> = {
  open_mic: {
    from: '#27272a',
    via: '#18181b',
    to: '#09090b',
    accent: '#a1a1aa',
    glow: 'rgba(161,161,170,0.25)',
    bg: '#09090b',
  },
  soundcheck: {
    from: '#44403c',
    via: '#292524',
    to: '#1c1917',
    accent: '#a8a29e',
    glow: 'rgba(168,162,158,0.28)',
    bg: '#1c1917',
  },
  demo_tape: {
    from: '#064e3b',
    via: '#022c22',
    to: '#021a14',
    accent: '#34d399',
    glow: 'rgba(52,211,153,0.3)',
    bg: '#021a14',
  },
  cipher_cut: {
    from: '#115e59',
    via: '#134e4a',
    to: '#042f2e',
    accent: '#2dd4bf',
    glow: 'rgba(45,212,191,0.3)',
    bg: '#042f2e',
  },
  session_ready: {
    from: '#0c4a6e',
    via: '#082f49',
    to: '#041e2e',
    accent: '#38bdf8',
    glow: 'rgba(56,189,248,0.32)',
    bg: '#041e2e',
  },
  green_room: {
    from: '#312e81',
    via: '#1e1b4b',
    to: '#0f172a',
    accent: '#818cf8',
    glow: 'rgba(129,140,248,0.32)',
    bg: '#0f172a',
  },
  headliner: {
    from: '#78350f',
    via: '#451a03',
    to: '#1c0a02',
    accent: '#fbbf24',
    glow: 'rgba(251,191,36,0.35)',
    bg: '#1c0a02',
  },
  encore_run: {
    from: '#9a3412',
    via: '#7c2d12',
    to: '#431407',
    accent: '#fb923c',
    glow: 'rgba(251,146,60,0.35)',
    bg: '#431407',
  },
  catalog_king: {
    from: '#9f1239',
    via: '#881337',
    to: '#4c0519',
    accent: '#fb7185',
    glow: 'rgba(251,113,133,0.35)',
    bg: '#4c0519',
  },
  vault_architect: {
    from: '#581c87',
    via: '#4a044e',
    to: '#1e0533',
    accent: '#e879f9',
    glow: 'rgba(232,121,249,0.38)',
    bg: '#1e0533',
  },
};

export type StudioStandingFoilCardProps = {
  displayName: string;
  rankId: RankId;
  rankLabel: string;
  xp: number;
  streak: number;
  longestStreak: number;
  lifetimeBarsWritten: number;
  lifetimeLinesGenerated: number;
  badgeCount: number;
  totalBadges: number;
  isPro?: boolean;
  className?: string;
};

export const StudioStandingFoilCard = React.forwardRef<HTMLDivElement, StudioStandingFoilCardProps>(
  function StudioStandingFoilCard(
    {
      displayName,
      rankId,
      rankLabel,
      xp,
      streak,
      longestStreak,
      lifetimeBarsWritten,
      lifetimeLinesGenerated,
      badgeCount,
      totalBadges,
      isPro = false,
      className,
    },
    ref
  ) {
    const theme = RANK_THEME[rankId] ?? RANK_THEME.open_mic;
    const rank = STUDIO_RANKS.find((r) => r.id === rankId) ?? STUDIO_RANKS[0]!;
    const { current, next } = xpProgressInRank(xp, rank);
    const xpPercent = next ? Math.min(100, Math.round((current / next) * 100)) : 100;
    const nextRank = STUDIO_RANKS[STUDIO_RANKS.findIndex((r) => r.id === rankId) + 1];
    const passId = getStudioPassId({
      displayName,
      rankId,
      rankLabel,
      xp,
      streak,
      longestStreak,
      badgeCount,
      totalBadges,
    });
    const booth = getBoothStatus(streak);
    const writtenBars = linesToRhymeBars(lifetimeBarsWritten);
    const generatedBars = linesToRhymeBars(lifetimeLinesGenerated);

    return (
      <div
        ref={ref}
        data-standing-card-root
        className={cn('relative w-full overflow-visible rounded-2xl text-left text-white', className)}
        style={{
          background: `linear-gradient(155deg, ${theme.from} 0%, ${theme.via} 42%, ${theme.to} 100%)`,
          boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 40px ${theme.glow}`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.18), transparent 42%), radial-gradient(circle at 88% 78%, rgba(255,255,255,0.08), transparent 38%)',
          }}
        />
        <div data-standing-inner className="relative space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.32em]"
                style={{ color: theme.accent }}
              >
                Studio Standing
              </p>
              <p className="mt-1 max-w-[220px] truncate text-sm font-bold uppercase tracking-tight text-white/90">
                {displayName}
              </p>
            </div>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border"
              style={{ borderColor: `${theme.accent}66`, background: `${theme.accent}18` }}
            >
              <Crown className="h-5 w-5" style={{ color: theme.accent }} />
            </div>
          </div>

          <div className="space-y-1">
            <h3
              className="font-headline text-3xl font-black uppercase leading-none tracking-tight"
              style={{ color: theme.accent }}
            >
              {rankLabel}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {booth.label} · Level plate
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wide">
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sky-300">
                <Zap className="h-3 w-3 shrink-0" /> {xp.toLocaleString()} XP
              </span>
              <span className="shrink-0 whitespace-nowrap text-right text-white/45">
                {nextRank
                  ? `${Math.max(0, (next ?? 0) - current).toLocaleString()} to next`
                  : 'Top rank'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${xpPercent}%`,
                  background: `linear-gradient(90deg, ${theme.accent}88, ${theme.accent})`,
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STUDIO_RANKS.map((r) => {
              const earned = xp >= r.minXp && !(r.proOverlay && !isPro);
              const isCurrent = r.id === rankId;
              return (
                <FoilStatusPill
                  key={r.id}
                  label={r.label}
                  color={
                    isCurrent ? theme.accent : earned ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'
                  }
                  background={isCurrent ? `${theme.accent}28` : earned ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)'}
                  borderColor={
                    isCurrent ? theme.accent : earned ? `${theme.accent}66` : 'rgba(255,255,255,0.12)'
                  }
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Streak</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-black text-orange-300">
                <Flame className="h-3.5 w-3.5" /> {streak}d
              </p>
              <p className="text-[9px] text-white/40">Best {longestStreak}d</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Trophies</p>
              <p className="mt-0.5 text-sm font-black text-white">
                {badgeCount}/{totalBadges}
              </p>
              <p className="text-[9px] text-white/40">Studio trophies</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Written</p>
              <p className="mt-0.5 text-sm font-black text-emerald-300">
                {writtenBars.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/40">rhyme bars</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Generated</p>
              <p className="mt-0.5 text-sm font-black text-violet-300">
                {generatedBars.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/40">rhyme bars</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 border-t border-white/10 pt-3">
            <p className="min-w-0 truncate font-mono text-[9px] tracking-wider text-white/35">{passId}</p>
            <p className="shrink-0 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.14em] text-white/40">
              Bar 4 Bar
            </p>
          </div>
        </div>
      </div>
    );
  }
);

export function studioStandingBackground(rankId: RankId): string {
  return RANK_THEME[rankId]?.bg ?? RANK_THEME.open_mic.bg;
}
