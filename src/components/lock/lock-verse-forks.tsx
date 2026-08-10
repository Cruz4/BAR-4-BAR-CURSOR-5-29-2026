'use client';

/**
 * Forks from the current tip — pick a continuation to extend the verse path.
 */

import { motion } from 'framer-motion';
import { GitBranch, Star } from 'lucide-react';
import { LockPlate } from '@/components/lock/lock-shell';
import type { LockEcho } from '@/lib/lock/types';
import { cn } from '@/lib/utils';

type LockVerseForksProps = {
  forks: LockEcho[];
  hasMore?: boolean;
  onPick: (echo: LockEcho) => void;
  onShowMore?: () => void;
  emptyHint?: string;
  className?: string;
};

export function LockVerseForks({
  forks,
  hasMore,
  onPick,
  onShowMore,
  emptyHint = 'No forks yet — write the next bar from this tip.',
  className,
}: LockVerseForksProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
          Forks from here
        </h2>
      </div>

      {forks.length === 0 ? (
        <LockPlate className="px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">{emptyHint}</p>
        </LockPlate>
      ) : (
        <ul className="space-y-2.5">
          {forks.map((echo, i) => (
            <motion.li
              key={echo.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.3) }}
            >
              <button
                type="button"
                onClick={() => onPick(echo)}
                className="group w-full text-left"
              >
                <LockPlate className="p-3.5 transition-colors group-hover:border-primary/40 group-hover:bg-primary/[0.05]">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span className="font-semibold tabular-nums text-primary">
                      Fit {echo.lockScore}
                    </span>
                    <span className="text-zinc-600">{echo.lockLabel}</span>
                    {echo.isPick ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-300/90">
                        <Star className="h-3 w-3" /> Pick
                      </span>
                    ) : null}
                    <span className="text-zinc-600">{echo.authorName || 'Anonymous'}</span>
                  </div>
                  <p className="text-sm leading-snug text-zinc-100 group-hover:text-white">
                    {echo.text}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70 opacity-0 transition-opacity group-hover:opacity-100">
                    Continue this strain →
                  </p>
                </LockPlate>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {hasMore && onShowMore ? (
        <button
          type="button"
          onClick={onShowMore}
          className="text-xs text-primary hover:underline"
        >
          Show more forks
        </button>
      ) : null}
    </div>
  );
}
