'use client';

import { cn } from '@/lib/utils';

/** Visual affordance for touch ink double-tap confirm — label sits above the button so it is not covered. */
export function InkArmAffordance({
  armed,
  children,
  className,
}: {
  armed?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {children}
      {armed ? (
        <span className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-code text-[7px] font-bold uppercase tracking-widest text-primary max-md:text-[8px]">
          Tap again
        </span>
      ) : null}
    </div>
  );
}

export function inkArmedButtonClass(armed: boolean): string {
  return cn(
    armed &&
      'border-primary ring-2 ring-primary/60 ring-offset-2 ring-offset-background scale-[0.98]'
  );
}
