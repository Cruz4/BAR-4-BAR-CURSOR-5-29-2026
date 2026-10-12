'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Compass, MessageCircle, PenLine, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalFooter } from '@/components/legal-footer';
import { LandingShowcase } from '@/components/marketing/landing-showcase';
import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';
import { LandingHeroCtAs } from '@/components/marketing/landing-hero-ctas';
import { LandingSignInLink, LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { ProBillingCheckoutCta } from '@/components/marketing/pro-billing-checkout-cta';
import { getSignupInkMarketingLine } from '@/lib/studio-tiers';
import { BrandLockup } from '@/components/brand-lockup';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
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
                      AKAsheet
                    </h2>
                  </motion.div>
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-[2.55rem] font-headline font-bold text-foreground dark:text-white tracking-widest uppercase leading-tight">
                      YOUR BOOTH. YOUR BLOCK.{' '}
                      <span className="text-primary">YOUR BARS.</span>
                    </h3>
                  </div>
                </div>

                <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed tracking-wide text-foreground/90 drop-shadow-lg dark:text-white md:text-lg lg:mx-0">
                  Your public music home and social feed in one place — post on your Wall, collect friends
                  and guestbook love, and scroll The Scene to discover bars from artists and Music Fans.
                  When it&apos;s time to write, open The Vault and build songs bar by bar.
                </p>

                <div className="grid gap-2 text-left sm:grid-cols-3" aria-label="How AKAsheet works">
                  <div className="rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/[0.08] p-3">
                    <MessageCircle className="mb-2 h-4 w-4 text-fuchsia-300" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">Wall &amp; feed</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Share bars on your Artist Home. Love, reply, and reverb in The Scene feed.
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-400/25 bg-blue-500/[0.08] p-3">
                    <PenLine className="mb-2 h-4 w-4 text-blue-300" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Write your way</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Private by default. Build bar by bar with tools that learn your style.</p>
                  </div>
                  <div className="rounded-lg border border-sky-400/25 bg-sky-500/[0.08] p-3">
                    <Compass className="mb-2 h-4 w-4 text-sky-300" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Find your Scene</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Follow friends, discover taste-matched posts, and grow your public home.
                    </p>
                  </div>
                </div>

                <LandingHeroCtAs />
                <Button asChild variant="outline" className="border-sky-400/40 bg-sky-500/10 font-bold uppercase tracking-wider text-sky-200">
                  <Link href="/discover">Discover artists &amp; Music Fans</Link>
                </Button>
              </div>

              <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl lg:justify-self-end">
                <p className="mb-2 text-[10px] font-code font-bold uppercase tracking-[0.22em] text-fuchsia-300 text-center lg:text-left">
                  Public music home — live on the web
                </p>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/marketing/feature-artist-home-live.jpg"
                    alt="AKAsheet Artist Home — shareable public artist page"
                    className="w-full h-auto object-contain object-top"
                    loading="eager"
                  />
                </div>
                <p className="mt-2 text-center text-[10px] font-code text-muted-foreground lg:text-left">
                  Free to join. Your page stays private until you publish it.
                  {firstDropsOn ? ' Ready to release? Open New release and put Listen / buy on your page.' : ''}
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
              Free public home · Wall &amp; Scene feed · studio one click in
              {firstDropsOn ? ' · Releases' : ''}
            </p>
            <p className="font-code text-[10px] md:text-xs text-muted-foreground">
              {getSignupInkMarketingLine('landing')}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 px-8 font-bold rounded-full">
                <LandingSignupLink intent="claim_artist_home">
                  Claim your free music home
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
          AKAsheet BY JORDIE CRUZ
        </p>
        <LegalFooter className="opacity-80 pt-4 border-t border-white/10 w-full max-w-2xl" />
      </footer>
    </div>
  );
}
