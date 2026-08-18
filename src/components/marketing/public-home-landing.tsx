'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalFooter } from '@/components/legal-footer';
import { LandingShowcase } from '@/components/marketing/landing-showcase';
import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';
import { LandingHeroCtAs } from '@/components/marketing/landing-hero-ctas';
import { LandingSignInLink, LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { StudioThemeControls } from '@/components/studio-theme-controls';
import { ProBillingCheckoutCta } from '@/components/marketing/pro-billing-checkout-cta';
import { getSignupInkMarketingLine } from '@/lib/studio-tiers';
import { BrandLockup } from '@/components/brand-lockup';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { firstDropsFeeCashoutLine, firstDropsPitch } from '@/lib/drop-commerce';
import { guestTryHref } from '@/lib/guest-try';
import { prefetchGuestTrySheetNow } from '@/lib/prefetch-guest-try-sheet';

/** Public marketing surface — served at `/welcome` (and `/` when guest try sheet is off). */
export function PublicHomeLanding() {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30 overflow-x-hidden relative">
      <LoginStudioAtmosphere />

      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/[0.06] bg-background/40 backdrop-blur-xl z-[200] grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 gap-2">
        <div aria-hidden className="min-w-0" />

        <BrandLockup variant="marketing" titleTag="h1" className="justify-center max-w-[min(100%,14rem)] sm:max-w-none" />

        <nav className="flex items-center justify-end gap-2 sm:gap-4 min-w-0">
          <a
            href="#features"
            className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            Features
          </a>
          <Link
            href="/pricing"
            className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            Pricing
          </Link>
          <LandingSignInLink className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            Sign in
          </LandingSignInLink>
          <StudioThemeControls className="hidden sm:inline-flex" />
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-3 sm:px-5 gap-1.5 sm:gap-2 rounded-md shadow-lg shrink-0 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
          >
            <LandingSignupLink intent="claim_artist_home">
              <span className="truncate">Claim free home</span>
            </LandingSignupLink>
          </Button>
        </nav>
      </header>

      <main className="flex-grow flex flex-col mt-16 relative z-10">
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center px-4 pt-6 pb-14 lg:pt-8 lg:pb-16">
          <div className="mx-auto w-full max-w-7xl animate-in fade-in zoom-in duration-1000 relative z-10 -translate-y-4 sm:-translate-y-6 lg:-translate-y-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
              <div className="space-y-5 text-center lg:text-left max-w-2xl lg:pr-4">
                <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-fuchsia-500/40 px-6 py-2 rounded-full shadow-2xl">
                  <Radio className="h-4 w-4 text-fuchsia-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-fuchsia-300">
                    Your scene · your studio
                  </span>
                </div>

                <div className="space-y-3">
                  <motion.div whileHover={{ scale: 1.02 }} className="cursor-default">
                    <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-[5rem] xl:text-[5.6rem] font-headline font-bold text-foreground dark:text-white tracking-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] dark:drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] leading-none lg:whitespace-nowrap">
                      BAR 4 BAR
                    </h2>
                  </motion.div>
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-[2.55rem] font-headline font-bold text-foreground dark:text-white tracking-widest uppercase leading-tight">
                      YOUR BOOTH. YOUR BLOCK.{' '}
                      <span className="text-primary">YOUR BARS.</span>
                    </h3>
                  </div>
                </div>

                <p className="text-sm md:text-lg text-foreground/90 dark:text-white font-body font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 tracking-wide drop-shadow-lg">
                  Sign in and land on{' '}
                  <span className="bg-fuchsia-500/20 text-fuchsia-300 px-1 rounded-sm font-bold">The Scene</span>
                  — friends, discover, and your shareable{' '}
                  <span className="bg-fuchsia-500/20 text-fuchsia-300 px-1 rounded-sm font-bold">Artist Home</span>
                  {' '}
                  <span className="text-fuchsia-200/90">— completely free.</span>
                  The Vault is one click away: write bar by bar, train your{' '}
                  <span className="bg-primary/20 text-primary px-1 rounded-sm font-bold">DNA</span>, drop what
                  you&apos;re proud of back on the block.
                  {firstDropsOn ? (
                    <>
                      {' '}
                      When the song is ready, put it on that page.{' '}
                      <span className="bg-amber-500/20 text-amber-200 px-1 rounded-sm font-bold">Listen / buy</span>
                      {' '}
                      sits at the top of your Artist Home so a first-time visitor does not have to hunt. Preview 30 seconds, buy once, stream here.{' '}
                      {firstDropsFeeCashoutLine()}
                    </>
                  ) : null}
                </p>

                <LandingHeroCtAs />
              </div>

              <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl lg:justify-self-end">
                <p className="mb-2 text-[10px] font-code font-bold uppercase tracking-[0.22em] text-fuchsia-300 text-center lg:text-left">
                  Artist Home — live on the web
                </p>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/marketing/feature-artist-home-live.jpg"
                    alt="Bar 4 Bar Artist Home — shareable public artist page"
                    className="w-full h-auto object-contain object-top"
                    loading="eager"
                  />
                </div>
                <p className="mt-2 text-center text-[10px] font-code text-muted-foreground lg:text-left">
                  Completely free. Private by default. Flip it live when you&apos;re ready for eyes.
                  {firstDropsOn ? ` ${firstDropsPitch()}` : ''}
                </p>
              </div>
            </div>
          </div>
        </section>

        <LandingShowcase showClosingCta={false} />

        <section className="relative py-10 px-4 text-center z-10">
          <div className="container mx-auto max-w-2xl space-y-4">
            <h3 className="font-headline text-xl md:text-2xl font-bold uppercase text-foreground dark:text-white">
              Ready to claim your booth?
            </h3>
            <p className="font-code text-xs md:text-sm text-fuchsia-300/90">
              Free Artist Home · The Scene · full studio one click in
              {firstDropsOn ? ' · First Drops' : ''}
            </p>
            <p className="font-code text-[10px] md:text-xs text-muted-foreground">
              {getSignupInkMarketingLine('landing')}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 px-8 font-bold rounded-full">
                <LandingSignupLink intent="claim_artist_home">
                  Claim your free Artist Home
                </LandingSignupLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 font-bold rounded-full border-primary/40">
                <Link href="/">Press your profile</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 font-bold rounded-full border-emerald-500/40">
                <Link
                  href={guestTryHref('landing')}
                  onMouseEnter={() => prefetchGuestTrySheetNow()}
                  onFocus={() => prefetchGuestTrySheetNow()}
                >
                  Try writing free
                </Link>
              </Button>
            </div>
            <div className="pt-2">
              <ProBillingCheckoutCta variant="compact" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Already have an account?{' '}
              <LandingSignInLink className="text-primary font-bold hover:underline">Sign in</LandingSignInLink>
            </p>
          </div>
        </section>
      </main>

      <footer className="py-16 px-4 relative z-10 flex flex-col items-center gap-6">
        <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.5em] opacity-50">
          BAR 4 BAR BY JORDIE CRUZ
        </p>
        <LegalFooter className="opacity-80 pt-4 border-t border-white/10 w-full max-w-2xl" />
      </footer>
    </div>
  );
}
