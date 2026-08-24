'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { guestTryHref } from '@/lib/guest-try';
import { prefetchGuestTrySheetNow, prefetchGuestTrySheetWhenIdle } from '@/lib/prefetch-guest-try-sheet';

const HERO_BTN =
  'h-12 sm:h-14 min-w-0 w-full sm:min-w-[240px] sm:w-auto px-7 text-sm sm:text-base font-bold rounded-full';

/**
 * Hero CTA row — scene-first: claim a public music home + try writing.
 * Pricing lives quieter below; Pro is not the lead.
 */
export function LandingHeroCtAs() {
  const router = useRouter();
  useEffect(() => {
    prefetchGuestTrySheetWhenIdle((href) => router.prefetch(href));
  }, [router]);
  const warmTry = () => prefetchGuestTrySheetNow((href) => router.prefetch(href));

  return (
    <div className="flex flex-col items-center gap-3.5 pt-4 relative z-50 w-full max-w-3xl mx-auto lg:items-start">
      <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
        <Button
          asChild
          size="lg"
          className={`${HERO_BTN} bg-primary hover:bg-primary/90 shadow-[0_0_40px_rgba(59,130,246,0.45)] group transition-all`}
        >
          <LandingSignupLink intent="claim_artist_home">
            <span className="flex items-center justify-center gap-2">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Claim your free music home
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform shrink-0" />
            </span>
          </LandingSignupLink>
        </Button>

        <Button
          asChild
          size="lg"
          variant="outline"
          className={`${HERO_BTN} border-emerald-500/45 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:text-white`}
        >
          <Link
            href={guestTryHref('landing')}
            onMouseEnter={warmTry}
            onFocus={warmTry}
          >
            <span className="flex items-center justify-center gap-2">
              <PenLine className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Try writing free
            </span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-start">
        <Link
          href="/pricing"
          className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          Studio tiers &amp; pricing
        </Link>
      </div>
    </div>
  );
}
