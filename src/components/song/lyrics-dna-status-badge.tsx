'use client';

import Link from 'next/link';
import { Dna } from 'lucide-react';
import { cn } from '@/lib/utils';

type LyricsDnaStatusBadgeProps = {
  active: boolean;
  href?: string;
  className?: string;
  /** Larger title-row treatment on pressed song pages. */
  variant?: 'chip' | 'title';
};

/** Song page: lit link when a Lyrics DNA Drop exists; muted chip when not. */
export function LyricsDnaStatusBadge({
  active,
  href,
  className,
  variant = 'chip',
}: LyricsDnaStatusBadgeProps) {
  const isTitle = variant === 'title';
  const baseClass = cn(
    'inline-flex items-center gap-1.5 rounded-full border font-bold uppercase',
    isTitle
      ? 'px-3 py-1.5 text-[10px] tracking-[0.18em] sm:text-[11px]'
      : 'gap-1 px-2 py-0.5 text-[8px] tracking-[0.16em]'
  );

  if (active && href) {
    return (
      <Link
        href={href}
        className={cn(
          baseClass,
          'border-cyan-400/55 bg-cyan-400/12 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)] transition-colors hover:border-cyan-300/75 hover:bg-cyan-400/22',
          className
        )}
      >
        <Dna className={cn('shrink-0', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
        Lyric DNA Drop
      </Link>
    );
  }

  return (
    <span
      className={cn(
        baseClass,
        'cursor-default border-white/12 bg-white/5 text-muted-foreground/55',
        className
      )}
      aria-disabled="true"
      title="No live Lyrics DNA Drop for this song"
    >
      <Dna className={cn('shrink-0 opacity-50', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      Lyric DNA Drop
    </span>
  );
}
