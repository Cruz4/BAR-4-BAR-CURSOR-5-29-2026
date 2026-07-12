'use client';

import React from 'react';
import { SocialProofBar } from '@/components/marketing/social-proof-bar';
import { FeatureShowcaseSection } from '@/components/marketing/feature-showcase-section';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import { MarketingMediaFrame } from '@/components/marketing/marketing-media-frame';
import { getProMarketingLine, getSignupInkMarketingLine } from '@/lib/studio-tiers';

type LandingShowcaseProps = {
  /** Login page shows a scroll hint above the auth form; home page uses its own CTA. */
  showClosingCta?: boolean;
};

/** Product showcase — shares page-level LoginStudioAtmosphere (no section breaks). */
export function LandingShowcase({ showClosingCta = true }: LandingShowcaseProps) {
  return (
    <>
      <section className="px-3 sm:px-4 pb-4 pt-4 relative z-10 w-full">
        <div className="container mx-auto max-w-6xl w-full">
          <MarketingMediaFrame
            src="/marketing/feature-dna-suite.png"
            alt="Bar 4 Bar DNA Suite with creative direction, guardrails, and intents"
            mediaType="image"
            variant="hero-full"
            priority
            className="shadow-[0_0_40px_rgba(59,130,246,0.06)]"
          />
        </div>
      </section>

      <SocialProofBar />
      <FeatureShowcaseSection />
      <ComparisonTable />

      {showClosingCta ? (
        <section className="relative py-8 px-4 text-center z-10">
          <div className="container mx-auto max-w-2xl space-y-2">
            <h3 className="font-headline text-xl md:text-2xl font-bold uppercase text-white drop-shadow-lg">
              Ready to chase the next bar?
            </h3>
            <p className="font-code text-xs md:text-sm text-primary/80">
              {getProMarketingLine()}
            </p>
            <p className="font-code text-[10px] md:text-xs text-muted-foreground/90">
              {getSignupInkMarketingLine('showcase')}
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
