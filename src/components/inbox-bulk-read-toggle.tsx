'use client';

import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type InboxBulkReadToggleProps = {
  unreadCount: number;
  onMarkAllRead: () => void | Promise<void>;
  onMarkAllUnread?: () => void | Promise<void>;
  busy?: boolean;
  variant?: 'emerald' | 'amber';
  compact?: boolean;
  className?: string;
};

export function InboxBulkReadToggle({
  unreadCount,
  onMarkAllRead,
  busy,
  variant = 'emerald',
  compact,
  className,
}: InboxBulkReadToggleProps) {
  const hasUnread = unreadCount > 0;
  const accent =
    variant === 'amber'
      ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-100'
      : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300';
  const caughtUpAccent =
    variant === 'amber' ? 'text-amber-300' : 'text-emerald-400';

  if (!hasUnread) {
    return (
      <span
        className={cn(
          'inline-flex h-7 shrink-0 items-center justify-center px-1.5',
          caughtUpAccent,
          className
        )}
        title="All caught up"
        aria-label="All caught up"
      >
        <Check className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} aria-hidden />
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      className={cn(
        'h-auto shrink-0 gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
        accent,
        compact && 'text-[8px]',
        className
      )}
      onClick={() => void onMarkAllRead()}
    >
      <CheckCheck className="h-3 w-3" />
      Mark all read
    </Button>
  );
}
