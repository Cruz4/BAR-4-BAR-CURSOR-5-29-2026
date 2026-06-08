'use client';

import React, { useMemo } from 'react';
import { STUDIO_GRAIN_URI } from '@/components/studio-page-background';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { isProUser } from '@/lib/subscription';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { rankFromXp, STUDIO_RANKS } from '@/lib/gamification/ranks';
import { cn } from '@/lib/utils';

const SPECTRUM_BARS = 32;
const ACHIEVEMENT_RING = 16;

function buildSpectrumBars(count: number, fillRatio: number, phase: number) {
  const clamped = Math.min(1, Math.max(0, fillRatio));
  return Array.from({ length: count }, (_, i) => {
    const wave = (Math.sin(i * 0.62 + phase) + Math.sin(i * 0.31 + phase * 1.4)) * 0.5;
    const h = 0.22 + ((wave + 1) / 2) * 0.68;
    const lit = (i + 1) / count <= clamped;
    return { h, lit };
  });
}

/**
 * Studio Progress hall — dual side galleries framing the content column.
 * Left: written bars spectrum + rank ladder. Right: generated signal + achievement ring.
 * Center stays open; detail lives in the viewport gutters.
 */
export function StudioProgressAtmosphere() {
  const { user } = useAuth();
  const { summary } = useGamification();

  const isPro = isProUser(user);
  const rank = rankFromXp(summary.xp, isPro);

  const achievementCount = Object.keys(summary.unlockedAchievements || {}).length;
  const achievementRatio =
    ACHIEVEMENTS.length > 0 ? achievementCount / ACHIEVEMENTS.length : 0;

  const writtenRatio = Math.min(1, (summary.lifetimeBarsWritten || 0) / 240);
  const generatedRatio = Math.min(1, (summary.lifetimeLinesGenerated || 0) / 480);
  const xpRatio = Math.min(1, summary.xp / 3500);
  const hallGlow = Math.min(1, 0.35 + achievementRatio * 0.4 + xpRatio * 0.25);

  const writtenBars = useMemo(
    () => buildSpectrumBars(SPECTRUM_BARS, writtenRatio, 0.8),
    [writtenRatio]
  );
  const generatedBars = useMemo(
    () => buildSpectrumBars(SPECTRUM_BARS, generatedRatio, 2.1),
    [generatedRatio]
  );

  const litAchievements = Math.min(
    ACHIEVEMENT_RING,
    Math.max(0, Math.ceil(achievementRatio * ACHIEVEMENT_RING))
  );

  if (!user) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden progress-hall"
      aria-hidden
      style={{ '--hall-glow': hallGlow } as React.CSSProperties}
    >
      <div className="absolute inset-0 progress-hall-side-texture" />

      <div className="absolute left-[-8%] bottom-0 h-[min(44vh,400px)] w-[min(42vw,460px)] rounded-full bg-emerald-500/[0.07] blur-[110px] sm:blur-[140px]" />
      <div className="absolute right-[-8%] top-[14%] h-[min(40vh,360px)] w-[min(40vw,440px)] rounded-full bg-violet-500/[0.065] blur-[105px] sm:blur-[135px]" />
      <div className="absolute left-[8%] top-[22%] h-[min(26vh,240px)] w-[min(22vw,260px)] rounded-full bg-amber-500/[0.045] blur-[90px]" />

      <div className="progress-hall-stage progress-hall-stage-left hidden md:block" />
      <div className="progress-hall-stage progress-hall-stage-right hidden md:block" />

      {/* Rank bridge — only visible in top gutters, center masked out */}
      <div className="progress-hall-bridge hidden lg:block">
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
          <path d="M 2 16 Q 24 6 48 12" className="progress-hall-bridge-path" fill="none" />
          <path d="M 98 16 Q 76 6 52 12" className="progress-hall-bridge-path" fill="none" />
          {STUDIO_RANKS.map((r, i) => {
            const t = i / (STUDIO_RANKS.length - 1);
            const x = 8 + t * 84;
            const y = 10 + Math.sin(t * Math.PI) * 4;
            const reached = summary.xp >= r.minXp;
            const active = r.id === rank.id;
            return (
              <circle
                key={r.id}
                cx={x}
                cy={y}
                r={active ? 1.1 : 0.75}
                className={cn(
                  'progress-hall-bridge-node',
                  reached && 'progress-hall-bridge-node-reached',
                  active && 'progress-hall-bridge-node-active'
                )}
              />
            );
          })}
        </svg>
      </div>

      {/* Left gallery — written */}
      <div className="progress-hall-wing progress-hall-wing-left hidden md:flex">
        <div className="progress-hall-panel progress-hall-panel-written">
          <div className="progress-hall-panel-shine" />
          <div className="progress-hall-rank-ladder">
            {STUDIO_RANKS.map((r) => {
              const reached = summary.xp >= r.minXp;
              const active = r.id === rank.id;
              return (
                <div
                  key={r.id}
                  className={cn(
                    'progress-hall-rank-step',
                    reached && 'progress-hall-rank-step-reached',
                    active && 'progress-hall-rank-step-active'
                  )}
                >
                  <span className="progress-hall-rank-dot" />
                </div>
              );
            })}
          </div>
          <div className="progress-hall-spectrum">
            {writtenBars.map((bar, i) => (
              <div
                key={`w-${i}`}
                className={cn(
                  'progress-hall-spectrum-bar progress-hall-spectrum-written',
                  bar.lit && 'progress-hall-spectrum-bar-lit'
                )}
                style={{ height: `${bar.h * 100}%` }}
              />
            ))}
          </div>
          <div
            className="progress-hall-xp-rail"
            style={{ '--xp-fill': `${xpRatio * 100}%` } as React.CSSProperties}
          />
        </div>
        <div className="progress-hall-bracket progress-hall-bracket-left" />
      </div>

      {/* Right gallery — generated */}
      <div className="progress-hall-wing progress-hall-wing-right hidden md:flex">
        <div className="progress-hall-bracket progress-hall-bracket-right" />
        <div className="progress-hall-panel progress-hall-panel-generated">
          <div className="progress-hall-panel-shine" />
          <div className="progress-hall-hex" />
          <div className="progress-hall-achievement-ring">
            {Array.from({ length: ACHIEVEMENT_RING }, (_, i) => {
              const angle = (i / ACHIEVEMENT_RING) * Math.PI * 2 - Math.PI / 2;
              const lit = i < litAchievements;
              const x = 50 + Math.cos(angle) * 38;
              const y = 50 + Math.sin(angle) * 38;
              return (
                <span
                  key={`ach-${i}`}
                  className={cn(
                    'progress-hall-achievement-node',
                    lit && 'progress-hall-achievement-node-lit'
                  )}
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              );
            })}
            <span className="progress-hall-achievement-core" />
          </div>
          <div className="progress-hall-spectrum">
            {generatedBars.map((bar, i) => (
              <div
                key={`g-${i}`}
                className={cn(
                  'progress-hall-spectrum-bar progress-hall-spectrum-generated',
                  bar.lit && 'progress-hall-spectrum-bar-lit'
                )}
                style={{ height: `${bar.h * 100}%` }}
              />
            ))}
          </div>
          <div
            className="progress-hall-streak-rail"
            style={
              {
                '--streak-fill': `${Math.min(1, (summary.currentStreak || 0) / 30) * 100}%`,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-soft-light"
        style={{
          backgroundImage: `url("${STUDIO_GRAIN_URI}")`,
          backgroundSize: '240px 240px',
        }}
      />
    </div>
  );
}
