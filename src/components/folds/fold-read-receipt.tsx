'use client';

import { Check, CheckCheck } from 'lucide-react';
import { formatReadReceiptTime } from '@/lib/folds/read-receipts';
import type { OutgoingReadStatus } from '@/lib/folds/read-receipts';
import { cn } from '@/lib/utils';

export function FoldReadReceipt({
  status,
  readAt,
  compact = false,
  className,
}: {
  /** Preferred: read time or pending. */
  status?: OutgoingReadStatus | null;
  /** Legacy: read timestamp only. */
  readAt?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const resolved: OutgoingReadStatus | null =
    status ??
    (readAt ? { state: 'read', readAt } : null);

  if (!resolved) return null;

  if (resolved.state === 'pending') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-serif italic text-amber-200/45',
          compact ? 'mt-0.5 text-[8px]' : 'mt-0.5 justify-end text-[10px]',
          className
        )}
        title="They have not opened this message yet"
      >
        <Check className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
        Not seen yet
      </span>
    );
  }

  const when = formatReadReceiptTime(resolved.readAt);
  if (!when) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-serif italic text-amber-200/70',
        compact ? 'mt-0.5 text-[8px]' : 'mt-0.5 justify-end text-[10px]',
        className
      )}
      title={`Read ${when}`}
    >
      <CheckCheck className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
      Read {when}
    </span>
  );
}
