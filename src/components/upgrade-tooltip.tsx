'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Hint } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { proLockIcon, proLockText } from '@/lib/pro-lock';

interface UpgradeTooltipProps {
  feature: string;
  benefit: string;
  example?: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function UpgradeTooltip({ feature, benefit, example, children, side = 'top' }: UpgradeTooltipProps) {
  return (
    <Hint
      side={side}
      delayDuration={200}
      className="max-w-[280px] p-4 bg-card border-pink-400/40 shadow-[0_0_24px_rgba(244,114,182,0.25)]"
      content={
        <div className="space-y-2">
          <p className="text-[10px] flex items-center gap-1.5 flex-wrap leading-snug">
            <span className="font-bold uppercase tracking-widest text-amber-400">{feature}</span>
            <span className="text-muted-foreground/80">—</span>
            <span className={proLockText('inline-flex items-center gap-1')}>
              <Lock className={proLockIcon('h-3 w-3 shrink-0')} />
              Studio Pro Only
            </span>
          </p>
          <p className="text-xs text-foreground/90 leading-snug">{benefit}</p>
          {example && (
            <p className="text-[10px] text-muted-foreground italic border-l-2 border-pink-400/40 pl-2">{example}</p>
          )}
          <Button asChild size="sm" className="w-full h-8 text-[9px] font-bold uppercase tracking-widest mt-1 bg-pink-600 hover:bg-pink-500">
            <Link href="/usage?tab=cloud">Upgrade Studio</Link>
          </Button>
        </div>
      }
    >
      {children as React.ReactElement}
    </Hint>
  );
}
