'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { buildLoginPath, buildProCheckoutPath } from '@/lib/checkout-intent';
import {
  getFreeSignupCtaLine,
  getProIntentBilledDetail,
  getProIntentInkDetail,
  PRO_YEARLY_PRICE,
} from '@/lib/studio-tiers';

const HERO_BTN =
  'h-14 sm:h-16 min-w-[260px] w-full sm:w-[260px] px-8 text-base sm:text-lg font-bold rounded-full';

/** Hero CTA row — single dominant signup CTA + secondary links. */
export function LandingHeroCtAs() {
  const payNowCheckoutHref = buildLoginPath(buildProCheckoutPath(true));

  return (
    <div className="flex flex-col items-center gap-4 pt-4 relative z-50 w-full max-w-3xl mx-auto">
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

      <p className="text-[10px] sm:text-[11px] text-white/85 font-code text-center leading-relaxed max-w-xl">
        See a real workflow preview first. Start free, and upgrade only if it helps your writing process.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href={payNowCheckoutHref} className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent hover:text-accent/80">
          Go Pro now — {PRO_YEARLY_PRICE}/mo yearly
        </Link>
        <Link href="/pricing" className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
          View Studio Tiers
        </Link>
      </div>

      <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 font-code uppercase tracking-wide text-center">
        {getProIntentInkDetail('yearly')} · {getProIntentBilledDetail('yearly')} · card required
      </p>
    </div>
  );
}
