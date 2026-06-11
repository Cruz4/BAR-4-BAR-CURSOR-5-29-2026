'use client';

import { Timer } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { FREE_MONTHLY_RESIDENCY_INK, isProUser } from '@/lib/subscription';
import {
  formatFreeMonthlyRefillLabel,
  getDaysUntilFreeMonthlyGrant,
} from '@/lib/ink-grants';
import { cn } from '@/lib/utils';

type InkRefillCountdownProps = {
  className?: string;
  compact?: boolean;
};

/** Visitor-only: days until the next free monthly residency grant. */
export function InkRefillCountdown({ className, compact = false }: InkRefillCountdownProps) {
  const { user } = useAuth();

  if (!user || isProUser(user)) return null;

  const days = getDaysUntilFreeMonthlyGrant(user.createdAt);
  const label = formatFreeMonthlyRefillLabel(user.createdAt);

  if (days === null) return null;

  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-muted-foreground',
        compact ? 'text-[8px] uppercase tracking-wide' : 'text-[10px] leading-snug',
        className
      )}
    >
      <Timer className={cn('shrink-0 text-primary/80', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      <span>
        {compact ? (
          <>
            +{FREE_MONTHLY_RESIDENCY_INK} Ink in {days === 0 ? 'soon' : `${days}d`}
          </>
        ) : (
          label
        )}
      </span>
    </p>
  );
}
