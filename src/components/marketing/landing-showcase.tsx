'use client';

import React from 'react';
import { SocialProofBar } from '@/components/marketing/social-proof-bar';
import { FeatureShowcaseSection } from '@/components/marketing/feature-showcase-section';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import { getSignupInkMarketingLine } from '@/lib/studio-tiers';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';

type LandingShowcaseProps = {
  /** Login page shows a scroll hint above the auth form; home page uses its own CTA. */
  showClosingCta?: boolean;
};

/** Product showcase — shares page-level LoginStudioAtmosphere (no section breaks). */
export function LandingShowcase({ showClosingCta = true }: LandingShowcaseProps) {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  return (
    <>
      <SocialProofBar />
      <FeatureShowcaseSection />
      <ComparisonTable />

      {showClosingCta ? (
        <section className="relative py-8 px-4 text-center z-10">
          <div className="container mx-auto max-w-2xl space-y-2">
            <h3 className="font-headline text-xl md:text-2xl font-bold uppercase text-white drop-shadow-lg">
              Ready to claim your booth?
            </h3>
            <p className="font-code text-xs md:text-sm text-fuchsia-300/90">
              Free public music home · The Scene · studio one click in
              {firstDropsOn ? ' · First Drops' : ''}
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
