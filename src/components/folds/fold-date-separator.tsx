'use client';

import { formatFoldDaySeparator } from '@/lib/folds/message-dates';

export function FoldDateSeparator({ iso }: { iso: string }) {
  const label = formatFoldDaySeparator(iso);
  if (!label) return null;
  return (
    <div className="relative flex items-center py-2" role="separator" aria-label={label}>
      <div className="h-px flex-1 bg-amber-200/15" />
      <span className="mx-3 shrink-0 font-code text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/55">
        {label}
      </span>
      <div className="h-px flex-1 bg-amber-200/15" />
    </div>
  );
}
