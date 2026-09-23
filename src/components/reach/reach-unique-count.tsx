'use client';

import { Eye } from 'lucide-react';
import { compactReachCount } from '@/lib/profile-view-client';
import { cn } from '@/lib/utils';

type ReachUniqueCountProps = {
  count: number;
  /** e.g. "Profile visits" or "Unique landings" */
  label?: string;
  /** Owner can tap for analytics */
  interactive?: boolean;
  onPress?: () => void;
  className?: string;
  size?: 'sm' | 'md';
  /** Top bar: eye + number only; full label in tooltip. */
  compact?: boolean;
};

export function ReachUniqueCount({
  count,
  label = 'Unique landings',
  interactive = false,
  onPress,
  className,
  size = 'sm',
  compact = false,
}: ReachUniqueCountProps) {
  const text =
    count === 1 && label.toLowerCase().includes('visit')
      ? '1 visit'
      : `${compactReachCount(count)} ${label.toLowerCase()}`;

  const inner = (
    <>
      <Eye
        className={cn(
          'shrink-0 opacity-80',
          compact ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
        )}
      />
      <span
        className={cn(
          'font-bold tabular-nums',
          compact ? 'text-[10px]' : size === 'md' ? 'text-sm' : 'text-[11px]'
        )}
      >
        {compactReachCount(count)}
      </span>
      {!compact ? (
        size === 'md' ? (
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        ) : (
          <span className="hidden text-[8px] font-bold uppercase tracking-wider text-muted-foreground min-[420px]:inline sm:text-[9px]">
            {label}
          </span>
        )
      ) : null}
    </>
  );

  const classes = cn(
    'inline-flex items-center text-muted-foreground',
    compact ? 'gap-1' : 'gap-1.5',
    size === 'md' && !compact && 'flex-col gap-0.5 text-center sm:flex-row sm:gap-1.5',
    interactive &&
      (compact
        ? 'rounded px-0.5 transition-colors hover:text-cyan-100'
        : 'rounded-md px-1.5 py-0.5 transition-colors hover:bg-cyan-500/10 hover:text-cyan-100'),
    className
  );

  if (interactive && onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={classes}
        title={`${text} — tap for reach analytics`}
        aria-label={text}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={classes} title={text}>
      {inner}
    </span>
  );
}
