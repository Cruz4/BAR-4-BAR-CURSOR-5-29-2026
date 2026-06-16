'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LYRICS_PAGE_TOUR_STEPS } from '@/lib/studio-onboarding';
import { CheckCircle2, Circle } from 'lucide-react';

type QuestProgressProps = {
  tourStepIndex: number;
  tourActive: boolean;
  tourCompleted: boolean;
  className?: string;
  /** Hide on phone during tour — tour card + spotlight need the bottom band. */
  hideOnMobile?: boolean;
};

export function QuestProgress({
  tourStepIndex,
  tourActive,
  tourCompleted,
  className,
  hideOnMobile = false,
}: QuestProgressProps) {
  if (!tourActive && !tourCompleted) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-card/95 backdrop-blur-md p-3 space-y-2 shadow-lg',
        hideOnMobile && 'max-md:hidden',
        className
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Studio Quest — Tour Chain</p>
      <ul className="space-y-1 max-h-32 overflow-y-auto studio-scrollbar">
        {LYRICS_PAGE_TOUR_STEPS.map((step, i) => {
          const done = tourCompleted || i < tourStepIndex;
          const current = tourActive && i === tourStepIndex;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-start gap-2 text-[10px] font-code',
                current && 'text-primary font-bold',
                done && !current && 'text-muted-foreground'
              )}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 mt-0.5" />
              )}
              <span>{step.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
