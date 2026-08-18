'use client';

/**
 * Compact weekly / lifetime goal row for Studio Progress (Scene rail).
 * Truncated labels get a tooltip; icons always explain how to earn;
 * completed goals open the owner foil card (wall / download).
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ChallengeDef } from '@/lib/gamification/challenges';
import {
  getChallengeProgress,
  isChallengeComplete,
  resolveChallengeTarget,
} from '@/lib/gamification/challenges';
import type { GamificationSummary } from '@/lib/gamification/types';
import { ChallengeGoalFoilDialog } from '@/components/gamification/challenge-goal-foil-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function TruncatedGoalLabel({
  text,
  howTo,
  className,
}: {
  text: string;
  howTo: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const label = (
    <span ref={ref} className={cn('block truncate', className)}>
      {text}
    </span>
  );

  if (!truncated) return label;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="min-w-0 flex-1">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="z-[2300] max-w-[220px]">
        <p className="text-[11px] font-bold leading-snug">{text}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{howTo}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ProgressGoalRow({
  challenge,
  summary,
  isPro,
  accent,
  compact,
}: {
  challenge: ChallengeDef;
  summary: GamificationSummary;
  isPro: boolean;
  accent: 'weekly' | 'lifetime';
  compact?: boolean;
}) {
  const [foilOpen, setFoilOpen] = useState(false);
  const progress = getChallengeProgress(summary, challenge, isPro);
  const done = isChallengeComplete(summary, challenge, isPro);
  const target = resolveChallengeTarget(challenge, isPro);
  const isRankGoal =
    challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect';
  const progressLabel = isRankGoal
    ? done
      ? 'Done'
      : `${summary.xp.toLocaleString()}/${challenge.target.toLocaleString()}`
    : `${progress}/${target}`;
  const remaining = isRankGoal
    ? done
      ? 0
      : Math.max(0, challenge.target - summary.xp)
    : Math.max(0, target - progress);

  const howTo = done
    ? 'Complete — tap to open your foil card, post it to the wall, or download.'
    : remaining > 0
      ? `${challenge.description} · ${remaining.toLocaleString()} to go.`
      : challenge.description;

  const doneClass =
    accent === 'weekly'
      ? 'text-emerald-700 dark:text-emerald-300/95'
      : 'text-amber-800 dark:text-amber-200/95';
  const doneCountClass =
    accent === 'weekly'
      ? 'text-emerald-700 dark:text-emerald-400/80'
      : 'text-amber-700 dark:text-amber-400/80';
  const iconDoneClass =
    accent === 'weekly'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400';

  return (
    <li className="flex min-h-[18px] min-w-0 items-center gap-2">
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={howTo}
            onClick={(e) => {
              e.stopPropagation();
              if (done) setFoilOpen(true);
            }}
          >
            {done ? (
              <CheckCircle2 className={cn('h-3 w-3', iconDoneClass)} />
            ) : (
              <Circle className="h-3 w-3 text-muted-foreground/35" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="z-[2300] max-w-[220px]">
          <p className="text-[11px] font-bold leading-snug">{challenge.label}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{howTo}</p>
        </TooltipContent>
      </Tooltip>

      {done ? (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setFoilOpen(true)}
        >
          <span className="min-w-0 flex-1">
            <TruncatedGoalLabel
              text={challenge.label}
              howTo={howTo}
              className={cn(
                'font-code leading-snug',
                compact ? 'text-[10px]' : 'text-[11px]',
                doneClass
              )}
            />
          </span>
          <span
            className={cn(
              'shrink-0 whitespace-nowrap font-mono tabular-nums',
              compact ? 'text-[9px]' : 'text-[10px]',
              doneCountClass
            )}
          >
            {progressLabel}
          </span>
        </button>
      ) : (
        <>
          <span className="min-w-0 flex-1">
            <TruncatedGoalLabel
              text={challenge.label}
              howTo={howTo}
              className={cn(
                'font-code leading-snug text-foreground/90',
                compact ? 'text-[10px]' : 'text-[11px]'
              )}
            />
          </span>
          <span
            className={cn(
              'shrink-0 whitespace-nowrap font-mono tabular-nums text-muted-foreground',
              compact ? 'text-[9px]' : 'text-[10px]'
            )}
          >
            {progressLabel}
          </span>
        </>
      )}

      {done ? (
        <ChallengeGoalFoilDialog
          open={foilOpen}
          onOpenChange={setFoilOpen}
          challenge={challenge}
        />
      ) : null}
    </li>
  );
}
