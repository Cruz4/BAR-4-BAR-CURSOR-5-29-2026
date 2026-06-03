'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Play, Target, BrainCircuit, Shield, Wand2, Palette, Sparkles, Zap, FolderOpen, ClipboardPaste, ArrowRight, ListRestart, Fingerprint, MonitorPlay, RefreshCw, Link2, FilePenLine, Key, GitBranch, Download, Mic, Settings, Rocket, HelpCircle, MousePointer2, Dna, Clock, Star, Trophy, Share2, Gift, Globe, Lightbulb, Layers, FlaskConical, ScanLine, Undo2, Crown, EyeOff, Image, CalendarRange, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AI_COSTS } from '@/lib/costs';

type StudioTip = {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  color: string;
  /** Defaults to Studio Insight; use did-you-know for lighter trivia-style cards. */
  kind?: 'insight' | 'did-you-know';
};

const STUDIO_TIPS: StudioTip[] = [
  { id: 1, icon: MousePointer2, title: "3-WAY SYSTEM", text: "Hover over any line on the sheet to reveal hidden generation triggers. Add a bar next, previous, or delete instantly.", color: "text-primary" },
  { id: 2, icon: Target, title: "PRECISION LOCK", text: "Hover over any Intent in the Right Panel and click the Arrow to force the AI to land exactly on that phrase for its next suggestion.", color: "text-sky-600" },
  { id: 3, icon: BrainCircuit, title: "DNA HIERARCHY", text: "The AI prioritizes Track DNA over Album DNA. Use Track DNA to surgically override big themes for a single song.", color: "text-green-600" },
  { id: 4, icon: Shield, title: "GUARDRAILS", text: "Struggling with cliches? Add forbidden words in the Guardrails section (Right Panel) to force the AI into new vocabulary.", color: "text-rose-600" },
  { id: 5, icon: Wand2, title: "CREATIVE EFFECTS", text: "Free artists get Simile, Metaphor & Sound-Alike. Studio Pro unlocks Twist, Image Chain, POV, and more in the Right Panel.", color: "text-indigo-600" },
  { id: 7, icon: Palette, title: "BEAT PROMPTS", text: `Click 'Analyze Vibe' in the Left Panel to generate a deep production string you can use in music AIs like Suno or Udio (${AI_COSTS.suggestVibe} Ink).`, color: "text-amber-600" },
  { id: 8, icon: Sparkles, title: "ACTIVE CONTEXT", text: "Watch the Bar Workstation badges in the footer. They light up to show which DNA, Vibes, and Intents are currently guiding the AI.", color: "text-sky-600" },
  { id: 9, icon: Zap, title: "RHYME PULSE", text: `Initiate a one-time deep phonetic scan of your current sheet by clicking the round Rhyme Pulse button in the center top bar (${AI_COSTS.findRhymes} Ink).`, color: "text-primary" },
  { id: 10, icon: FolderOpen, title: "DNA VAULT", text: "Save an extraction from one track and load it into another via the DNA Suite folder icon (Right Panel) to keep your album themes tight.", color: "text-green-600" },
  { id: 11, icon: ClipboardPaste, title: "SMART STRUCTURE", text: `Click '+ Paste Your Lyrics' in the center bar to paste raw text. Label sections with [Verse], [Hook], etc. on their own lines for perfect splits (${AI_COSTS.analyzeStructure} Ink).`, color: "text-primary" },
  { id: 12, icon: ArrowRight, title: "ENTER TO SPLIT", text: "In the sheet, press Enter to split a line at the cursor. The workstation handles all indexing and hanging indents for you.", color: "text-primary" },
  { id: 13, icon: ListRestart, title: "BACKSPACE TO MERGE", text: "Press Backspace at the start of a bar to merge it with the one above. Your rhyme book stays organized effortlessly.", color: "text-primary" },
  { id: 14, icon: Fingerprint, title: "STYLE TRAINING", text: `Use 'Train AI on Style' in the Right Panel to let the workstation learn your specific vocabulary and flow for more authentic suggestions (${AI_COSTS.improveMyStyle} Ink).`, color: "text-accent" },
  { id: 15, icon: MonitorPlay, title: "PERFORMANCE MODE", text: "Studio Pro unlocks Performance Mode from the Track Status card (Left Panel)—a distraction-free teleprompter with rhyme focus.", color: "text-sky-400" },
  { id: 16, icon: RefreshCw, title: "THE ∞ LOOP", text: "Extract DNA from your rough notes, archive the profile, and use those strains to calibrate your next synthesis session.", color: "text-primary" },
  { id: 17, icon: Link2, title: "SYNC TOGGLE", text: "In DNA & REMIX, use 'Sync Current Lyrics' to instantly import your sheet, or turn it off to manually remix external concepts.", color: "text-primary" },
  { id: 18, icon: FilePenLine, title: "HANGING INDENTS", text: "The workstation automatically indents wrapped text by 25px, keeping your long bars legible and perfectly aligned with the grid.", color: "text-muted-foreground" },
  { id: 19, icon: Key, title: "BYO-API KEY", text: "Yearly Pro: connect your Gemini key in Settings. Google bills tokens; Ink is the workstation IP fee (DNA flows, guardrails)—not double billing.", color: "text-primary" },
  { id: 20, icon: GitBranch, title: "REMIX DIRECTIONS", text: "When using DNA & REMIX, select multiple creative paths to see how the AI blends different narrative 'forks' during synthesis.", color: "text-primary" },
  { id: 21, icon: Download, title: "VAULT EXPORT", text: "Use 'Vault Export' on the dashboard to download a .json backup. You can re-import this into any workstation to sync your work.", color: "text-primary" },
  { id: 22, icon: Mic, title: "FREESTYLE PAD", text: "Caught a vibe? Open the Freestyle Pad in the footer to speak your bars. Tap 'Add to Editor' to drop them directly into the sheet.", color: "text-primary" },
  { id: 23, icon: Target, title: "PRECISION ENDING", text: "Set an 'End With' constraint in the footer Bar Workstation to force neural suggestions to land perfectly on your punchline.", color: "text-cyan-500" },
  { id: 24, icon: Settings, title: "CALIBRATION HUB", text: "Step 10 is the workstation's brain. Mix vault strains with your track intents to review your rules before generating lyrics.", color: "text-primary" },
  { id: 25, icon: Rocket, title: "MOBILE PWA", text: "Install Bar 4 Bar to your home screen on iOS or Android for a full-screen, native studio experience on the go.", color: "text-primary" },
  { id: 26, icon: HelpCircle, title: "STUDIO MANUAL", text: "Stuck? Click the '?' icon in the header to open the Spatial Manual. It maps every tool to its exact location in the Left, Center, or Right panels.", color: "text-primary" },
  { id: 27, icon: Dna, title: "DNA MIXER", text: "Open the DNA Mixer in the Album page to selectively pick individual creative strains from your vault history.", color: "text-emerald-500" },
  { id: 28, icon: Clock, title: "INK PRIORITY", text: "The studio automatically uses your expiring monthly Residency Ink before touching your Permanent Ink.", color: "text-primary" },
  { id: 29, icon: Trophy, title: "STUDIO PROGRESS", text: "Open The Vault sidebar (desktop) or Studio Progress in the header menu for weekly goals, rank XP, and milestones. Full board: /studio-progress.", color: "text-amber-400" },
  { id: 30, icon: Sparkles, title: "ACHIEVEMENTS", text: "Badges unlock as you write, generate, and explore. Hover trophies in Studio Profile (Ink Store → Settings) for details.", color: "text-violet-400" },
  { id: 31, icon: Share2, title: "SHARE CARDS", text: "In Studio Profile, tap Share achievement card to export a foil milestone card with rank, XP, and streak — great for social posts.", color: "text-sky-400" },
  { id: 32, icon: Gift, title: "REFER A FRIEND", text: "Ink Store → copy your referral link. You and each friend get 150 permanent Ink when they join (up to 4 friends).", color: "text-primary" },
  { id: 33, kind: 'did-you-know', icon: Lightbulb, title: "WRITTEN VS GENERATED", text: "Studio Progress splits your work: hand-typed lines (and lines you edit after AI) count toward writing goals and streaks. AI-generated lines earn lighter XP and feed Generate Next milestones — not “write 10 bars” trophies.", color: "text-amber-400" },
  { id: 34, icon: Globe, title: "DNA DROP", text: "Studio Pro can publish a DNA Drop link from the left panel. Collaborators import your lyrics, structure, DNA, and vibe after sign-in — great for feedback loops.", color: "text-primary" },
  { id: 35, kind: 'did-you-know', icon: Zap, title: "⚡ INJECT VS ↻ LOAD", text: "Did you know? ⚡ on a strain appends just that field (Creative DNA, Intents, Structure, or Style). The vault ↻ button loads the entire saved profile in one shot.", color: "text-yellow-500" },
  { id: 36, icon: FlaskConical, title: "CREATIVE SYNCING", text: "During full drafts and remix synthesis, the Creative Syncing overlay weaves active DNA, Intents, Style, Vibe, and Special Instructions into one neural pass.", color: "text-cyan-400" },
  { id: 37, kind: 'did-you-know', icon: ScanLine, title: "DNA EXTRACTION", text: "Did you know? DNA & REMIX extraction runs a separate DNA Extraction pass — it maps strains from lyrics without drafting new bars. Archive the profile, then calibrate in the Hub.", color: "text-sky-400" },
  { id: 38, icon: Layers, title: "HUB INSIGHTS TAB", text: "In the Calibration Hub, INSIGHTS shows your latest extraction strains with ⚡ inject buttons. VAULT loads saved album DNA presets — expand entries to cherry-pick individual fields.", color: "text-primary" },
  { id: 39, kind: 'did-you-know', icon: FilePenLine, title: "SPECIAL INSTRUCTIONS", text: "Did you know? Special Instructions in the Hub are a direct creative brief — they are not blended or weighted by remix path percentages.", color: "text-blue-400" },
  { id: 40, icon: Crown, title: "STUDIO RANKS", text: "Earn XP from writing, generating, streaks, and milestones to climb ranks like Headliner and Vault Architect. Track progress on /studio-progress or the Vault sidebar.", color: "text-amber-500" },
  { id: 41, kind: 'did-you-know', icon: Palette, title: "VIBE VAULT", text: "Did you know? Save instrumentation and BPM presets with the folder icon under Track Vibe (Right Panel) — reuse the same sonic palette across every song in the album.", color: "text-amber-600" },
  { id: 42, icon: Undo2, title: "20-LEVEL UNDO", text: "Made a structural mistake? The Undo button in the center top bar reverts sheet and section changes instantly — up to 20 history steps deep.", color: "text-muted-foreground" },
  { id: 43, kind: 'did-you-know', icon: EyeOff, title: "LEADERBOARD PRIVACY", text: "Did you know? You can stay off the public leaderboard until you opt in. Studio Progress still tracks your personal ranks privately.", color: "text-violet-400" },
  { id: 44, icon: Image, title: "COVER ART FOR DROPS", text: "Upload square album cover art (min 500px; exported at 1000×1000) so vinyl grids and DNA Drop previews stay sharp when you share.", color: "text-emerald-500" },
  { id: 45, kind: 'did-you-know', icon: CalendarRange, title: "WEEKLY VS MONTHLY", text: "Did you know? Weekly goals reset every Monday; monthly challenges roll on the calendar month. Both track rhyme bars — check /studio-progress for live counters.", color: "text-amber-400" },
  { id: 46, icon: Upload, title: "VAULT IMPORT", text: "Dashboard → Vault Export downloads a .json backup. Re-import anytime to restore albums, DNA presets, and strains on a new workstation.", color: "text-primary" },
];

