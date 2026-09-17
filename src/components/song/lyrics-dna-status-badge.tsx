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

/** Always visible on song pages — lit when a Lyrics DNA Drop exists, gray when not. */
export function LyricsDnaStatusBadge({
  active,
  href,
  className,
  variant = 'chip',
}: LyricsDnaStatusBadgeProps) {
  if (!(active && href)) return null;
  const isTitle = variant === 'title';
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-bold uppercase transition-colors',
        isTitle
          ? 'border-cyan-400/55 bg-cyan-400/12 px-3 py-1.5 text-[10px] tracking-[0.18em] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)] hover:border-cyan-300/75 hover:bg-cyan-400/22 sm:text-[11px]'
          : 'gap-1 px-2 py-0.5 text-[8px] tracking-[0.16em] border-cyan-400/50 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/20',
        className
      )}
    >
      <Dna className={cn('shrink-0', isTitle ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      {isTitle ? 'Lyric DNA Drop' : 'Lyric DNA Drop'}
    </Link>
  );
}
