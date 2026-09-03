'use client';

import React from 'react';
import type { ChallengeDef } from '@/lib/gamification/challenges';
import { SCALE_LABELS, TIER_LABELS } from '@/lib/gamification/challenges';
import { FoilStatusPill } from '@/components/gamification/foil-status-pill';
import { cn } from '@/lib/utils';
import { CheckCircle2, Target } from 'lucide-react';

const SCALE_THEME: Record<
  ChallengeDef['scale'],
  { from: string; via: string; to: string; accent: string; bg: string }
> = {
  weekly: {
    from: '#164e63',
    via: '#083344',
    to: '#042f2e',
    accent: '#22d3ee',
    bg: '#042f2e',
  },
  monthly: {
    from: '#5b21b6',
    via: '#3b0764',
    to: '#1e0533',
    accent: '#c084fc',
    bg: '#1e0533',
  },
  lifetime: {
    from: '#92400e',
    via: '#451a03',
    to: '#1c0a02',
    accent: '#fbbf24',
    bg: '#1c0a02',
  },
};

export type ChallengeGoalFoilCardProps = {
  challenge: ChallengeDef;
  displayName: string;
  rankLabel: string;
  className?: string;
};

export const ChallengeGoalFoilCard = React.forwardRef<HTMLDivElement, ChallengeGoalFoilCardProps>(
  function ChallengeGoalFoilCard({ challenge, displayName, rankLabel, className }, ref) {
    const theme = SCALE_THEME[challenge.scale];

    return (
      <div
        ref={ref}
        data-goal-card-root
        className={cn('relative w-full overflow-hidden rounded-2xl text-left text-white', className)}
        style={{
          background: `linear-gradient(150deg, ${theme.from} 0%, ${theme.via} 48%, ${theme.to} 100%)`,
          boxShadow: `0 16px 40px rgba(0,0,0,0.45), 0 0 28px ${theme.accent}33`,
        }}
      >
        <div data-goal-inner className="relative space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <p
                className="truncate text-[9px] font-bold uppercase tracking-[0.28em]"
                style={{ color: theme.accent }}
              >
                Studio Goal
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <FoilStatusPill
                  label="Complete"
                  color={theme.accent}
                  background={`${theme.accent}22`}
                  borderColor={`${theme.accent}66`}
                />
                <FoilStatusPill
                  label={SCALE_LABELS[challenge.scale]}
                  color="rgba(255,255,255,0.8)"
                  background="rgba(0,0,0,0.28)"
                  borderColor="rgba(255,255,255,0.18)"
                />
                {challenge.tier !== 'standard' && (
                  <FoilStatusPill
                    label={TIER_LABELS[challenge.tier]}
                    color="rgba(255,255,255,0.75)"
                    background="rgba(0,0,0,0.3)"
                    borderColor="rgba(255,255,255,0.2)"
                  />
                )}
              </div>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
              style={{ borderColor: `${theme.accent}66`, background: `${theme.accent}18` }}
            >
              <CheckCircle2 className="h-5 w-5" style={{ color: theme.accent }} />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-headline text-xl font-black uppercase leading-snug tracking-tight text-white">
              {challenge.label}
            </h3>
            <p className="text-[11px] leading-relaxed text-white/60">{challenge.description}</p>
          </div>

          <div className="flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
            <Target className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white/90">{displayName}</p>
              <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                {rankLabel}
              </p>
              <p className="truncate text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">
                AKAsheet
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export function challengeGoalBackground(scale: ChallengeDef['scale']): string {
  return SCALE_THEME[scale].bg;
}
