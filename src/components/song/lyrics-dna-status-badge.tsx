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
  if (!(active && href)) return null;
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] transition-colors',
        'border-cyan-400/50 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/20',
        className
      )}
    >
      <Dna className="h-3 w-3 shrink-0" />
      DNA Drop
    </Link>
  );
}
