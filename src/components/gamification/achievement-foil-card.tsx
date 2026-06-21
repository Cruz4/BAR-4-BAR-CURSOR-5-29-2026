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
        data-achievement-card-root
        className={cn(
          'relative overflow-visible rounded-2xl text-left shadow-[0_16px_48px_rgba(0,0,0,0.45)]',
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

        <div className="relative overflow-hidden rounded-2xl p-[3px]" style={{ background: theme.foil }}>
          <div
            data-achievement-inner
            className={cn('rounded-[13px] space-y-4', compact ? 'p-3.5 pb-4' : 'p-5 pb-6')}
            style={{ backgroundColor: 'rgba(2, 6, 23, 0.72)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.35em] text-white/50">Bar 4 Bar Studio</p>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mt-1"
                  style={{ color: theme.accent }}
                >
                  {achievement ? (locked ? 'Locked Trophy' : 'Studio Milestone') : 'Studio Status'}
                </p>
              </div>
              <span
                data-achievement-pill
                className="inline-flex shrink-0 items-center justify-center self-start rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase"
                style={{
                  color: theme.accent,
                  borderColor: `${theme.accent}55`,
                  backgroundColor: theme.accentSoft,
                  lineHeight: 1,
                  letterSpacing: '0.06em',
                  minHeight: 20,
                }}
              >
                {theme.categoryLabel}
              </span>
            </div>

            <div className={cn('flex flex-col items-center text-center space-y-2 w-full', compact ? 'py-0' : 'py-1')}>
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
              <div className="w-full space-y-1 px-0.5">
                <h3
                  className={cn(
                    'font-headline font-bold uppercase tracking-tight text-white',
                    compact ? 'text-lg' : 'text-2xl'
                  )}
                  style={{ textShadow: `0 0 24px ${theme.glow}`, lineHeight: 1.2 }}
                >
                  {achievement?.title || 'Studio Artist'}
                </h3>
                <p
                  data-achievement-desc
                  className={cn('w-full text-center text-white/65 font-code', compact ? 'text-[9px]' : 'text-[11px]')}
                  style={{
                    lineHeight: 1.45,
                    whiteSpace: 'normal',
                    overflow: 'visible',
                    wordBreak: 'break-word',
                  }}
                >
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
                    className="flex min-h-[54px] flex-col items-center justify-center rounded-lg border px-2 py-2 text-center"
                    style={{ borderColor: `${theme.accent}33`, backgroundColor: theme.accentSoft }}
                  >
                    <p
                      className="text-[7px] font-bold uppercase tracking-widest text-white/45"
                      style={{ lineHeight: 1.2 }}
                    >
                      {stat.label}
                    </p>
                    <p
                      className="mt-1 w-full text-center text-[10px] font-bold text-white font-body"
                      style={{ lineHeight: 1.35, overflow: 'visible' }}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-dashed pt-3 pb-1 space-y-2.5" style={{ borderColor: `${theme.accent}44` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/40"
                    style={{ lineHeight: 1.2 }}
                  >
                    Artist
                  </p>
                  <p
                    className="mt-1 text-xs font-bold text-white font-body break-words"
                    style={{ lineHeight: 1.35, overflow: 'visible' }}
                  >
                    {displayName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/40"
                    style={{ lineHeight: 1.2 }}
                  >
                    {achievement && !locked ? 'Unlocked' : 'Status'}
                  </p>
                  <p
                    className="mt-1 text-[10px] font-code text-white/75"
                    style={{ lineHeight: 1.35, overflow: 'visible' }}
                  >
                    {achievement && !locked ? formatUnlockDate(unlockedAt) : locked ? 'Not yet' : rankLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 pt-0.5">
                <Barcode accent={theme.accent} />
                <div className="min-w-0 text-right">
                  <p className="text-[8px] font-mono text-white/45" style={{ lineHeight: 1.3 }}>
                    bar4bar.ink
                  </p>
                  <p
                    className="mt-0.5 text-[9px] font-mono font-bold break-all"
                    style={{ color: theme.accent, lineHeight: 1.35, overflow: 'visible' }}
                  >
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
