'use client';

import React from 'react';
import { SocialProofBar } from '@/components/marketing/social-proof-bar';
import { FeatureShowcaseSection } from '@/components/marketing/feature-showcase-section';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import { HowItWorksSection } from '@/components/marketing/how-it-works';
import { MarketingMediaFrame } from '@/components/marketing/marketing-media-frame';

/** Product showcase — shares page-level LoginStudioAtmosphere (no section breaks). */
export function LandingShowcase() {
  return (
    <>
      <section className="px-4 pb-10 pt-8 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <MarketingMediaFrame
            src="/marketing/hero-workstation.png"
            alt="Bar 4 Bar workstation with lyrics sheet, DNA Suite, and co-writer"
            mediaType="image"
            priority
            className="shadow-[0_0_60px_rgba(59,130,246,0.08)]"
          />
        </div>
      </section>

      <SocialProofBar />
      <FeatureShowcaseSection />
      <ComparisonTable />
      <HowItWorksSection />

      <section className="relative py-16 px-4 text-center z-10">
        <div className="container mx-auto max-w-2xl space-y-3">
          <h3 className="font-headline text-2xl md:text-3xl font-bold uppercase text-white drop-shadow-lg">
            Ready to chase the next bar?
          </h3>
          <p className="font-code text-sm text-primary/70">
            Free 300 Ink — no credit card. Initialize your session below.
          </p>
        </div>
      </section>
    </>
  );
}
