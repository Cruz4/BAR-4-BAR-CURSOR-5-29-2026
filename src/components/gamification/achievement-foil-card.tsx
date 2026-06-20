'use client';

import React from 'react';
import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  formatUnlockDate,
  getAchievementCardTheme,
  getAchievementSerial,
} from '@/lib/gamification/achievement-card-theme';
import { achievementIcon } from '@/lib/gamification/achievement-icons';
import { cn } from '@/lib/utils';
import { Lock, Trophy } from 'lucide-react';

function Barcode({ accent }: { accent: string }) {
  const bars = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 2, 1, 4, 3, 1];
  return (
    <div className="flex items-end gap-[2px] h-6 opacity-80" aria-hidden>
      {bars.map((w, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{ width: w, height: i % 3 === 0 ? '100%' : '72%', backgroundColor: accent }}
        />
      ))}
    </div>
  );
}

export type AchievementFoilCardProps = {
  achievement?: AchievementDef | null;
  displayName: string;
  rankLabel: string;
  xp: number;
  streak: number;
  unlockedAt?: string;
  locked?: boolean;
  lockedPro?: boolean;
  compact?: boolean;
  showStats?: boolean;
  className?: string;
};

export const AchievementFoilCard = React.forwardRef<HTMLDivElement, AchievementFoilCardProps>(
  function AchievementFoilCard(
    {
      achievement,
      displayName,
      rankLabel,
      xp,
      streak,
      unlockedAt,
      locked = false,
      lockedPro = false,
      compact = false,
      showStats = true,
      className,
    },
    ref
  ) {
    const theme = getAchievementCardTheme(achievement);
    const Icon = achievement ? achievementIcon(achievement.icon) : Trophy;
    const serial = getAchievementSerial(achievement?.id || 'studio-stats', displayName);
    const dimmed = locked || !achievement;

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl text-left shadow-[0_16px_48px_rgba(0,0,0,0.45)]',
          dimmed && 'opacity-90',
          className
        )}
        style={{
          background: `linear-gradient(145deg, ${theme.gradientFrom} 0%, ${theme.gradientVia} 45%, ${theme.gradientTo} 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 10%, white 0, transparent 42%), radial-gradient(circle at 85% 75%, white 0, transparent 35%)',
          }}
        />
        <div
          className={cn(
            'pointer-events-none absolute -right-6 -top-8 font-headline font-bold leading-none opacity-[0.07] select-none',
            compact ? 'text-[72px]' : 'text-[120px]'
          )}
          style={{ color: theme.accent }}
        >
          {theme.watermark}
        </div>

        {locked && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/35 rounded-2xl">
            {lockedPro ? (
              <Lock className={cn('text-white/70', compact ? 'h-8 w-8' : 'h-10 w-10')} />
            ) : null}
          </div>
        )}

        <div className="relative p-[3px] rounded-2xl" style={{ background: theme.foil }}>
          <div
            className={cn('rounded-[13px] space-y-4', compact ? 'p-3.5' : 'p-5')}
            style={{ backgroundColor: 'rgba(2, 6, 23, 0.72)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.35em] text-white/50">Bar 4 Bar Studio</p>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mt-1"
                  style={{ color: theme.accent }}
                >
                  {achievement ? (locked ? 'Locked Trophy' : 'Studio Milestone') : 'Studio Status'}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border"
                style={{
                  color: theme.accent,
                  borderColor: `${theme.accent}55`,
                  backgroundColor: theme.accentSoft,
                }}
              >
                {theme.categoryLabel}
              </span>
            </div>

            <div className={cn('flex flex-col items-center text-center space-y-2', compact ? 'py-0' : 'py-1')}>
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-full border-2',
                  compact ? 'h-14 w-14' : 'h-20 w-20'
                )}
                style={{
                  borderColor: `${theme.accent}88`,
                  background: `radial-gradient(circle at 30% 25%, ${theme.accentSoft}, transparent 70%)`,
                  boxShadow: `0 0 32px ${theme.glow}`,
                }}
              >
                <Icon
                  className={cn(compact ? 'h-6 w-6' : 'h-9 w-9')}
                  style={{ color: theme.accent }}
                  strokeWidth={1.75}
                />
              </div>
              <div className="space-y-1 max-w-[260px]">
                <h3
                  className={cn(
                    'font-headline font-bold uppercase tracking-tight leading-none text-white',
                    compact ? 'text-lg' : 'text-2xl'
                  )}
                  style={{ textShadow: `0 0 24px ${theme.glow}` }}
                >
                  {achievement?.title || 'Studio Artist'}
                </h3>
                <p className={cn('text-white/65 font-code leading-snug', compact ? 'text-[10px]' : 'text-[11px]')}>
                  {achievement?.description || 'Building rank, streak, and studio milestones.'}
                </p>
              </div>
            </div>

            {showStats && (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Rank', value: rankLabel },
                  { label: 'XP', value: xp.toLocaleString() },
                  { label: 'Streak', value: `${streak}d` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border px-1.5 py-1.5 text-center"
                    style={{ borderColor: `${theme.accent}33`, backgroundColor: theme.accentSoft }}
                  >
                    <p className="text-[7px] uppercase tracking-widest text-white/45 font-bold">{stat.label}</p>
                    <p className="text-[10px] font-bold text-white mt-0.5 truncate">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-dashed pt-3 space-y-2" style={{ borderColor: `${theme.accent}44` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 font-bold">Artist</p>
                  <p className="text-xs font-headline font-bold uppercase text-white truncate">{displayName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 font-bold">
                    {achievement && !locked ? 'Unlocked' : 'Status'}
                  </p>
                  <p className="text-[10px] font-code text-white/75">
                    {achievement && !locked ? formatUnlockDate(unlockedAt) : locked ? 'Not yet' : rankLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <Barcode accent={theme.accent} />
                <div className="text-right min-w-0">
                  <p className="text-[8px] font-mono text-white/45">bar4bar.ink</p>
                  <p className="text-[9px] font-mono font-bold truncate" style={{ color: theme.accent }}>
                    {serial}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
