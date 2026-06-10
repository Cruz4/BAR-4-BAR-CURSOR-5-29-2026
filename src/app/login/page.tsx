'use client';

import React, { useState, Suspense, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, Lock, User as UserIcon, Zap, Import } from 'lucide-react';
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
import { assignTrialInkAbVariant } from '@/lib/trial-ink-ab';
import { captureMarketingRefFromUrl, getStoredMarketingRef } from '@/lib/marketing-attribution';
import { REFERRAL_INK_REWARD, REFERRAL_STORAGE_KEY, normalizeReferralCode } from '@/lib/referrals';
import { claimPendingReferral } from '@/components/refer-a-friend-section';
import { InviteGateLoginBanner } from '@/components/invite-gate-login-banner';
import {
  getCheckoutFromPath,
  getProCheckoutLabel,
  getSafeNextPath,
} from '@/lib/checkout-intent';
import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';
import {
  completeGoogleRedirectSignIn,
  hasGoogleRedirectPending,
  startGoogleSignIn,
} from '@/lib/google-auth-client';
import { getTrialDurationLabel } from '@/lib/trial';

function LoginForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const signupFromUrl = searchParams.get('mode') === 'signup';
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const importIntent = searchParams.get('intent') === 'dna-import';
  const safeNext = getSafeNextPath(searchParams.get('next'));
  const proCheckoutIntent = getCheckoutFromPath(safeNext);

  useEffect(() => {
    if (proCheckoutIntent) setAuthMode('signup');
  }, [proCheckoutIntent]);

  useEffect(() => {
    if (signupFromUrl) setAuthMode('signup');
  }, [signupFromUrl]);

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

  const applyReferralIfNew = useCallback(async (userId: string) => {
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
  }, [toast]);

  const syncUserProfile = useCallback(async (
    firebaseUser: any,
    _isNewSignup = false,
    signupMethod: 'email' | 'google' = 'google'
  ) => {
    try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const existing = await getDoc(userRef);
        const isNew = !existing.exists();
        const signupRef = getStoredMarketingRef();
        const profileBase = {
          displayName: firebaseUser.displayName || displayName || 'Anonymous Artist',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          lastLogin: serverTimestamp(),
        };

        if (isNew) {
          const trialInkAbVariant = assignTrialInkAbVariant(firebaseUser.uid);
          await setDoc(userRef, {
            ...profileBase,
            createdAt: new Date().toISOString(),
            role: 'artist',
            subscriptionStatus: 'none',
            subscriptionTier: 'none',
            status: 'active',
            trialStartedAt: new Date().toISOString(),
            trialInkAbVariant,
            ...(signupRef ? { signupAttribution: signupRef } : {}),
          });
          await trackStudioEvent(ANALYTICS_EVENTS.SIGNUP, {
            method: signupMethod,
            ...(signupRef ? { ref: signupRef } : {}),
          });
          await applyReferralIfNew(firebaseUser.uid);
          return true;
        }

        const existingData = existing.data() || {};
        const patch: Record<string, unknown> = { ...profileBase };
        if (signupRef && !existingData.signupAttribution) {
          patch.signupAttribution = signupRef;
        }
        if (!existingData.trialStartedAt) {
          patch.trialStartedAt = new Date().toISOString();
        }
        if (!existingData.status) {
          patch.status = 'active';
        }
        await setDoc(userRef, patch, { merge: true });
        return false;
    } catch (e) {
      console.error("Profile sync failed", e);
    }
  }, [applyReferralIfNew, displayName]);

  useEffect(() => {
    if (user) return;
    let cancelled = false;

    (async () => {
      if (hasGoogleRedirectPending()) setIsProcessing(true);
      try {
        const { credential, intent } = await completeGoogleRedirectSignIn(auth);
        if (cancelled || !credential) {
          if (!cancelled) setIsProcessing(false);
          return;
        }
        const isNew = await syncUserProfile(credential.user, intent === 'signup');
        if (!isNew) {
          try {
            sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setIsProcessing(false);
          const message =
            error instanceof Error ? error.message : 'Google sign-in could not be completed.';
          toast({ variant: 'destructive', title: 'Sign-in Error', description: message });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, syncUserProfile, toast]);

  const handleGoogleSignIn = async () => {
    if (authMode === 'signup' && !termsAccepted) {
      toast({ variant: 'destructive', title: 'Terms Required', description: 'Please accept the Terms of Service and Privacy Policy to create an account.' });
      return;
    }
    setIsProcessing(true);
    try {
      const result = await startGoogleSignIn(auth, authMode);
      if (!result) return;
      const isNew = await syncUserProfile(result.user, authMode === 'signup');
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
        await syncUserProfile(userCredential.user, true, 'email');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserProfile(userCredential.user, false, 'email');
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
          <nav className="flex items-center justify-start min-w-0">
            <Link
              href="/"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              ← Home
            </Link>
          </nav>

          <Link href="/" className="flex items-center justify-center gap-2 sm:gap-4 min-w-0 max-w-[min(100%,14rem)] sm:max-w-none">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center p-1.5 shadow-2xl shrink-0">
                  <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="hidden sm:block text-lg sm:text-2xl font-headline font-bold text-white tracking-tighter uppercase truncate">Bar 4 Bar</span>
          </Link>

          <nav className="flex items-center justify-end gap-2 sm:gap-4 min-w-0">
            <Link href="/#features" className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="/pricing" className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
          </nav>
      </header>

      <main className="flex-grow flex flex-col mt-16 relative z-10 min-h-[calc(100vh-4rem)]">
        <section
          id="login"
          className="flex-1 px-4 py-5 sm:py-6 flex items-center justify-center"
        >
          <div className="w-full max-w-5xl relative z-10 space-y-4">
            <InviteGateLoginBanner />

            {proCheckoutIntent && (
              <Card className="w-full border-accent/30 bg-accent/10 backdrop-blur-md relative z-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-headline uppercase tracking-wide flex items-center gap-2 text-accent">
                    <Zap className="h-4 w-4" /> Studio Pro Checkout
                  </CardTitle>
                  <CardDescription className="text-[11px] font-code leading-relaxed text-left">
                    Create your account or sign in — you&apos;ll go straight to Stripe for{' '}
                    <strong className="text-foreground">{getProCheckoutLabel(proCheckoutIntent)}</strong>.
                    New signups still get the {getTrialDurationLabel()} Pro trial; paid Pro activates when checkout completes.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {importIntent && (
              <Card className="w-full border-primary/30 bg-primary/10 backdrop-blur-md relative z-50">
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

            <Card className="w-full border-primary/15 shadow-[0_0_80px_rgba(59,130,246,0.12)] bg-[#0c121d]/55 backdrop-blur-2xl overflow-hidden relative z-10 transition-all duration-700 hover:border-primary/30">
              <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] gap-0">
                <div className="relative flex flex-col items-center justify-center gap-5 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-white/10 text-center overflow-hidden">
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-orange-500/8"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_38%,rgba(59,130,246,0.22)_0%,transparent_72%)]"
                    aria-hidden
                  />
                  <div className="relative z-10 flex flex-col items-center gap-5 w-full">
                    <div className="relative flex items-center justify-center">
                      <div
                        className="absolute inset-0 rounded-3xl bg-primary/25 blur-2xl scale-110"
                        aria-hidden
                      />
                      <div className="relative w-[7.5rem] h-[7.5rem] sm:w-36 sm:h-36 bg-white rounded-3xl flex items-center justify-center p-4 sm:p-5 shadow-[0_0_48px_rgba(59,130,246,0.35)] border border-primary/20 ring-1 ring-white/10">
                        <img src="/Logo.png" alt="Bar 4 Bar logo" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div className="space-y-2.5 max-w-[16rem]">
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.28em] text-orange-400">
                        AI Notebook
                      </p>
                      <h2 className="font-headline text-2xl sm:text-3xl lg:text-[2.1rem] font-bold uppercase text-white tracking-tight leading-tight">
                        Enter the Studio
                      </h2>
                      <p className="text-[10px] sm:text-xs font-code text-primary/80 uppercase tracking-widest">
                        Free 300 Ink on signup — no card required
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-center gap-1 pt-1 w-full border-t border-white/10 pt-4 max-w-[14rem]">
                      <p className="font-headline text-base font-bold uppercase text-primary">Initialize Session</p>
                      <p className="text-[9px] uppercase tracking-[0.32em] text-muted-foreground font-bold">
                        Studio Access Required
                      </p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-5 sm:p-6 lg:p-7 flex flex-col justify-center">
                  <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-black/40 border border-white/5 p-1 h-10">
                      <TabsTrigger value="signin" className="font-bold text-sm data-[state=active]:bg-primary">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="font-bold text-sm data-[state=active]:bg-primary">
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleEmailAuth} className="space-y-3">
                      <div
                        className={cn(
                          'grid gap-3',
                          authMode === 'signup' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                        )}
                      >
                        {authMode === 'signup' && (
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Artist Name
                            </Label>
                            <div className="relative">
                              <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-primary/60" />
                              <Input
                                id="name"
                                name="name"
                                autoComplete="name"
                                placeholder="Stage Name"
                                className="pl-10 h-10 bg-black/40 border-white/10 text-white"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-primary/60" />
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              placeholder="artist@studio.com"
                              className="pl-10 h-10 bg-black/40 border-white/10 text-white"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-primary/60" />
                            <Input
                              id="password"
                              name="password"
                              type="password"
                              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                              placeholder="••••••••"
                              className="pl-10 h-10 bg-black/40 border-white/10 text-white"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {authMode === 'signup' && (
                        <div className="flex items-start gap-2.5 pt-0.5">
                          <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(!!c)} />
                          <Label htmlFor="terms" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
                            I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> (including AI use &amp; content policies) and{' '}
                            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                          </Label>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <Button
                          type="submit"
                          className="w-full h-10 text-sm font-bold shadow-xl bg-primary hover:bg-primary/90 sm:col-span-2"
                          disabled={isProcessing || (authMode === 'signup' && !termsAccepted)}
                        >
                          {isProcessing ? (
                            <StudioLoader size="sm" className="mr-2" />
                          ) : authMode === 'signin' ? (
                            'Enter Studio'
                          ) : (
                            'Create Account'
                          )}
                        </Button>

                        <div className="relative sm:col-span-2 my-0.5">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-[#0c121d] px-3 text-muted-foreground font-code">Or continue with</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          type="button"
                          className="w-full h-10 text-sm font-bold bg-black/40 border-white/10 text-white hover:bg-white/5 sm:col-span-2"
                          onClick={handleGoogleSignIn}
                          disabled={isProcessing}
                        >
                          <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 488 512">
                            <path
                              fill="currentColor"
                              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                            />
                          </svg>
                          Google {authMode === 'signup' ? 'Sign Up' : 'Sign In'}
                        </Button>
                      </div>
                    </form>
                  </Tabs>
                </CardContent>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <Link href="/#features" className="hover:text-primary transition-colors">
                Explore features
              </Link>
              <a href={SUPPORT_MAILTO} className="hover:text-primary transition-colors">
                Contact Support
              </a>
              <a href={BUY_ME_COFFEE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Buy Me A Coffee
              </a>
              <Link href="/usage?tab=buy-ink" className="hover:text-primary transition-colors">
                Refer A Friend
              </Link>
            </div>
            <LegalFooter className="opacity-50 text-center" />
          </div>
        </section>
      </main>
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
