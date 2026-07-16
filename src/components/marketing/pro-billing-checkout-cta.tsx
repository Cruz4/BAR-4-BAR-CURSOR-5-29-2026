'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { buildLoginPath, buildProCheckoutPath } from '@/lib/checkout-intent';
import {
  getProIntentBilledDetail,
  getProIntentInkDetail,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_TOGGLE_LABEL,
} from '@/lib/studio-tiers';

type ProBillingCheckoutCtaProps = {
  /** compact = footer CTA; card = login upgrade card */
  variant?: 'compact' | 'card';
  className?: string;
};

function ProBillingToggle({
  isYearly,
  onCheckedChange,
}: {
  isYearly: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label
        className={cn(
          'text-[9px] sm:text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors',
          !isYearly ? 'text-primary' : 'text-muted-foreground/50'
        )}
      >
        Monthly
      </Label>
      <Switch checked={isYearly} onCheckedChange={onCheckedChange} className="scale-90" />
      <Label
        className={cn(
          'text-[9px] sm:text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors',
          isYearly ? 'text-accent' : 'text-muted-foreground/50'
        )}
      >
        Yearly
      </Label>
      {isYearly && (
        <span className="text-[8px] font-bold uppercase tracking-wider text-accent/80">
          {PRO_YEARLY_TOGGLE_LABEL.split('·')[0].trim()}
        </span>
      )}
    </div>
  );
}

/** Billing toggle + Pro checkout link (yearly default). */
export function ProBillingCheckoutCta({ variant = 'compact', className }: ProBillingCheckoutCtaProps) {
  const [isYearly, setIsYearly] = useState(true);
  const billing = isYearly ? 'yearly' : 'monthly';
  const checkoutHref = buildLoginPath(buildProCheckoutPath(isYearly));

  if (variant === 'card') {
    const monthlyHref = buildLoginPath(buildProCheckoutPath(false));
    const yearlyHref = buildLoginPath(buildProCheckoutPath(true));

    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-[10px] font-code uppercase tracking-widest text-muted-foreground">
          Choose a plan only if you want paid Pro now:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-12 py-2.5 border-primary/35 bg-primary/[0.04] hover:bg-primary/10"
          >
            <Link href={monthlyHref} className="flex flex-col items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">Monthly Pro</span>
              <span className="text-[10px] font-code text-primary">{PRO_MONTHLY_PRICE}/month · billed monthly</span>
            </Link>
          </Button>
          <Button
            asChild
            className="h-auto min-h-12 py-2.5 bg-accent/90 text-accent-foreground hover:bg-accent"
          >
            <Link href={yearlyHref} className="flex flex-col items-start">
              <span className="text-xs font-bold uppercase tracking-wider">Yearly Pro · Best Value</span>
              <span className="text-[10px] font-code">{PRO_YEARLY_PRICE}/month · {getProIntentBilledDetail('yearly')}</span>
            </Link>
          </Button>
        </div>
        <p className="text-[9px] font-code text-muted-foreground leading-relaxed">
          Selecting a plan opens its checkout path. You will review the plan before submitting payment.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <ProBillingToggle isYearly={isYearly} onCheckedChange={setIsYearly} />
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 px-8 font-bold rounded-full border-accent/40 text-accent hover:bg-accent/10"
      >
        <Link href={checkoutHref}>Go Pro — {isYearly ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE}/mo</Link>
      </Button>
      <p className="text-[9px] text-muted-foreground font-code uppercase tracking-wide text-center">
        {getProIntentInkDetail(billing)} · {getProIntentBilledDetail(billing)}
      </p>
    </div>
  );
}

/** Header nav — yearly default, matches pricing recommended tier. */
export function proCheckoutHeaderHref(): string {
  return buildLoginPath(buildProCheckoutPath(true));
}
