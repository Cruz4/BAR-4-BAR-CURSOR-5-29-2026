'use client';

import React, { useState } from 'react';
import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  getAchievementCardTheme,
  getAchievementSerial,
} from '@/lib/gamification/achievement-card-theme';
import { achievementIcon } from '@/lib/gamification/achievement-icons';
import { AchievementFoilCard } from '@/components/gamification/achievement-foil-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const TILTS = ['-2.5deg', '1.5deg', '-1deg', '2deg', '-0.5deg', '1.25deg'] as const;

export type FoilDensity = 'compact' | 'cozy' | 'roomy';

function bentoSpan(achievement: AchievementDef, density: FoilDensity): string {
  // Only roomy (L / full-bleed) walls use bento spans — narrow S/M columns clip otherwise.
  if (density !== 'roomy') return 'col-span-1';
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
  /** Artist Home / public profile stats for the expanded foil card. */
  rankLabel?: string;
  xp?: number;
  streak?: number;
  /** ISO unlock timestamp — Proof Wall badges are always unlocked. */
  unlockedAt?: string;
  /** Visual density from Proof Wall module size (S/M/L). */
  density?: FoilDensity;
};

export function PublicAchievementFoil({
  achievement,
  displayName,
  index,
  rankLabel = 'Writer',
  xp = 0,
  streak = 0,
  unlockedAt,
  density = 'roomy',
}: PublicAchievementFoilProps) {
  const [open, setOpen] = useState(false);
  const theme = getAchievementCardTheme(achievement);
  const Icon = achievementIcon(achievement.icon);
  const serial = getAchievementSerial(achievement.id, displayName);
  const isLarge =
    density === 'roomy' && (achievement.xpReward >= 90 || achievement.id === 'streak_30');
  const tilt = TILTS[index % TILTS.length];
  const compact = density === 'compact';
  const cozy = density === 'cozy';

  return (
    <>
      <motion.article
        role="button"
        tabIndex={0}
        aria-label={`View ${achievement.title} foil card`}
        initial={{ opacity: 0, y: 28, rotate: 0 }}
        whileInView={{ opacity: 1, y: 0, rotate: tilt }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, delay: index * 0.04, ease: 'easeOut' }}
        whileHover={{ scale: 1.03, rotate: '0deg', zIndex: 10 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-2xl outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--ph-accent,#7dd3fc)] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          compact ? 'min-h-[128px]' : 'min-h-[148px]',
          bentoSpan(achievement, density)
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
            style={{
              color: theme.accent,
              fontSize: isLarge ? '7rem' : compact ? '3.25rem' : '4.5rem',
            }}
            aria-hidden
          >
            {theme.watermark}
          </div>

          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[14px]"
            style={{ backgroundColor: theme.accent }}
            aria-hidden
          />

          <div
            className={cn(
              'relative flex flex-1 flex-col',
              isLarge ? 'p-5 sm:p-6' : compact ? 'p-3' : cozy ? 'p-3.5' : 'p-4'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  'rounded-full border font-bold uppercase tracking-[0.2em]',
                  compact ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[8px]'
                )}
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
                  isLarge ? 'h-12 w-12' : compact ? 'h-8 w-8' : 'h-10 w-10'
                )}
                style={{
                  borderColor: `${theme.accent}44`,
                  backgroundColor: theme.accentSoft,
                  boxShadow: `0 0 24px ${theme.glow}`,
                }}
              >
                <Icon
                  className={isLarge ? 'h-6 w-6' : compact ? 'h-4 w-4' : 'h-5 w-5'}
                  style={{ color: theme.accent }}
                />
              </div>
            </div>

            <div className={cn('mt-auto space-y-1.5', compact ? 'pt-2.5' : 'pt-4')}>
              <h3
                className={cn(
                  'font-headline font-bold uppercase leading-tight text-white',
                  isLarge ? 'text-lg sm:text-xl' : compact ? 'text-xs' : 'text-sm'
                )}
              >
                {achievement.title}
              </h3>
              <p
                className={cn(
                  'leading-snug text-white/65',
                  isLarge
                    ? 'text-xs sm:text-sm line-clamp-3'
                    : compact
                      ? 'text-[10px] line-clamp-2'
                      : 'text-[11px] line-clamp-2'
                )}
              >
                {achievement.description}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'relative flex min-w-0 items-center justify-between gap-2 border-t',
              compact ? 'px-2.5 py-2' : 'px-4 py-2.5'
            )}
            style={{ borderColor: `${theme.accent}22`, backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate font-code uppercase tracking-widest text-white/45',
                compact ? 'text-[8px]' : 'text-[9px]'
              )}
              title={serial}
            >
              {serial}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  'font-bold uppercase text-white/40',
                  compact ? 'text-[8px]' : 'text-[9px]'
                )}
              >
                +{achievement.xpReward} XP
              </span>
              {achievement.inkReward > 0 && (
                <span
                  className={cn('font-bold uppercase', compact ? 'text-[8px]' : 'text-[9px]')}
                  style={{ color: theme.accent }}
                >
                  +{achievement.inkReward} Ink
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-[hsl(216_28%_7%)] text-white">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase tracking-wide">
              {achievement.title}
            </DialogTitle>
            <DialogDescription className="text-white/55">
              Proof Wall foil card — studio milestone for {displayName}. No lyrics included.
            </DialogDescription>
          </DialogHeader>
          <AchievementFoilCard
            achievement={achievement}
            displayName={displayName}
            rankLabel={rankLabel}
            xp={xp}
            streak={streak}
            unlockedAt={unlockedAt}
            locked={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
