'use client';

import React, { useState, useRef, Suspense, useEffect } from 'react';
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
import { Sparkles, BrainCircuit, ArrowRight, Mail, Lock, User as UserIcon, LogIn, Coffee, Gift, Music, NotebookPen, Waves, Clapperboard, Zap, Target } from 'lucide-react';
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
import Image from 'next/image';
import { REFERRAL_INK_REWARD, REFERRAL_STORAGE_KEY, normalizeReferralCode } from '@/lib/referrals';
import { claimPendingReferral } from '@/components/refer-a-friend-section';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { scrollY } = useScroll();
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const loginFormRef = useRef<HTMLDivElement>(null);

  // Parallax logic for atmospheric voids
  const yParallax1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const yParallax2 = useTransform(scrollY, [0, 1000], [0, -150]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const scrollToLogin = () => {
    loginFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
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
          role: firebaseUser.email === 'plotformaiplan@gmail.com' ? 'admin' : 'artist',
        };
        if (isNew) {
          userData.createdAt = new Date().toISOString();
        }
        await setDoc(userRef, userData, { merge: true });
        if (isNew) {
          await trackStudioEvent(ANALYTICS_EVENTS.SIGNUP, { method: authMode === 'signup' ? 'email' : 'google' });
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
      router.push('/');
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
      {/* FIXED HEADER - ABSOLUTELY CENTERED BRANDING */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-background/70 backdrop-blur-xl z-[200] flex items-center justify-between px-6 shadow-2xl">
          {/* Centered Logo & Title - ABSOLUTE MIDPOINT LOCK */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 z-10">
              <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center p-1.5 shadow-2xl">
                  <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-headline font-bold text-white tracking-tighter uppercase">Bar 4 Bar</h1>
          </div>

          <div className="w-10 h-10" /> {/* Spacer for layout balance */}

          <Button onClick={scrollToLogin} className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-5 gap-2 rounded-md shadow-lg relative z-20 transition-all hover:scale-105 active:scale-95">
              <LogIn className="h-4 w-4" /> Login
          </Button>
      </header>

      <main className="flex-grow flex flex-col mt-16 relative z-10">
        {/* HERO SECTION */}
        <section className="relative min-h-[95vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <Image 
                  src="/Bar 4 Bar background.png" 
                  alt="Studio Background" 
                  fill
                  priority
                  quality={100}
                  className="object-cover opacity-90 blur-[1px] scale-105"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            </div>
            
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in duration-1000 relative z-50">
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

            {/* NEURAL TRANSITION: DEEP RADIAL BLEND */}
            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background to-transparent z-40 pointer-events-none" />
        </section>

        {/* COMMAND DECK SECTION */}
        <section ref={loginFormRef} className="relative py-32 px-4 flex flex-col justify-center items-center overflow-hidden">
            {/* ATMOSPHERIC DEPTH LAYERS */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[100px]" />
            </div>

            {/* REACTIVE PARALLAX VOIDS - WITH FEATHERED FADE */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
                <motion.div 
                    style={{ y: yParallax1, x: (mousePos.x - 1000) * 0.03 }} 
                    className="absolute top-[10%] left-[5%] opacity-15"
                >
                    <div className="flex flex-col gap-24 items-center">
                        <Waves className="w-64 h-64 text-primary" />
                        <BrainCircuit className="w-32 h-32 text-sky-400 rotate-12" />
                        <NotebookPen className="w-48 h-48 text-primary -rotate-12" />
                    </div>
                </motion.div>

                <motion.div 
                    style={{ y: yParallax2, x: (mousePos.x - 1000) * -0.03 }} 
                    className="absolute top-[15%] right-[5%] opacity-15"
                >
                    <div className="flex flex-col gap-24 items-center">
                        <Clapperboard className="w-64 h-64 text-primary rotate-12" />
                        <Music className="w-40 h-40 text-sky-500 -rotate-12" />
                        <Zap className="w-32 h-32 text-orange-400" />
                    </div>
                </motion.div>
            </div>

            <Card className="w-full max-w-md border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-[#0c121d]/80 backdrop-blur-3xl overflow-hidden relative z-50 transition-all duration-700 hover:border-primary/20">
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
                                <Input id="name" placeholder="Stage Name" className="pl-10 h-11 bg-black/40 border-white/10 text-white" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                        </div>
                        )}
                        <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                            <Input id="email" type="email" placeholder="artist@studio.com" className="pl-10 h-11 bg-black/40 border-white/10 text-white" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                            <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-11 bg-black/40 border-white/10 text-white" value={password} onChange={(e) => setPassword(e.target.value)} required />
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

            {/* SOFT BLEND TRANSITION TO BADGES */}
            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background to-transparent z-40 pointer-events-none" />
        </section>

        {/* FEATURE DEEP-DIVE - REFERENCE IMAGE SYNC */}
        <section className="py-32 px-4 relative overflow-hidden">
            <div className="container mx-auto max-w-7xl relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Card 1: ALBUM DNA */}
                    <Card className="bg-[#0c121d]/60 backdrop-blur-xl border-white/5 p-8 flex flex-col gap-6 shadow-2xl group min-h-[400px] transition-all hover:-translate-y-2 hover:border-sky-500/30 hover:shadow-sky-500/10">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-inner">
                            <Music className="h-8 w-8" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-headline font-bold text-white uppercase leading-none">Album DNA</h2>
                            <p className="font-code text-sm text-muted-foreground leading-relaxed">
                                Set the creative direction for <span className="bg-sky-500/10 text-sky-400 px-1 rounded-sm font-bold">entire projects</span>. Guide the <span className="bg-sky-500/10 text-sky-400 px-1 rounded-sm font-bold">AI co-writer</span> with specific worlds, emotions, and <span className="bg-sky-500/10 text-sky-400 px-1 rounded-sm font-bold">thematic triggers</span>.
                            </p>
                        </div>
                        <div className="absolute -bottom-1 left-0 w-full h-1 bg-sky-500/20 group-hover:bg-sky-500 transition-colors" />
                    </Card>

                    {/* Card 2: MASTER THE CRAFT */}
                    <Card className="bg-[#0c121d]/60 backdrop-blur-xl border-white/5 p-8 flex flex-col gap-6 shadow-2xl group min-h-[400px] transition-all hover:-translate-y-2 hover:border-purple-500/30 hover:shadow-purple-500/10">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-inner">
                            <BrainCircuit className="h-8 w-8" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-headline font-bold text-white uppercase leading-none">Master the Craft</h2>
                            <p className="font-code text-sm text-muted-foreground leading-relaxed">
                                Go beyond basic rhyming. Learn hidden gems of <span className="bg-purple-500/10 text-purple-400 px-1 rounded-sm font-bold">song structure</span>, <span className="bg-purple-500/10 text-purple-400 px-1 rounded-sm font-bold">complex rhyme schemes</span>, and professional <span className="bg-purple-500/10 text-purple-400 px-1 rounded-sm font-bold">cadence building</span> while you write.
                            </p>
                        </div>
                        <div className="absolute -bottom-1 left-0 w-full h-1 bg-purple-500/20 group-hover:bg-purple-500 transition-colors" />
                    </Card>

                    {/* Card 3: PROFESSIONAL VAULT */}
                    <Card className="bg-[#0c121d]/60 backdrop-blur-xl border-white/5 p-8 flex flex-col gap-6 shadow-2xl group min-h-[400px] transition-all hover:-translate-y-2 hover:border-amber-500/30 hover:shadow-amber-500/10">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                            <NotebookPen className="h-8 w-8" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-headline font-bold text-white uppercase leading-none">Professional Vault</h2>
                            <p className="font-code text-sm text-muted-foreground leading-relaxed">
                                Your <span className="bg-amber-500/10 text-amber-400 px-1 rounded-sm font-bold">digital notebook</span> for perfection. <span className="bg-amber-500/10 text-amber-400 px-1 rounded-sm font-bold">Import, organize, and sharpen</span> your lyrics in an environment designed to turn <span className="bg-amber-500/10 text-amber-400 px-1 rounded-sm font-bold">raw ideas into masters</span>.
                            </p>
                        </div>
                        <div className="absolute -bottom-1 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
                    </Card>

                    {/* Card 4: PRECISION PUNCHLINES */}
                    <Card className="bg-[#0c121d]/60 backdrop-blur-xl border-white/5 p-8 flex flex-col gap-6 shadow-2xl group min-h-[400px] transition-all hover:-translate-y-2 hover:border-rose-500/30 hover:shadow-rose-500/10">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-inner">
                            <Target className="h-8 w-8" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-headline font-bold text-white uppercase leading-none">Precision Punchlines</h2>
                            <p className="font-code text-sm text-muted-foreground leading-relaxed">
                                Build <span className="bg-rose-500/10 text-rose-400 px-1 rounded-sm font-bold">surgical rhyme schemes</span> with <span className="bg-rose-500/10 text-rose-400 px-1 rounded-sm font-bold">Intent Control</span>. Force AI suggestions to end on your motifs. Usable for <span className="bg-rose-500/10 text-rose-400 px-1 rounded-sm font-bold">any creative writing project</span>.
                            </p>
                        </div>
                        <div className="absolute -bottom-1 left-0 w-full h-1 bg-rose-500/20 group-hover:bg-rose-500 transition-colors" />
                    </Card>
                </div>
            </div>

            {/* SOFT BLEND TO BLACK FOOTER */}
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black via-black/80 to-transparent z-40 pointer-events-none" />
        </section>
      </main>
      
      {/* SLEEK PURE BLACK FOOTER */}
      <footer className="py-20 bg-black border-t border-white/5 flex flex-col items-center gap-10 relative z-[200]">
          <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-2xl">
                <img src="/Logo.png" alt="B4B" className="h-10 w-10" />
              </div>
              <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.5em] mt-4 opacity-50">BAR 4 BAR BY JORDIE CRUZ</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12">
              <a href="https://buymeacoffee.com/b4bdev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group">
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-primary/20"><Coffee className="h-4 w-4" /></div>
                  Buy Me A Coffee
              </a>
              <Link href="/usage?tab=buy-ink" className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group">
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-primary/20"><Gift className="h-4 w-4" /></div>
                  Refer A Friend
              </Link>
          </div>
          <LegalFooter className="opacity-60" />
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
