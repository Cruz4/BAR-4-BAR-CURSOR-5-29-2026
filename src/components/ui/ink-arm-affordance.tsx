'use client';

import { usePrefersTouch } from '@/hooks/use-prefers-touch';
import { cn } from '@/lib/utils';

/** Visual affordance for touch ink double-tap confirm. */
export function InkArmAffordance({
  armed,
  children,
  className,
  compact = false,
}: {
  armed?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Inline row controls — ring only on touch (confirm toast carries the message). */
  compact?: boolean;
}) {
  const touch = usePrefersTouch();

  if (compact) {
    return <div className={cn('inline-flex shrink-0', className)}>{children}</div>;
  }

  if (touch && armed) {
    return (
      <div className={cn('inline-flex shrink-0 flex-col items-center justify-end gap-1', className)}>
        <span className="pointer-events-none font-code text-[8px] font-bold uppercase tracking-[0.18em] text-primary leading-none px-0.5">
          Tap again
        </span>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {children}
      {armed ? (
        <span className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-code text-[7px] font-bold uppercase tracking-widest text-primary">
          Tap again
        </span>
      ) : null}
    </div>
  );
}

/** Clip-safe on phone — ring-offset overflows scroll containers and gets cut off. */
export function inkArmedButtonClass(armed: boolean): string {
  return cn(
    armed &&
      'scale-[0.98] border-2 border-primary bg-primary/10 shadow-[0_0_12px_rgba(59,130,246,0.28)] max-md:ring-0 max-md:ring-offset-0 md:ring-2 md:ring-primary/60 md:ring-offset-2 md:ring-offset-background'
  );
}
