'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type TierPriceSummaryProps = {
  lines: readonly string[];
  variant?: 'default' | 'pro' | 'yearly' | 'visitor';
  className?: string;
  align?: 'left' | 'center';
  size?: 'sm' | 'md';
};

export function TierPriceSummary({
  lines,
  variant = 'default',
  className,
  align = 'left',
  size = 'sm',
}: TierPriceSummaryProps) {
  const iconClass =
    variant === 'yearly'
      ? 'text-accent'
      : variant === 'pro'
        ? 'text-primary'
        : variant === 'visitor'
          ? 'text-muted-foreground'
          : 'text-green-500';

  const textClass =
    variant === 'yearly'
      ? 'text-accent/90'
      : variant === 'pro'
        ? 'text-primary/90'
        : 'text-muted-foreground';

  return (
    <ul
      className={cn(
        'space-y-1.5',
        align === 'center' && 'text-center',
        className
      )}
    >
      {lines.map((line) => (
        <li
          key={line}
          className={cn(
            'flex items-start gap-2.5 font-code leading-relaxed',
            size === 'md' ? 'text-[13px]' : 'text-[10px] leading-snug',
            align === 'center' && 'justify-center'
          )}
        >
          <Check className={cn('mt-0.5 shrink-0', size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3', iconClass)} />
          <span className={textClass}>{line}</span>
        </li>
      ))}
    </ul>
  );
}
