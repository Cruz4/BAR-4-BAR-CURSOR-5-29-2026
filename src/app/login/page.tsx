'use client';

import React, { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, ArrowRight, Mail, Lock, User as UserIcon, LogIn, Coffee, Gift, Zap, Import } from 'lucide-react';
import { BUY_ME_COFFEE_URL, SUPPORT_MAILTO } from '@/lib/support';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalFooter } from '@/components/legal-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudioLoader } from '@/components/studio-loader';
import { cn } from '@/lib/utils';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { captureMarketingRefFromUrl, getStoredMarketingRef } from '@/lib/marketing-attribution';
import { motion } from 'framer-motion';
import { REFERRAL_INK_REWARD, REFERRAL_STORAGE_KEY, normalizeReferralCode } from '@/lib/referrals';
import { claimPendingReferral } from '@/components/refer-a-friend-section';
import { InviteGateLoginBanner } from '@/components/invite-gate-login-banner';
import {
  getCheckoutFromPath,
  getProCheckoutLabel,
  getSafeNextPath,
} from '@/lib/checkout-intent';
import { LandingShowcase } from '@/components/marketing/landing-showcase';
import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';
import { MARKETING_FEATURE_BANDS } from '@/lib/marketing-features';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const loginCardRef = useRef<HTMLDivElement>(null);
  const importIntent = searchParams.get('intent') === 'dna-import';
  const safeNext = getSafeNextPath(searchParams.get('next'));
  const proCheckoutIntent = getCheckoutFromPath(safeNext);

  useEffect(() => {
    if (proCheckoutIntent) setAuthMode('signup');
  }, [proCheckoutIntent]);

  const scrollToLogin = useCallback(() => {
    const el = loginCardRef.current;
    if (!el) return;

    const align = (behavior: ScrollBehavior = 'smooth') => {
      el.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    };

    align('smooth');

    const correctIfDrifted = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const cardCenter = rect.top + rect.height / 2;
      if (Math.abs(cardCenter - viewportCenter) > 48) {
        align(Math.abs(cardCenter - viewportCenter) > 200 ? 'auto' : 'smooth');
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(correctIfDrifted);
    });
    window.setTimeout(correctIfDrifted, 450);
    window.setTimeout(correctIfDrifted, 1000);
  }, []);

  useEffect(() => {
    if (window.location.hash !== '#login') return;
    const timer = window.setTimeout(() => scrollToLogin(), 120);
    return () => window.clearTimeout(timer);
  }, [scrollToLogin]);

  useEffect(() => {
    const urls = new Set([
      '/marketing/hero-workstation.png',
      ...MARKETING_FEATURE_BANDS.map((band) => band.mediaSrc),
    ]);
    for (const src of urls) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  useEffect(() => {
    captureMarketingRefFromUrl();
    const ref = normalizeReferralCode(searchParams.get('ref'));
    if (ref) {
      try {
        sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref);
      } catch {
        /* ignore */
      }
    }
  }, [searchParams]);

  const applyReferralIfNew = async (userId: string) => {
    try {
      const stored = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
      const code = normalizeReferralCode(stored);
      if (!code) return;
      const rewarded = await claimPendingReferral(userId, code);
      sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
      if (rewarded) {
        toast({
          title: 'Referral bonus applied',
          description: `You and your friend each received ${REFERRAL_INK_REWARD} permanent Ink.`,
        });
      }
    } catch (e) {
      console.warn('Referral claim failed', e);
    }
  };

  const syncUserProfile = async (firebaseUser: any, isNewSignup = false) => {
    try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const existing = await getDoc(userRef);
        const isNew = isNewSignup || !existing.exists();
        const userData: Record<string, unknown> = {
          displayName: firebaseUser.displayName || displayName || 'Anonymous Artist',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          lastLogin: serverTimestamp(),
        };
        if (isNew) {
          userData.createdAt = new Date().toISOString();
          userData.role = 'artist';
          userData.subscriptionStatus = 'none';
          userData.subscriptionTier = 'none';
          userData.status = 'active';
          userData.trialStartedAt = new Date().toISOString();
          const signupRef = getStoredMarketingRef();
          if (signupRef) userData.signupAttribution = signupRef;
        }
        await setDoc(userRef, userData, { merge: true });
        if (isNew) {
          const signupRef = getStoredMarketingRef();
          await trackStudioEvent(ANALYTICS_EVENTS.SIGNUP, {
            method: authMode === 'signup' ? 'email' : 'google',
            ...(signupRef ? { ref: signupRef } : {}),
          });
          await applyReferralIfNew(firebaseUser.uid);
        }
        return isNew;
    } catch (e) {
      console.error("Profile sync failed", e);
    }
  };

  const handleGoogleSignIn = async () => {
    if (authMode === 'signup' && !termsAccepted) {
      toast({ variant: 'destructive', title: 'Terms Required', description: 'Please accept the Terms of Service and Privacy Policy to create an account.' });
      return;
    }
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isNew = await syncUserProfile(result.user);
      if (!isNew) {
        try {
          sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    } catch (error: any) {
      setIsProcessing(false);
      if (error.code !== 'auth/popup-closed-by-user') {
          toast({ variant: 'destructive', title: 'Sign-in Error', description: error.message });
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (authMode === 'signup' && !termsAccepted) {
      toast({ variant: 'destructive', title: 'Terms Required', description: 'Please accept the Terms of Service and Privacy Policy to create an account.' });
      return;
    }
    setIsProcessing(true);
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(userCredential.user, { displayName });
        await syncUserProfile(userCredential.user, true);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserProfile(userCredential.user);
      }
      toast({ title: "Success", description: "Studio session authorized." });
    } catch (error: any) {
      setIsProcessing(false);
      toast({ variant: 'destructive', title: 'Authentication Failed', description: error.message });
    }
  };

  if (user && !isProcessing) return null;

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30 overflow-x-hidden relative">
      <LoginStudioAtmosphere />

      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/[0.06] bg-background/40 backdrop-blur-xl z-[200] grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 gap-2">
          <div aria-hidden className="min-w-0" />

          <div className="flex items-center justify-center gap-2 sm:gap-4 min-w-0 max-w-[min(100%,14rem)] sm:max-w-none">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center p-1.5 shadow-2xl shrink-0">
                  <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="hidden sm:block text-lg sm:text-2xl font-headline font-bold text-white tracking-tighter uppercase truncate">Bar 4 Bar</h1>
          </div>

          <nav className="flex items-center justify-end gap-2 sm:gap-4 min-w-0">
            <a href="#features" className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Features</a>
            <Link href="/pricing" className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
            <Button onClick={scrollToLogin} className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-3 sm:px-5 gap-1.5 sm:gap-2 rounded-md shadow-lg shrink-0 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm">
              <LogIn className="h-4 w-4 shrink-0" /> <span className="truncate">Login</span>
            </Button>
          </nav>
      </header>

      <main className="flex-grow flex flex-col mt-16 relative z-10">
        {/* HERO SECTION */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4">
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in duration-1000 relative z-10">
                <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-orange-500/40 px-6 py-2 rounded-full shadow-2xl">
                    <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-500">Professional Lyrical Workspace</span>
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
                        <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-4xl md:text-6xl drop-shadow-lg">🤖</motion.span>
                    </div>
                </div>

                <p className="text-sm md:text-xl text-white font-body font-medium leading-relaxed max-w-3xl mx-auto px-6 tracking-wide drop-shadow-lg">
                    The power-user workstation for <span className="bg-primary/20 text-primary px-1 rounded-sm font-bold">musicians and lyricists</span>. Organize <span className="bg-sky-500/20 text-sky-400 px-1 rounded-sm font-bold italic underline decoration-primary/40 underline-offset-8">concept albums</span>, train the AI on your <span className="bg-primary/20 text-primary px-1 rounded-sm font-bold">unique style</span>, and <span className="text-sky-400 font-bold">master your craft</span>.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 relative z-50 -mt-6">
                    <Button 
                        onClick={scrollToLogin} 
                        size="lg" 
                        className="h-16 px-12 text-lg font-bold bg-primary hover:bg-primary/90 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.5)] min-w-[260px] group transition-all relative overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                           Enter the Studio <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Button>
                    <Link href="/pricing" className="relative z-50">
                        <Button 
                            variant="outline" 
                            size="lg" 
                            className="h-16 px-12 text-lg font-bold bg-black/40 hover:bg-black/60 border-white/20 text-white rounded-full min-w-[260px] backdrop-blur-md transition-all hover:scale-105"
                        >
                            View Studio Tiers
                        </Button>
                    </Link>
                </div>
            </div>

        </section>

        <LandingShowcase />

        <section
          id="login"
          className="relative py-28 px-4 flex flex-col justify-center items-center scroll-mt-[4.5rem]"
        >
            <div className="w-full max-w-md relative z-10">
              <InviteGateLoginBanner />
            </div>

            {proCheckoutIntent && (
              <Card className="w-full max-w-md mb-6 border-accent/30 bg-accent/10 backdrop-blur-md relative z-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-headline uppercase tracking-wide flex items-center gap-2 text-accent">
                    <Zap className="h-4 w-4" /> Studio Pro Checkout
                  </CardTitle>
                  <CardDescription className="text-[11px] font-code leading-relaxed text-left">
                    Create your account or sign in — you&apos;ll go straight to Stripe for{' '}
                    <strong className="text-foreground">{getProCheckoutLabel(proCheckoutIntent)}</strong>.
                    New signups still get the 3-day Pro trial; paid Pro activates when checkout completes.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {importIntent && (
              <Card className="w-full max-w-md mb-6 border-primary/30 bg-primary/10 backdrop-blur-md relative z-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-headline uppercase tracking-wide flex items-center gap-2 text-primary">
                    <Import className="h-4 w-4" /> DNA Drop — Import Setup
                  </CardTitle>
                  <CardDescription className="text-[11px] font-code leading-relaxed text-left">
                    Someone shared a Bar 4 Bar project with you. After you sign in, you&apos;ll return to that DNA Drop and can merge its lyrics, structure, DNA, and vibe into your vault.
                    Studio Pro is required to import drops from other artists.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <Card
              ref={loginCardRef}
              className="w-full max-w-md border-primary/15 shadow-[0_0_80px_rgba(59,130,246,0.12)] bg-[#0c121d]/55 backdrop-blur-2xl overflow-hidden relative z-10 transition-all duration-700 hover:border-primary/30 scroll-mt-24"
            >
                <CardHeader className="text-center bg-white/5 p-0">
                    <div className="mx-auto w-full h-44 bg-black flex items-center justify-center border-b border-white/10 p-12">
                        <img src="/Logo.png" alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="py-8 px-6">
                        <CardTitle className="font-headline text-4xl text-white uppercase">Initialize Session</CardTitle>
                        <CardDescription className="text-[10px] uppercase tracking-[0.3em] mt-2 text-primary font-bold">Studio Access Required</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-8">
                    <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 border border-white/5 p-1">
                        <TabsTrigger value="signin" className="font-bold data-[state=active]:bg-primary">Sign In</TabsTrigger>
                        <TabsTrigger value="signup" className="font-bold data-[state=active]:bg-primary">Sign Up</TabsTrigger>
                    </TabsList>
                    
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {authMode === 'signup' && (
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Artist Name</Label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                                <Input id="name" name="name" autoComplete="name" placeholder="Stage Name" className="pl-10 h-11 bg-black/40 border-white/10 text-white" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                        </div>
                        )}
                        <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                            <Input id="email" name="email" type="email" autoComplete="email" placeholder="artist@studio.com" className="pl-10 h-11 bg-black/40 border-white/10 text-white" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                            <Input
                              id="password"
                              name="password"
                              type="password"
                              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                              placeholder="••••••••"
                              className="pl-10 h-11 bg-black/40 border-white/10 text-white"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                        </div>
                        </div>
                        {authMode === 'signup' && (
                          <div className="flex items-start gap-3 pt-2">
                            <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(!!c)} />
                            <Label htmlFor="terms" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
                              I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> (including AI use &amp; content policies) and{' '}
                              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                            </Label>
                          </div>
                        )}
                        <Button type="submit" className="w-full h-12 text-base font-bold shadow-xl transition-all hover:scale-[1.02] bg-primary hover:bg-primary/90" disabled={isProcessing || (authMode === 'signup' && !termsAccepted)}>
                        {isProcessing ? <StudioLoader size="sm" className="mr-2" /> : (authMode === 'signin' ? 'Enter Studio' : 'Create Account')}
                        </Button>
                    </form>
                    </Tabs>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0c121d] px-4 text-muted-foreground font-code">Or continue with</span></div>
                    </div>

                    <Button variant="outline" className="w-full h-12 font-bold bg-black/40 border-white/10 text-white hover:bg-white/5" onClick={handleGoogleSignIn} disabled={isProcessing}>
                        <svg className="mr-3 h-5 w-5" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                        Google Artist Login
                    </Button>
                </CardContent>
            </Card>

        </section>

      </main>

      <footer className="py-20 px-4 relative z-10 flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-2xl">
                <img src="/Logo.png" alt="B4B" className="h-10 w-10" />
              </div>
              <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.5em] opacity-50">BAR 4 BAR BY JORDIE CRUZ</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              <a href={SUPPORT_MAILTO} className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group">
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-primary/20"><Mail className="h-4 w-4" /></div>
                  Contact Support
              </a>
              <a href={BUY_ME_COFFEE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group">
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-primary/20"><Coffee className="h-4 w-4" /></div>
                  Buy Me A Coffee
              </a>
              <Link href="/usage?tab=buy-ink" className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group">
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-primary/20"><Gift className="h-4 w-4" /></div>
                  Refer A Friend
              </Link>
          </div>

          <LegalFooter className="opacity-60 pt-2 border-t border-white/5 w-full max-w-xl" />
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><StudioLoader size="lg" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