const TIPS_SESSION_PREFIX = 'b4b_studio_tip_shown:';

function hasTipBeenShownThisSession(path: string): boolean {
  try {
    return sessionStorage.getItem(`${TIPS_SESSION_PREFIX}${path}`) === '1';
  } catch {
    return false;
  }
}

function markTipShownThisSession(path: string): void {
  try {
    sessionStorage.setItem(`${TIPS_SESSION_PREFIX}${path}`, '1');
  } catch {
    /* ignore */
  }
}

export function StudioTips() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTipsSetting, setShowTipsSetting] = useState(true);
  const scheduledPathRef = useRef<string | null>(null);

  const duration = 12000;

  const dismissTip = useCallback(() => {
    markTipShownThisSession(pathname);
    setIsVisible(false);
    setProgress(0);
    setIsPaused(false);
  }, [pathname]);

  const getRandomIdx = useCallback((excludeIdx: number) => {
    if (STUDIO_TIPS.length <= 1) return 0;
    let newIdx;
    do { newIdx = Math.floor(Math.random() * STUDIO_TIPS.length); } while (newIdx === excludeIdx);
    return newIdx;
  }, []);

  useEffect(() => {
    setIsVisible(false);
    setProgress(0);
    setIsPaused(false);
    scheduledPathRef.current = null;
  }, [pathname]);

  useEffect(() => {
    const isTrackEditor = /^\/albums\/[^/]+\/tracks\/[^/]+$/.test(pathname);

    if (!user || !isTrackEditor) {
      setIsVisible(false);
      return;
    }

    if (!user.lyricsTutorialCompletedAt) {
      setIsVisible(false);
      return;
    }

    const saved = localStorage.getItem('b4b_show_tips');
    if (saved === 'false') {
      setShowTipsSetting(false);
      return;
    }

    if (hasTipBeenShownThisSession(pathname)) {
      return;
    }

    if (scheduledPathRef.current === pathname) {
      return;
    }

    scheduledPathRef.current = pathname;
    setCurrentTipIdx(getRandomIdx(-1));

    const timer = setTimeout(() => {
      if (hasTipBeenShownThisSession(pathname)) return;
      markTipShownThisSession(pathname);
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [getRandomIdx, pathname, user?.id, user?.lyricsTutorialCompletedAt]);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    const step = 100 / (duration / 100);
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + step));
    }, 100);
    return () => clearInterval(interval);
  }, [isVisible, isPaused]);

  useEffect(() => {
    if (isVisible && progress >= 100) {
      dismissTip();
    }
  }, [progress, isVisible, dismissTip]);

  if (!showTipsSetting || !isVisible) return null;
  const currentTip = STUDIO_TIPS[currentTipIdx];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 pointer-events-auto" onClick={dismissTip}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 10 }} 
            className="w-full max-w-[420px] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <Card className="border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.65)] bg-[hsl(216_45%_8%)] overflow-hidden rounded-xl relative">
                <div className="absolute left-12 top-0 bottom-0 w-px bg-rose-500/25 z-0" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_31px,rgba(148,163,184,0.06)_31px,rgba(148,163,184,0.06)_32px)] pointer-events-none z-0" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.03] pointer-events-none z-0" />

                <div className="h-1.5 bg-white/5 w-full relative z-10">
                  <motion.div className="h-full bg-primary/80" style={{ width: `${progress}%` }} />
                </div>
                
                <CardContent className="p-8 pl-16 space-y-5 relative z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl bg-black/40 border border-white/10 shrink-0 shadow-sm", currentTip.color)}>
                                <currentTip.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground font-code">
                                  {currentTip.kind === 'did-you-know' ? 'Did You Know?' : 'Studio Insight'}
                                </h4>
                                <p className="font-bold text-lg font-headline tracking-tight text-foreground uppercase italic leading-none">{currentTip.title}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5" onClick={dismissTip}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <p className="text-base text-sky-200/90 leading-relaxed font-handwriting font-medium min-h-[80px]">
                      {currentTip.text}
                    </p>

                    <div className="flex items-center gap-2 pt-4">
                        <Button
                          variant="ghost"
                          className="flex-1 font-bold uppercase tracking-widest text-[9px] h-10 border border-white/10 hover:bg-white/5 text-muted-foreground"
                          onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? <Play className="mr-2 h-3.5 w-3.5" /> : <div className="mr-2 flex gap-0.5"><div className="w-0.5 h-3 bg-current" /><div className="w-0.5 h-3 bg-current" /></div>}
                            {isPaused ? 'RESUME' : 'PAUSE'}
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1 font-bold uppercase tracking-widest text-[9px] h-10 shadow-md bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                          onClick={dismissTip}
                        >
                            GOT IT
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
