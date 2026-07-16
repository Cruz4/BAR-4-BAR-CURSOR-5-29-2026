'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalFooter } from '@/components/legal-footer';
import { LandingShowcase } from '@/components/marketing/landing-showcase';
import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';
import { LandingHeroCtAs } from '@/components/marketing/landing-hero-ctas';
import { LandingSignInLink, LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { StudioThemeControls } from '@/components/studio-theme-controls';
import { GuestDemoSheet } from '@/components/marketing/guest-demo-sheet';
import { ProBillingCheckoutCta, proCheckoutHeaderHref } from '@/components/marketing/pro-billing-checkout-cta';
import {
  getFreeSignupCtaLine,
  getProMarketingLine,
  getSignupInkMarketingLine,
} from '@/lib/studio-tiers';
import { BrandLockup } from '@/components/brand-lockup';

/** Public marketing surface for anonymous visitors on `/` (no auth form — CTA to `/login`). */
export function PublicHomeLanding() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30 overflow-x-hidden relative">
      <LoginStudioAtmosphere />

      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/[0.06] bg-background/40 backdrop-blur-xl z-[200] grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 gap-2">
        <div aria-hidden className="min-w-0" />

        <BrandLockup variant="marketing" titleTag="h1" linkHref="/" className="justify-center max-w-[min(100%,14rem)] sm:max-w-none" />

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
          <Link
            href={proCheckoutHeaderHref()}
            className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
          >
            Go Pro
          </Link>
          <LandingSignInLink className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            Sign in
          </LandingSignInLink>
          <StudioThemeControls className="hidden sm:inline-flex" />
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-3 sm:px-5 gap-1.5 sm:gap-2 rounded-md shadow-lg shrink-0 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
          >
            <LandingSignupLink>
              <span className="truncate">Create free account</span>
            </LandingSignupLink>
          </Button>
        </nav>
      </header>

      <main className="flex-grow flex flex-col mt-16 relative z-10">
        <section className="relative min-h-[calc(92vh-4rem)] flex flex-col items-center justify-center px-4 py-10 gap-7">
          <div className="text-center space-y-3 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-orange-500/40 px-5 py-1.5 rounded-full shadow-2xl">
              <Sparkles className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-500">
                Your lyrics · your patterns · your process
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold uppercase tracking-tight text-foreground dark:text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]">
              Your smart DNA notebook<br className="sm:hidden" /> <span className="text-primary">for lyrics.</span>
            </h2>
            <p className="text-xs sm:text-sm font-code text-muted-foreground max-w-lg mx-auto">
              Write naturally. Watch your rhyme patterns surface, then discover new ways to move the verse when you want them.
            </p>
          </div>

          <GuestDemoSheet />

          <a
            href="#pitch"
            className="text-[10px] font-code font-bold uppercase tracking-[0.3em] text-muted-foreground/70 hover:text-primary transition-colors animate-pulse"
          >
            ↓ What is Bar 4 Bar?
          </a>
        </section>

        <section id="pitch" className="relative flex items-center px-4 py-8 lg:py-10">
          <div className="mx-auto w-full max-w-7xl animate-in fade-in zoom-in duration-1000 relative z-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
              <div className="space-y-5 text-center lg:text-left max-w-2xl lg:pr-4">
                <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-orange-500/40 px-6 py-2 rounded-full shadow-2xl">
              <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-500">
                Professional Lyrical Workspace
              </span>
                </div>

                <div className="space-y-3">
                  <motion.div whileHover={{ scale: 1.02 }} className="cursor-default">
                    <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-[5rem] xl:text-[5.6rem] font-headline font-bold text-foreground dark:text-white tracking-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] dark:drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] leading-none lg:whitespace-nowrap">
                      BAR 4 BAR
                    </h2>
                  </motion.div>
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-[2.7rem] font-headline font-bold text-foreground dark:text-white tracking-widest uppercase leading-tight">
                      YOUR <span className="text-primary animate-pulse">ULTIMATE</span> STUDIO RHYME BOOK.
                    </h3>
                  </div>
                </div>

                <p className="text-sm md:text-lg text-foreground/90 dark:text-white font-body font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 tracking-wide drop-shadow-lg">
                  The power-user workstation for{' '}
                  <span className="bg-primary/20 text-primary px-1 rounded-sm font-bold">musicians and lyricists</span>.
                  Organize{' '}
                  <span className="bg-sky-500/20 text-sky-400 px-1 rounded-sm font-bold italic underline decoration-primary/40 underline-offset-8">
                    concept albums
                  </span>
                  , train the AI on your{' '}
                  <span className="bg-primary/20 text-primary px-1 rounded-sm font-bold">unique style</span>, and{' '}
                  <span className="text-sky-400 font-bold">master your craft</span>.
                </p>

                <LandingHeroCtAs />
              </div>

              <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl lg:justify-self-end">
                <p className="mb-2 text-[10px] font-code font-bold uppercase tracking-[0.22em] text-emerald-300 text-center lg:text-left">
                  Live workstation preview
                </p>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  <img
                    src="/marketing/hero-workstation.png"
                    alt="Bar 4 Bar workstation showing generated next-line options"
                    className="w-full h-auto object-contain object-top"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <LandingShowcase showClosingCta={false} />

        <section className="relative py-10 px-4 text-center z-10">
          <div className="container mx-auto max-w-2xl space-y-4">
            <h3 className="font-headline text-xl md:text-2xl font-bold uppercase text-foreground dark:text-white">
              Ready to write your next bar?
            </h3>
            <p className="font-code text-xs md:text-sm text-primary/80">
              {getProMarketingLine()}
            </p>
            <p className="font-code text-[10px] md:text-xs text-muted-foreground">
              {getSignupInkMarketingLine('footnote')}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 pt-1">
              <Button asChild size="lg" className="h-12 px-8 font-bold rounded-full">
                <LandingSignupLink>{getFreeSignupCtaLine()}</LandingSignupLink>
              </Button>
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
