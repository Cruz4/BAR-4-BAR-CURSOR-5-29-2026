'use client';

import { CheckCheck } from 'lucide-react';
import { formatReadReceiptTime } from '@/lib/folds/read-receipts';
import { cn } from '@/lib/utils';

export function FoldReadReceipt({
  readAt,
  compact = false,
  className,
}: {
  readAt: string;
  compact?: boolean;
  className?: string;
}) {
  const when = formatReadReceiptTime(readAt);
  if (!when) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-code uppercase tracking-wider text-amber-200/50',
        compact ? 'mt-0.5 text-[8px]' : 'mt-0.5 justify-end text-[9px] tracking-[0.18em]',
        className
      )}
      title={`Read ${when}`}
    >
      <CheckCheck className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
      Read · {when}
    </span>
  );
}
