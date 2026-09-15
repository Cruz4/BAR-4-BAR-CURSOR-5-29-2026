'use client';

import Link from 'next/link';
import { Dna } from 'lucide-react';
import { cn } from '@/lib/utils';

type LyricsDnaStatusBadgeProps = {
  active: boolean;
  href?: string;
  className?: string;
};

/** Always visible on song pages — lit when a Lyrics DNA Drop exists, gray when not. */
export function LyricsDnaStatusBadge({ active, href, className }: LyricsDnaStatusBadgeProps) {
  if (active && href) {
    return (
      <Link
        href={href}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
          'border-cyan-400/55 bg-cyan-400/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-300/70 hover:bg-cyan-400/25',
          className
        )}
      >
        <Dna className="h-3.5 w-3.5 shrink-0" />
        Lyrics DNA Drop · open
      </Link>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]',
        'border-white/10 bg-black/30 text-muted-foreground/50 cursor-not-allowed',
        className
      )}
      title="This song does not have a public Lyrics DNA Drop yet"
    >
      <Dna className="h-3.5 w-3.5 shrink-0 opacity-45" />
      Lyrics DNA Drop · none
    </span>
  );
}
