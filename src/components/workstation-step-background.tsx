'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { STUDIO_GRAIN_URI } from '@/components/studio-page-background';

export type WorkstationStepVariant =
  | 'mode-select'
  | 'calibration'
  | 'dna-seed'
  | 'analysis'
  | 'path-select'
  | 'approval';

const VARIANT_STYLES: Record<
  WorkstationStepVariant,
  { base: string; orbs: Array<{ className: string }> }
> = {
  'mode-select': {
    base: 'studio-page-base',
    orbs: [
      { className: 'left-1/2 top-[-20%] h-[70vh] w-[120vw] -translate-x-1/2 bg-primary/[0.14] blur-[120px]' },
      { className: 'right-[-15%] bottom-[10%] h-[45vh] w-[55vw] bg-sky-500/[0.1] blur-[100px]' },
    ],
  },
  calibration: {
    base: 'studio-page-base dark:bg-[hsl(216_48%_7%)]',
    orbs: [
      { className: 'left-[-8%] top-[5%] h-[50vh] w-[45vw] bg-emerald-500/[0.08] blur-[110px]' },
      { className: 'right-[-10%] top-[20%] h-[55vh] w-[50vw] bg-amber-500/[0.07] blur-[105px]' },
      { className: 'left-1/2 bottom-[-15%] h-[40vh] w-[80vw] -translate-x-1/2 bg-sky-500/[0.09] blur-[115px]' },
    ],
  },
  'dna-seed': {
    base: 'studio-page-base dark:bg-[hsl(210_50%_7%)]',
    orbs: [
      { className: 'left-1/2 top-[-10%] h-[65vh] w-[100vw] -translate-x-1/2 bg-sky-500/[0.12] blur-[115px]' },
      { className: 'bottom-[-5%] right-[-5%] h-[40vh] w-[50vw] bg-cyan-400/[0.06] blur-[95px]' },
    ],
  },
  analysis: {
    base: 'studio-page-base dark:bg-[hsl(158_35%_7%)]',
    orbs: [
      { className: 'left-[-12%] top-[15%] h-[55vh] w-[50vw] bg-emerald-500/[0.11] blur-[110px]' },
      { className: 'right-[-8%] bottom-[5%] h-[45vh] w-[45vw] bg-teal-400/[0.08] blur-[100px]' },
    ],
  },
  'path-select': {
    base: 'studio-page-base dark:bg-[hsl(230_45%_7%)]',
    orbs: [
      { className: 'left-1/2 top-[-15%] h-[60vh] w-[110vw] -translate-x-1/2 bg-primary/[0.13] blur-[120px]' },
      { className: 'bottom-[0%] left-[-10%] h-[42vh] w-[48vw] bg-violet-500/[0.08] blur-[100px]' },
    ],
  },
  approval: {
    base: 'studio-page-base dark:bg-[hsl(35_40%_7%)]',
    orbs: [
      { className: 'left-1/2 top-[-12%] h-[55vh] w-[95vw] -translate-x-1/2 bg-amber-500/[0.1] blur-[110px]' },
      { className: 'right-[-8%] bottom-[8%] h-[38vh] w-[42vw] bg-orange-400/[0.07] blur-[95px]' },
    ],
  },
};

export function WorkstationStepBackground({
  variant,
  className,
}: {
  variant: WorkstationStepVariant;
  className?: string;
}) {
  const { base, orbs } = VARIANT_STYLES[variant];

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden isolate', className)}
      aria-hidden
    >
      <div className={cn('absolute inset-0 smooth-gradient-layer transition-[background-color] duration-500 ease-out', base)} />
      {orbs.map((orb, i) => (
        <div
          key={i}
          className={cn('absolute rounded-full smooth-gradient-layer', orb.className)}
        />
      ))}
      <div className="absolute inset-0 studio-page-vignette opacity-55 dark:opacity-90" />
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-soft-light"
        style={{
          backgroundImage: `url("${STUDIO_GRAIN_URI}")`,
          backgroundSize: '240px 240px',
        }}
      />
    </div>
  );
}

export function stepToWorkstationVariant(step: number): WorkstationStepVariant {
  if (step === 0) return 'mode-select';
  if (step === 10) return 'calibration';
  if (step === 1) return 'dna-seed';
  if (step === 2) return 'analysis';
  if (step === 3) return 'path-select';
  if (step === 5) return 'approval';
  return 'mode-select';
}
