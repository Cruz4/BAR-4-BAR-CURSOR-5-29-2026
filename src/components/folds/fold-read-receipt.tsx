'use client';

import { CheckCheck } from 'lucide-react';
import { formatFoldMessageTime } from '@/lib/folds/message-dates';
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
  const when = formatFoldMessageTime(readAt);
  if (!when) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-serif italic text-amber-200/55',
        compact ? 'mt-0.5 text-[8px]' : 'mt-0.5 justify-end text-[10px]',
        className
      )}
      title={`Seen ${when}`}
    >
      <CheckCheck className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
      seen @{when}
    </span>
  );
}
