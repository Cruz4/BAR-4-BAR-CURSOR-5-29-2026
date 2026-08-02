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
};

export function PressPlate({
  title,
  icon: Icon,
  children,
  action,
  chrome,
  index = 0,
  className,
}: PressPlateProps) {
  const cut = ((chrome.cutStyle + index) % 6) as CutStyle;

  return (
    <section className={cn('relative', className)}>
      <div
        className="relative overflow-hidden border border-[var(--ph-border)]"
        style={{
          clipPath: dieCutClip(cut),
          background: `linear-gradient(165deg, var(--ph-plate), color-mix(in srgb, var(--ph-bg) 70%, transparent))`,
        }}
      >
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex min-w-0 items-center gap-2 font-headline text-xs font-bold uppercase tracking-[0.18em] text-[var(--ph-text)]">
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--ph-accent)]" />}
              <span className="truncate">{title}</span>
            </h2>
            {action}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
