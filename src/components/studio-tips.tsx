'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Play, ChevronRight, Target, BrainCircuit, Shield, Wand2, Palette, Sparkles, Zap, FolderOpen, ClipboardPaste, ArrowRight, ListRestart, Fingerprint, MonitorPlay, RefreshCw, Link2, FilePenLine, Key, GitBranch, Download, Mic, Settings, Rocket, HelpCircle, MousePointer2, Dna, Clock, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AI_COSTS } from '@/lib/costs';

const STUDIO_TIPS = [
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
  { id: 19, icon: Key, title: "BYO-API KEY", text: "Yearly Pro members can connect their own Gemini key in Settings to bypass platform rate limits on AI requests.", color: "text-primary" },
  { id: 20, icon: GitBranch, title: "REMIX DIRECTIONS", text: "When using DNA & REMIX, select multiple creative paths to see how the AI blends different narrative 'forks' during synthesis.", color: "text-primary" },
  { id: 21, icon: Download, title: "VAULT EXPORT", text: "Use 'Vault Export' on the dashboard to download a .json backup. You can re-import this into any workstation to sync your work.", color: "text-primary" },
  { id: 22, icon: Mic, title: "FREESTYLE PAD", text: "Caught a vibe? Open the Freestyle Pad in the footer to speak your bars. Tap 'Add to Editor' to drop them directly into the sheet.", color: "text-primary" },
  { id: 23, icon: Target, title: "PRECISION ENDING", text: "Set an 'End With' constraint in the footer Bar Workstation to force neural suggestions to land perfectly on your punchline.", color: "text-cyan-500" },
  { id: 24, icon: Settings, title: "CALIBRATION HUB", text: "Step 10 is the workstation's brain. Mix vault strains with your track intents to review your rules before generating lyrics.", color: "text-primary" },
  { id: 25, icon: Rocket, title: "MOBILE PWA", text: "Install Bar 4 Bar to your home screen on iOS or Android for a full-screen, native studio experience on the go.", color: "text-primary" },
  { id: 26, icon: HelpCircle, title: "STUDIO MANUAL", text: "Stuck? Click the '?' icon in the header to open the Spatial Manual. It maps every tool to its exact location in the Left, Center, or Right panels.", color: "text-primary" },
  { id: 27, icon: Dna, title: "DNA MIXER", text: "Open the DNA Mixer in the Album page to selectively pick individual creative strains from your vault history.", color: "text-emerald-500" },
  { id: 28, icon: Clock, title: "INK PRIORITY", text: "The studio automatically uses your expiring monthly Residency Ink before touching your Permanent Ink.", color: "text-primary" }
];

export function StudioTips() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTipsSetting, setShowTipsSetting] = useState(true);

  const duration = 12000; 

  const getRandomIdx = useCallback((excludeIdx: number) => {
    if (STUDIO_TIPS.length <= 1) return 0;
    let newIdx;
    do { newIdx = Math.floor(Math.random() * STUDIO_TIPS.length); } while (newIdx === excludeIdx);
    return newIdx;
  }, []);

  useEffect(() => {
    const isTrackEditor = /^\/albums\/[^/]+\/tracks\/[^/]+$/.test(pathname);
    
    if (!user || !isTrackEditor) {
        setIsVisible(false);
        return;
    }

    const saved = localStorage.getItem('b4b_show_tips');
    if (saved === 'false') { setShowTipsSetting(false); return; }
    
    setCurrentTipIdx(getRandomIdx(-1));
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [getRandomIdx, pathname, user]);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    const step = 100 / (duration / 100);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { 
            handleClose(); 
            return 100; 
        }
        return prev + step;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isVisible, isPaused]);

  const handleNext = useCallback(() => {
    setCurrentTipIdx((prev) => getRandomIdx(prev));
    setProgress(0);
    setIsVisible(true);
  }, [getRandomIdx]);

  const handleClose = () => { setIsVisible(false); setProgress(0); };

  if (!showTipsSetting || !isVisible) return null;
  const currentTip = STUDIO_TIPS[currentTipIdx];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 pointer-events-auto" onClick={handleClose}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 10 }} 
            className="w-full max-w-[420px] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <Card className="border-2 border-neutral-300 shadow-[0_30px_60px_rgba(0,0,0,0.5)] bg-[#fdfcf0] overflow-hidden rounded-xl relative">
                <div className="absolute left-12 top-0 bottom-0 w-[1px] bg-rose-200/60 z-0" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_31px,rgba(59,130,246,0.08)_31px,rgba(59,130,246,0.08)_32px)] pointer-events-none z-0" />

                <div className="h-1.5 bg-neutral-200 w-full relative z-10">
                  <motion.div className="h-full bg-blue-400" style={{ width: `${progress}%` }} />
                </div>
                
                <CardContent className="p-8 pl-16 space-y-5 relative z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl bg-white/80 border border-neutral-200 shrink-0 shadow-sm", currentTip.color)}>
                                <currentTip.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-neutral-400 font-code">Studio Insight</h4>
                                <p className="font-bold text-lg font-headline tracking-tight text-neutral-800 uppercase italic leading-none">{currentTip.title}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100" onClick={handleClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <p className="text-base text-blue-900 leading-relaxed font-handwriting font-medium min-h-[80px]">
                      {currentTip.text}
                    </p>

                    <div className="flex items-center gap-2 pt-4">
                        <Button 
                          variant="ghost" 
                          className="flex-1 font-bold uppercase tracking-widest text-[9px] h-10 border border-neutral-200 hover:bg-neutral-50 text-neutral-500" 
                          onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? <Play className="mr-2 h-3.5 w-3.5" /> : <div className="mr-2 flex gap-0.5"><div className="w-0.5 h-3 bg-current" /><div className="w-0.5 h-3 bg-current" /></div>}
                            {isPaused ? 'RESUME' : 'PAUSE'}
                        </Button>
                        <Button 
                          variant="default" 
                          className="flex-1 font-bold uppercase tracking-widest text-[9px] h-10 shadow-md bg-blue-600 text-white hover:bg-blue-700 rounded-lg" 
                          onClick={handleNext}
                        >
                            NEXT TIP <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
