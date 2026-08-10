'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { buildLoginUrl } from '@/lib/login-links';

/**
 * Finish-this-bar stage — readable atmosphere, clear exits (not a locked terminal).
 */
export function LockShell({
  children,
  badge,
  right,
  className,
}: {
  children: ReactNode;
  badge?: string;
  right?: ReactNode;
  className?: string;
}) {
  const signInHref = buildLoginUrl({ mode: 'signin', next: '/', intent: 'lock' });

  return (
    <div
      data-dark-surface
      className={cn(
        'relative min-h-screen overflow-x-hidden bg-[#0a0c10] text-zinc-100 font-body selection:bg-primary/30',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(var(--primary)/0.14),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:radial-gradient(rgba(255,255,255,0.45)_0.6px,transparent_0.6px)] [background-size:4px_4px]"
      />

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0a0c10]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-xs font-headline tracking-wide text-zinc-200 hover:text-white transition-colors shrink-0"
          >
            Bar 4 Bar
          </Link>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-zinc-500 truncate">
            {badge || 'Finish this bar'}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[11px] shrink-0">
          {right}
          <Link href="/try" className="text-zinc-400 hover:text-primary transition-colors">
            Writing tools
          </Link>
          <Link href={signInHref} className="text-primary hover:text-primary/80 transition-colors font-medium">
            Sign in
          </Link>
        </div>
      </header>

      {children}
    </div>
  );
}

export function LockPlate({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'primary' | 'amber' | 'danger';
}) {
  const tones = {
    default: 'border-white/[0.1] bg-white/[0.03]',
    primary: 'border-primary/35 bg-primary/[0.06]',
    amber: 'border-amber-400/30 bg-amber-400/[0.05]',
    danger: 'border-rose-500/30 bg-rose-500/[0.05]',
  } as const;
  return (
    <div className={cn('rounded-lg border', tones[tone], className)}>{children}</div>
  );
}

export function LockKicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] tracking-[0.18em] uppercase text-zinc-500', className)}>
      {children}
    </p>
  );
}

/** @deprecated Kept for older pages; prefer plain UI. */
export function LockCursor({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-[1.05em] w-[0.55ch] translate-y-[0.12em] bg-primary align-baseline animate-pulse',
        className
      )}
    />
  );
}
