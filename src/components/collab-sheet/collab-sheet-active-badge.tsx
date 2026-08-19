'use client';

import { cn } from '@/lib/utils';

/** Live-on-sheet indicator — sits under the collab count chip in the toolbar. */
export function CollabSheetActiveBadge({
  liveCount,
  className,
}: {
  liveCount: number;
  className?: string;
}) {
  if (liveCount <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 font-code text-[8px] font-bold uppercase tracking-wider text-emerald-300',
        className
      )}
      aria-label={`${liveCount} collaborator${liveCount === 1 ? '' : 's'} active on this sheet`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      Active
    </span>
  );
}
