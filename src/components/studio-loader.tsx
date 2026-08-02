'use client';

import React from 'react';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioLoaderProps {
  className?: string;
  /**
   * sm — buttons / inline
   * md — panel / section placeholders
   * lg — full-page (default). Kept intentionally large and stable so
   * route loading → auth → page never "pops" to a smaller pencil.
   */
  size?: 'sm' | 'md' | 'lg';
  /** Optional status line under the pencil (e.g. guest try handoff). */
  message?: string;
  /**
   * Pin dead-center of the viewport (fixed overlay). Use for page/auth
   * loading so the pencil never jumps between header-offset layouts.
   */
  fullscreen?: boolean;
}

const SIZE = {
  sm: { icon: 'h-5 w-5', line: '-bottom-0.5', stroke: 2 },
  md: { icon: 'h-10 w-10', line: '-bottom-1', stroke: 1.85 },
  lg: { icon: 'h-16 w-16', line: '-bottom-1.5', stroke: 1.7 },
} as const;

export function StudioLoader({
  className,
  size = 'lg',
  message,
  fullscreen = false,
}: StudioLoaderProps) {
  const s = SIZE[size];

  const inner = (
    <div className={cn('relative flex flex-col items-center justify-center gap-4', !fullscreen && className)}>
      <div className={cn('relative flex shrink-0 items-center justify-center', s.icon)}>
        <PenLine
          className={cn('text-primary animate-writing', s.icon)}
          strokeWidth={s.stroke}
          absoluteStrokeWidth={size === 'lg'}
          aria-hidden
        />
        <div className={cn('absolute left-0 h-px w-full bg-primary/25', s.line)} />
      </div>
      {message ? (
        <p className="max-w-[16rem] text-center text-[10px] font-code font-bold uppercase tracking-[0.22em] text-muted-foreground animate-in fade-in duration-500 sm:text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[80] flex items-center justify-center bg-background',
          className
        )}
        role="status"
        aria-label="Loading"
      >
        {inner}
      </div>
    );
  }

  return inner;
}
