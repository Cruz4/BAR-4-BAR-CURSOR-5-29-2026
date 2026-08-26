'use client';

import React, { useMemo, useContext, useEffect, useState, useRef } from 'react';
import { DataContext } from '@/context/data-context';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
    ChevronLeft, 
    Sun,
    Moon,
    Type, 
    Target, 
    Play, 
    Square, 
    Timer, 
    ArrowUp,
    Pause
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StudioLoader } from '@/components/studio-loader';
import { HighlightedText } from '@/components/highlighted-text';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { isProOrTrial } from '@/lib/subscription';
import { db } from '@/lib/firebase/client/firebase';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { doc, getDoc } from 'firebase/firestore';
import type { Track } from '@/lib/types';
import { isBrowserOffline } from '@/lib/offline/network';
import { getCachedTrack, loadCachedUserProfile } from '@/lib/offline/vault-cache';

/** Scroll speed levels — pixels per second */
const SCROLL_SPEED_PX: Record<number, number> = {
  1: 22,
  2: 38,
  3: 82,
  4: 118,
};

export default function PerformancePage() {
  const params = useParams();
  const albumId = params.albumId as string;
  const trackId = params.trackId as string;
  const { getTrackById, updateTrack, loading: dataLoading } = useContext(DataContext);
  const router = useRouter();
  const { user, authReady } = useAuth();
  const [resolvedTrack, setResolvedTrack] = useState<Track | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isProOrTrial(user)) return;
    if (isBrowserOffline()) {
      const cached = loadCachedUserProfile(user.id);
      if (cached && isProOrTrial(cached)) return;
    }
    router.replace(`/usage?tab=cloud`);
  }, [user, router]);
  
  const contextTrack = useMemo(
    () => getTrackById(albumId, trackId).track,
    [getTrackById, albumId, trackId],
  );

  useEffect(() => {
    setResolvedTrack(null);
    setLoadFailed(false);
  }, [albumId, trackId]);

  useEffect(() => {
    if (contextTrack) {
      setResolvedTrack(contextTrack);
      setLoadFailed(false);
    }
  }, [contextTrack]);

  useEffect(() => {
    if (contextTrack) return;

    if (user?.id) {
      const cached = getCachedTrack(user.id, albumId, trackId);
      if (cached.track) {
        setResolvedTrack(cached.track);
        setLoadFailed(false);
        return;
      }
    }

    if (!user?.id || !authReady || dataLoading) return;
    if (isBrowserOffline()) {
      setLoadFailed(true);
      return;
    }

    let cancelled = false;

    const loadTrack = async () => {
      try {
        await waitForAuthUser();
        const snap = await getDoc(doc(db, 'users', user.id, 'albums', albumId, 'tracks', trackId));
        if (cancelled) return;

        if (snap.exists()) {
          setResolvedTrack({
            ...(snap.data() as Track),
            id: snap.id,
            albumId,
            sections: (snap.data() as Track).sections || [],
          });
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
      } catch (error) {
        console.error('Performance mode track load failed:', error);
        if (!cancelled) setLoadFailed(true);
      }
    };

    void loadTrack();

    return () => {
      cancelled = true;
    };
  }, [contextTrack, user?.id, authReady, dataLoading, albumId, trackId]);

  useEffect(() => {
    if (resolvedTrack || loadFailed) return;
    const timeout = setTimeout(() => setLoadFailed(true), 12000);
    return () => clearTimeout(timeout);
  }, [resolvedTrack, loadFailed, albumId, trackId]);

  const track = resolvedTrack;

  const [fontSize, setFontSize] = useState(24);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSessionActive, setScrollSessionActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [startDelay, setStartDelay] = useState(3);
  const [countdown, setCountdown] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRemainderRef = useRef(0);
  const scrollStateRef = useRef({ isScrolling, scrollSpeed, countdown });
  scrollStateRef.current = { isScrolling, scrollSpeed, countdown };

  useEffect(() => {
    let raf = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      const { isScrolling: active, scrollSpeed: speed, countdown: delay } = scrollStateRef.current;

      if (!active) {
        lastTime = 0;
        scrollRemainderRef.current = 0;
        return;
      }

      if (delay > 0) {
        lastTime = time;
        raf = requestAnimationFrame(tick);
        return;
      }

      const el = scrollRef.current;
      if (!el) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (!lastTime) lastTime = time;
      const deltaMs = Math.min(time - lastTime, 48);
      const pxPerSec = SCROLL_SPEED_PX[speed] ?? SCROLL_SPEED_PX[2];
      scrollRemainderRef.current += (pxPerSec * deltaMs) / 1000;
      const pixels = Math.floor(scrollRemainderRef.current);
      if (pixels > 0) {
        el.scrollTop += pixels;
        scrollRemainderRef.current -= pixels;
      }
      lastTime = time;
      raf = requestAnimationFrame(tick);
    };

    if (isScrolling) {
      scrollRemainderRef.current = 0;
      raf = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(raf);
  }, [isScrolling]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isScrolling && countdown > 0) {
        timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [isScrolling, countdown]);

  const stopScroll = (endSession = false) => {
    setIsScrolling(false);
    setCountdown(0);
    if (endSession) setScrollSessionActive(false);
  };

  const handleStartScroll = () => {
      if (isScrolling) {
          stopScroll();
      } else {
          setScrollSessionActive(true);
          setCountdown(startDelay);
          setIsScrolling(true);
      }
  };

  const handleResumeScroll = () => {
    setScrollSessionActive(true);
    setIsScrolling(true);
  };

  const handleToggleHighlight = (checked: boolean) => {
    if (!track) return;
    updateTrack(albumId, trackId, { rhymeHighlightingEnabled: checked });
    setResolvedTrack({ ...track, rhymeHighlightingEnabled: checked });
  };

  const handleBackToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    stopScroll(true);
  };

  const handleExit = () => {
    stopScroll();
    setScrollSessionActive(false);
    const isStandalonePwa =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (!isStandalonePwa) {
      window.close();
    }
    router.push(`/albums/${albumId}/tracks/${trackId}`);
  };

  const isBootstrapping = !authReady || !user;
  const isResolvingTrack = !isBootstrapping && !track && !loadFailed;

  if (isBootstrapping || isResolvingTrack) {
    return <StudioLoader size="lg" fullscreen className="bg-black" />;
  }

  if (loadFailed || !track) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm font-code uppercase tracking-widest text-muted-foreground">Teleprompter could not load this track.</p>
        <Button
          className="font-bold uppercase text-xs"
          onClick={() => router.push(`/albums/${albumId}/tracks/${trackId}`)}
        >
          Back to Track
        </Button>
      </div>
    );
  }

  const sections = track.sections || [];

  return (
    <div className={cn(
        "h-screen flex flex-col overflow-hidden transition-colors duration-500",
        isDarkMode ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
    )}>
      <header className={cn(
        "shrink-0 z-[100] w-full border-b backdrop-blur px-2 sm:px-4 py-2 sm:py-3 shadow-2xl",
        isDarkMode
          ? "border-neutral-800 bg-background/95"
          : "border-neutral-200 bg-white/95"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
                <Button variant="ghost" size="sm" onClick={handleExit} className={cn(
                  "h-8 sm:h-9 px-2 sm:px-3 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest shrink-0",
                  isDarkMode ? "hover:bg-neutral-800 text-muted-foreground" : "hover:bg-neutral-100 text-neutral-700"
                )}>
                    <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Exit
                </Button>
                <div className={cn("hidden lg:block border-l pl-4", isDarkMode ? "border-neutral-800" : "border-neutral-200")}>
                    <h1 className="text-sm font-headline font-bold uppercase tracking-tight truncate max-w-[200px]">{track.title}</h1>
                    <p className="text-[9px] font-code uppercase tracking-[0.2em] text-primary/70">Teleprompter Active</p>
                </div>
            </div>
            
            <div className={cn(
              "flex items-center gap-1 sm:gap-2 p-1 rounded-lg border shadow-inner min-w-0 overflow-x-auto max-w-full",
              isDarkMode ? "bg-neutral-900/80 border-neutral-800" : "bg-neutral-100 border-neutral-300"
            )}>
                <div className={cn("flex items-center gap-1 px-1.5 sm:px-2 border-r shrink-0", isDarkMode ? "border-neutral-800" : "border-neutral-300")}>
                    <Timer className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0", isDarkMode ? "text-muted-foreground" : "text-neutral-600")} />
                    <Select value={String(startDelay)} onValueChange={(v) => setStartDelay(parseInt(v))}>
                        <SelectTrigger className="h-7 w-[52px] sm:w-[65px] text-[9px] sm:text-[10px] font-bold bg-transparent border-0 focus:ring-0 px-1">
                            <SelectValue placeholder="Delay" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="start" className="z-[150]">
                            {[0, 1, 2, 3, 5, 10].map(s => (
                                <SelectItem key={s} value={String(s)} className="text-[10px] font-bold">{s}s Delay</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={cn("flex items-center gap-1 sm:gap-2 px-0.5 sm:px-1 border-r shrink-0", isDarkMode ? "border-neutral-800" : "border-neutral-300")}>
                    <span className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter hidden min-[380px]:inline", isDarkMode ? "text-muted-foreground" : "text-neutral-600")}>Speed</span>
                    <ToggleGroup type="single" value={String(scrollSpeed)} onValueChange={(v) => v && setScrollSpeed(parseInt(v))} className="gap-0.5">
                        {[1, 2, 3, 4].map(s => (
                            <ToggleGroupItem key={s} value={String(s)} className="h-6 w-6 text-[9px] font-bold rounded-md data-[state=on]:bg-primary data-[state=on]:text-white">
                                {s}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                <Button 
                    variant={isScrolling ? "destructive" : "default"} 
                    size="sm" 
                    onClick={handleStartScroll}
                    className={cn(
                        "h-7 sm:h-8 px-2 sm:px-4 font-bold text-[8px] sm:text-[10px] uppercase tracking-widest gap-1 sm:gap-2 transition-all shrink-0",
                        isScrolling && "animate-pulse"
                    )}
                >
                    {isScrolling ? (
                        <>
                            <Square className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0" /> <span className="hidden min-[400px]:inline">Stop</span>
                        </>
                    ) : (
                        <>
                            <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0" /> <span className="hidden min-[400px]:inline">Start</span>
                        </>
                    )}
                </Button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 self-end sm:self-auto">
                <div className={cn(
                  "hidden sm:flex items-center space-x-2 p-1 rounded-full border px-3 h-9",
                  isDarkMode ? "bg-neutral-800/50 border-neutral-700" : "bg-neutral-200/80 border-neutral-300"
                )}>
                    <Switch id="rhyme-highlight-toggle" onCheckedChange={handleToggleHighlight} checked={track.rhymeHighlightingEnabled} className="scale-75" />
                    <Target className={cn("h-4 w-4 transition-colors", track.rhymeHighlightingEnabled ? "text-primary" : "text-neutral-600")} />
                </div>

                <div className={cn(
                  "flex items-center rounded-full p-0.5 sm:p-1 border h-8 sm:h-9",
                  isDarkMode ? "bg-neutral-800/50 border-neutral-700" : "bg-neutral-200/80 border-neutral-300"
                )}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-full" onClick={() => setFontSize(prev => Math.max(16, prev - 4))}>
                        <Type className="h-3 w-3" />
                    </Button>
                    <span className="text-[8px] sm:text-[9px] font-bold font-code px-1 w-6 sm:w-7 text-center">{fontSize}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-full" onClick={() => setFontSize(prev => Math.min(64, prev + 4))}>
                        <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                </div>
                
                <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
            </div>
        </div>
      </header>

      <AnimatePresence>
          {countdown > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
              >
                  <div className="flex flex-col items-center gap-4">
                      <div className="text-[120px] md:text-[200px] font-headline font-bold text-primary drop-shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                          {countdown}
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/40 px-6 py-2 text-xl font-headline tracking-[0.3em] uppercase animate-pulse">
                          Ready...
                      </Badge>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <main
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden studio-scrollbar relative"
      >
        <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-6 sm:py-12 md:py-24 space-y-8 sm:space-y-12 pb-48 sm:pb-64">
            {sections.map((section) => (
                <section key={section.id} className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center gap-3 sm:gap-6 border-l-4 border-primary pl-3 sm:pl-6 md:pl-8">
                        <Badge variant="outline" className="text-sm sm:text-lg px-3 sm:px-4 py-0.5 sm:py-1 h-auto font-headline font-bold uppercase tracking-[0.2em] border-primary/40 text-primary bg-primary/5">
                            {section.type}
                        </Badge>
                        <div className="h-px flex-grow bg-primary/10"></div>
                    </div>
                    
                    <div className="space-y-1 sm:space-y-2 pl-0 sm:pl-4 md:pl-8">
                        {section.bars.map((bar) => (
                            <div key={bar.idx} className="group flex items-start gap-2 sm:gap-4 md:gap-8">
                                <span className="text-[10px] sm:text-xs md:text-sm font-mono text-muted-foreground/20 pt-1 sm:pt-2 shrink-0 w-6 sm:w-7 md:w-8 text-right font-bold">
                                    {String(bar.idx).padStart(2, '0')}
                                </span>
                                <p 
                                    className="font-code font-bold leading-tight tracking-wide transition-all duration-300 min-w-0 flex-1"
                                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.25 }}
                                >
                                    {bar.text ? (
                                        <HighlightedText text={bar.text} rhymeGroups={track.rhymeHighlightingEnabled ? (track.rhymeGroups || []) : []} />
                                    ) : (
                                        <span className="opacity-10 italic tracking-[0.5em]">...</span>
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
      </main>

      {/* Floating pause / resume — stays visible after pause until session ends */}
      <AnimatePresence>
        {scrollSessionActive && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="fixed left-3 sm:left-4 md:left-8 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[150]"
          >
            <Button
              variant={isScrolling ? 'destructive' : 'default'}
              size="lg"
              onClick={isScrolling ? () => stopScroll() : handleResumeScroll}
              className="h-14 w-14 rounded-full shadow-2xl border-2 border-white/10"
              aria-label={isScrolling ? 'Pause teleprompter scroll' : 'Resume teleprompter scroll'}
            >
              {isScrolling ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 sm:right-6 md:right-10 flex flex-col gap-3 z-[150]">
          <Button variant="secondary" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90" onClick={handleBackToTop}>
              <ArrowUp className="h-6 w-6" />
          </Button>
      </div>
      
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none text-center">
         <p className="text-[10px] font-code uppercase tracking-[0.6em] text-muted-foreground/30 font-bold">Performance Teleprompter &middot; Bar 4 Bar Studio &copy; 2026</p>
      </footer>
    </div>
  );
}
