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
  getProIntentCtaLine,
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
    return (
      <div className={cn('space-y-2', className)}>
        <ProBillingToggle isYearly={isYearly} onCheckedChange={setIsYearly} />
        <p className="text-[11px] font-code leading-relaxed text-left">
          Skip the demo limits —{' '}
          <Link href={checkoutHref} className="font-bold text-accent hover:underline">
            {getProIntentCtaLine(billing)}
          </Link>
          {' '}
          for unlimited projects, vault saves, Performance Mode, and {getProIntentInkDetail(billing)} (
          {getProIntentBilledDetail(billing)}).
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
