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
import { ProBillingCheckoutCta, proCheckoutHeaderHref } from '@/components/marketing/pro-billing-checkout-cta';
import {
  getFreeSignupCtaLine,
  getProTrialMarketingLine,
  getSignupInkMarketingLine,
} from '@/lib/studio-tiers';

/** Public marketing surface for anonymous visitors on `/` (no auth form — CTA to `/login`). */
export function PublicHomeLanding() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30 overflow-x-hidden relative">
      <LoginStudioAtmosphere />

      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/[0.06] bg-background/40 backdrop-blur-xl z-[200] grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 gap-2">
        <div aria-hidden className="min-w-0" />

        <div className="flex items-center justify-center gap-2 sm:gap-4 min-w-0 max-w-[min(100%,14rem)] sm:max-w-none">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center p-1.5 shadow-2xl shrink-0">
            <img src="/Logo.png" alt="Bar 4 Bar logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="hidden sm:block text-lg sm:text-2xl font-headline font-bold text-white tracking-tighter uppercase truncate">
            Bar 4 Bar
          </h1>
        </div>

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
        <section className="relative min-h-[88vh] flex flex-col items-center justify-center text-center px-4">
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in duration-1000 relative z-10">
            <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-orange-500/40 px-6 py-2 rounded-full shadow-2xl">
              <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-500">
                Professional Lyrical Workspace
              </span>
            </div>

            <div className="space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} className="cursor-default">
                <h2 className="text-7xl md:text-9xl font-headline font-bold text-white tracking-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]">
                  BAR 4 BAR
                </h2>
              </motion.div>
              <div className="flex items-center justify-center gap-6">
                <h3 className="text-xl md:text-5xl font-headline font-bold text-white tracking-widest uppercase">
                  YOUR <span className="text-primary animate-pulse">ULTIMATE</span> STUDIO RHYME BOOK.
                </h3>
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-4xl md:text-6xl drop-shadow-lg"
                >
                  🤖
                </motion.span>
              </div>
            </div>

            <p className="text-sm md:text-xl text-white font-body font-medium leading-relaxed max-w-3xl mx-auto px-6 tracking-wide drop-shadow-lg">
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
        </section>

        <LandingShowcase showClosingCta={false} />

        <section className="relative py-10 px-4 text-center z-10">
          <div className="container mx-auto max-w-2xl space-y-4">
            <h3 className="font-headline text-xl md:text-2xl font-bold uppercase text-white">
              Ready to write your next bar?
            </h3>
            <p className="font-code text-xs md:text-sm text-primary/80">
              {getProTrialMarketingLine()}
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

      <footer className="py-16 px-4 relative z-10 flex flex-col items-center gap-8">
        <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.5em] opacity-50">
          BAR 4 BAR BY JORDIE CRUZ
        </p>
        <LegalFooter className="opacity-60 pt-2 border-t border-white/5 w-full max-w-xl" />
      </footer>
    </div>
  );
}
