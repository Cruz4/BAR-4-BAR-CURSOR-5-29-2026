'use client';

/**
 * Song so far — composed verse path (seed → chosen forks).
 */

import { motion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { LockPlate } from '@/components/lock/lock-shell';
import {
  LOCK_SEED_NODE_ID,
  type LockPathLine,
} from '@/lib/lock/bloodline-tree';
import { cn } from '@/lib/utils';

type LockVersePathProps = {
  path: LockPathLine[];
  onSelectLine?: (lineId: string) => void;
  className?: string;
  /** Compact for embedding above composer. */
  compact?: boolean;
};

export function LockVersePath({
  path,
  onSelectLine,
  className,
  compact = false,
}: LockVersePathProps) {
  const tipId = path[path.length - 1]?.id;

  return (
    <LockPlate tone="primary" className={cn('overflow-hidden', className)}>
      <div
        className={cn(
          'border-b border-primary/20 bg-primary/[0.07] px-4',
          compact ? 'py-2.5' : 'py-3'
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/90">
          Song so far
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {path.length <= 1
            ? 'Seed only — pick a fork or write the next bar.'
            : `${path.length - 1} reply${path.length - 1 === 1 ? '' : 'ies'} in this strain.`}
        </p>
      </div>
      <ol className={cn('space-y-0', compact ? 'p-3' : 'p-4')}>
        {path.map((line, i) => {
          const isTip = line.id === tipId;
          const canStep = Boolean(onSelectLine) && !isTip;
          return (
            <motion.li
              key={`${line.id}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(i * 0.04, 0.24) }}
              className="relative"
            >
              {i > 0 ? (
                <div
                  aria-hidden
                  className="absolute left-[11px] top-0 h-3 w-px bg-gradient-to-b from-primary/40 to-primary/15"
                />
              ) : null}
              <button
                type="button"
                disabled={!canStep}
                onClick={() => onSelectLine?.(line.id)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md px-1.5 py-2 text-left transition-colors',
                  canStep && 'hover:bg-white/[0.04]',
                  isTip && 'bg-primary/[0.08] ring-1 ring-primary/35'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums',
                    line.isSeed
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                      : isTip
                        ? 'border-primary/50 bg-primary/20 text-primary'
                        : 'border-white/15 bg-black/40 text-zinc-500'
                  )}
                >
                  {line.isSeed ? 'S' : i}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      {line.isSeed
                        ? 'Unfinished bar'
                        : isTip
                          ? 'Tip — reply from here'
                          : `Bar ${i}`}
                    </span>
                    {line.echo ? (
                      <span className="text-[10px] tabular-nums text-primary/80">
                        Fit {line.echo.lockScore}
                      </span>
                    ) : null}
                    {canStep ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                        <ChevronUp className="h-3 w-3" /> Back to here
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'block leading-snug',
                      compact ? 'text-sm' : 'text-[15px] sm:text-base',
                      isTip ? 'text-zinc-50' : 'text-zinc-300'
                    )}
                  >
                    {line.text}
                  </span>
                  {line.echo?.authorName ? (
                    <span className="mt-1 block text-[10px] text-zinc-600">
                      {line.echo.authorName}
                      {line.echo.isPick ? ' · artist pick' : ''}
                    </span>
                  ) : null}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
      {path.length > 1 && onSelectLine ? (
        <div className="border-t border-white/[0.06] px-4 py-2">
          <button
            type="button"
            className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
            onClick={() => onSelectLine(LOCK_SEED_NODE_ID)}
          >
            Reset to unfinished bar
          </button>
        </div>
      ) : null}
    </LockPlate>
  );
}
