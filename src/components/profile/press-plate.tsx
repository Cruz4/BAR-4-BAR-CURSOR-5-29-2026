'use client';

/**
 * Die-cut plate — compact module frame.
 * Registration marks stay subtle; padding is tight so the sheet reads dense.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { dieCutClip, type CutStyle } from '@/lib/profile/pressing';

export type PressPlateChrome = {
  serial: string;
  cutStyle: CutStyle;
  ghostText?: string;
};

type PressPlateProps = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
  chrome: PressPlateChrome;
  index?: number;
  className?: string;
  density?: 'compact' | 'default';
};

export function PressPlate({
  title,
  icon: Icon,
  children,
  action,
  chrome,
  index = 0,
  className,
  density = 'default',
}: PressPlateProps) {
  const cut = ((chrome.cutStyle + index) % 6) as CutStyle;

  return (
    <section className={cn('relative isolate pointer-events-auto', className)}>
      <div
        className="relative overflow-hidden border border-[var(--ph-border)]"
        style={{
          clipPath: dieCutClip(cut),
          background: `linear-gradient(165deg, var(--ph-plate), color-mix(in srgb, var(--ph-bg) 70%, transparent))`,
        }}
      >
        <div
          className={cn(
            'relative z-10',
            density === 'compact' ? 'px-3 py-3 sm:px-4 sm:py-4' : 'px-5 py-5 sm:px-6 sm:py-6'
          )}
        >
          <div className={cn('flex items-center justify-between', density === 'compact' ? 'mb-2 gap-2' : 'mb-4 gap-3')}>
            <h2
              className={cn(
                'flex min-w-0 items-center font-headline font-bold uppercase text-[var(--ph-text)]',
                density === 'compact'
                  ? 'gap-1.5 text-[10px] tracking-[0.14em]'
                  : 'gap-2 text-xs tracking-[0.18em]'
              )}
            >
              {Icon && <Icon className={cn('shrink-0 text-[var(--ph-accent)]', density === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
              <span className="truncate">{title}</span>
            </h2>
            {action ? (
              <div className="relative z-20 shrink-0 pointer-events-auto">{action}</div>
            ) : null}
          </div>
          <div className="relative z-10 pointer-events-auto">{children}</div>
        </div>
      </div>
    </section>
  );
}
