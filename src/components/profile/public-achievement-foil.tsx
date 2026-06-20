'use client';

import React from 'react';
import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  getAchievementCardTheme,
  getAchievementSerial,
} from '@/lib/gamification/achievement-card-theme';
import { achievementIcon } from '@/lib/gamification/achievement-icons';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const TILTS = ['-2.5deg', '1.5deg', '-1deg', '2deg', '-0.5deg', '1.25deg'] as const;

function bentoSpan(achievement: AchievementDef): string {
  if (achievement.xpReward >= 90 || achievement.id === 'streak_30') {
    return 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2';
  }
  if (achievement.xpReward >= 60) {
    return 'col-span-2 sm:col-span-2';
  }
  return 'col-span-1';
}

type PublicAchievementFoilProps = {
  achievement: AchievementDef;
  displayName: string;
  index: number;
};

export function PublicAchievementFoil({ achievement, displayName, index }: PublicAchievementFoilProps) {
  const theme = getAchievementCardTheme(achievement);
  const Icon = achievementIcon(achievement.icon);
  const serial = getAchievementSerial(achievement.id, displayName);
  const isLarge = achievement.xpReward >= 90 || achievement.id === 'streak_30';
  const tilt = TILTS[index % TILTS.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 28, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: 'easeOut' }}
      whileHover={{ scale: 1.03, rotate: '0deg', zIndex: 10 }}
      className={cn(
        'group relative min-h-[148px] overflow-hidden rounded-2xl',
        bentoSpan(achievement)
      )}
      style={{
        boxShadow: `0 12px 40px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl p-[2px] foil-shimmer-border"
        style={{ background: theme.foil }}
        aria-hidden
      />
      <div
        className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-[14px]"
        style={{
          background: `linear-gradient(145deg, ${theme.gradientFrom} 0%, ${theme.gradientVia} 48%, ${theme.gradientTo} 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-4 -top-6 select-none font-headline font-bold leading-none opacity-[0.09]"
          style={{ color: theme.accent, fontSize: isLarge ? '7rem' : '4.5rem' }}
          aria-hidden
        >
          {theme.watermark}
        </div>

        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[14px]"
          style={{ backgroundColor: theme.accent }}
          aria-hidden
        />

        <div className={cn('relative flex flex-1 flex-col', isLarge ? 'p-5 sm:p-6' : 'p-4')}>
          <div className="flex items-start justify-between gap-2">
            <span
              className="rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em]"
              style={{
                borderColor: `${theme.accent}55`,
                color: theme.accent,
                backgroundColor: theme.accentSoft,
              }}
            >
              {theme.categoryLabel}
            </span>
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-xl border',
                isLarge ? 'h-12 w-12' : 'h-10 w-10'
              )}
              style={{
                borderColor: `${theme.accent}44`,
                backgroundColor: theme.accentSoft,
                boxShadow: `0 0 24px ${theme.glow}`,
              }}
            >
              <Icon className={isLarge ? 'h-6 w-6' : 'h-5 w-5'} style={{ color: theme.accent }} />
            </div>
          </div>

          <div className="mt-auto space-y-2 pt-4">
            <h3
              className={cn(
                'font-headline font-bold uppercase leading-tight text-white',
                isLarge ? 'text-lg sm:text-xl' : 'text-sm'
              )}
            >
              {achievement.title}
            </h3>
            <p
              className={cn(
                'leading-snug text-white/65',
                isLarge ? 'text-xs sm:text-sm line-clamp-3' : 'text-[11px] line-clamp-2'
              )}
            >
              {achievement.description}
            </p>
          </div>
        </div>

        <div
          className="relative flex items-center justify-between gap-2 border-t px-4 py-2.5"
          style={{ borderColor: `${theme.accent}22`, backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <span className="font-code text-[9px] uppercase tracking-widest text-white/45">{serial}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-white/40">+{achievement.xpReward} XP</span>
            {achievement.inkReward > 0 && (
              <span className="text-[9px] font-bold uppercase" style={{ color: theme.accent }}>
                +{achievement.inkReward} Ink
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
