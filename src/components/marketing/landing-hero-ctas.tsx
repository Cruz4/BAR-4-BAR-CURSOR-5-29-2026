'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { buildLoginPath, buildProCheckoutPath } from '@/lib/checkout-intent';
import {
  getFreeSignupCtaLine,
  getProIntentBilledDetail,
  getProIntentInkDetail,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT,
} from '@/lib/studio-tiers';

const HERO_BTN =
  'h-14 sm:h-16 min-w-[260px] w-full sm:w-[260px] px-8 text-base sm:text-lg font-bold rounded-full';

/** Hero CTA row — toggle above, free demo + pay-now Pro. */
export function LandingHeroCtAs() {
  const [isYearly, setIsYearly] = useState(true);
  const billing = isYearly ? 'yearly' : 'monthly';
  const proPrice = isYearly ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE;
  const payNowCheckoutHref = buildLoginPath(buildProCheckoutPath(isYearly));

  return (
    <div className="flex flex-col items-center gap-4 pt-4 relative z-50 w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 sm:gap-4">
        <Label
          htmlFor="hero-billing-toggle"
          className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
            !isYearly ? 'text-primary' : 'text-muted-foreground/50'
          }`}
        >
          Monthly
        </Label>
        <Switch
          id="hero-billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="scale-95"
        />
        <Label
          htmlFor="hero-billing-toggle"
          className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
            isYearly ? 'text-accent' : 'text-muted-foreground/50'
          }`}
        >
          Yearly
        </Label>
        {isYearly && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-accent/90">
            Save {PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}%
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
        <Button
          asChild
          size="lg"
          className={`${HERO_BTN} bg-primary hover:bg-primary/90 shadow-[0_0_40px_rgba(59,130,246,0.5)] group transition-all`}
        >
          <LandingSignupLink>
            <span className="flex items-center justify-center gap-2">
              {getFreeSignupCtaLine()}
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform shrink-0" />
            </span>
          </LandingSignupLink>
        </Button>

        <Button
          asChild
          size="lg"
          className={`${HERO_BTN} bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_0_32px_rgba(251,191,36,0.25)] transition-all hover:scale-[1.02]`}
        >
          <Link href={payNowCheckoutHref}>Go Pro — {proPrice}/mo</Link>
        </Button>
      </div>

      <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 font-code uppercase tracking-wide text-center">
        {getProIntentInkDetail(billing)} · {getProIntentBilledDetail(billing)} · card required
      </p>

      <Link href="/pricing">
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          View Studio Tiers
        </Button>
      </Link>
    </div>
  );
}
