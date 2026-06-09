'use client';

import React from 'react';
import { STRAIN_PIPELINE_STEPS } from '@/lib/marketing-features';
import { cn } from '@/lib/utils';

export function StrainPipelineStrip() {
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.06] via-black/20 to-emerald-500/[0.05] backdrop-blur-md overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_55%)] pointer-events-none" />
      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.38em] text-primary/70 mb-5">
          Strain workflow — off the rip
        </p>
        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {STRAIN_PIPELINE_STEPS.map((item, index) => (
            <li
              key={item.step}
              className={cn(
                'relative rounded-xl border border-white/[0.07] bg-black/30 px-3 py-3 sm:px-4 sm:py-4',
                'transition-colors hover:border-primary/25 hover:bg-primary/[0.04]'
              )}
            >
              {index < STRAIN_PIPELINE_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px bg-gradient-to-r from-primary/40 to-transparent"
                />
              ) : null}
              <span className="text-[10px] font-mono font-bold text-primary/50 tabular-nums">{item.step}</span>
              <p className="mt-1 font-headline text-sm sm:text-base font-bold uppercase text-white tracking-tight">
                {item.label}
              </p>
              <p className="mt-1 text-[11px] font-code text-muted-foreground/85 leading-snug">{item.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
