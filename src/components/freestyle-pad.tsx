'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, PlusCircle, Sparkles, Loader, Wand2, ArrowDown, Trash2, Lock, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Track } from '@/lib/types';
import { findRhymes } from '@/ai/flows/find-rhymes';
import { generateNextLine } from '@/ai/flows/generate-next-line';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { HighlightedText } from './highlighted-text';
import ColorHash from 'color-hash';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface FreestylePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFreestyle: (text: string) => void;
  disabled: boolean;
  trackVibe: Track['vibe'];
  albumTheme: string;
  styleProfileSummary: string;
  isPro: boolean;
}

const colorHash = new ColorHash({lightness: [0.35, 0.5, 0.65], saturation: [0.35, 0.5, 0.65]});

export function FreestylePad({ open, onOpenChange, onAddFreestyle, disabled, trackVibe, albumTheme, styleProfileSummary, isPro }: FreestylePadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, startAnalysisTransition] = useTransition();
  const [rhymeGroups, setRhymeGroups] = useState<{ words: string[] }[]>([]);
  const recognitionRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const { deductInk, refundInk, addUsageLog } = useUsage();
  const { getCost, tooltip } = useInkCosts();

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    setIsListening(false);
    recordingStartTimeRef.current = null;
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(async (e?: React.MouseEvent) => {
    const sessionCost = getCost('freestyleTranscription');
    if(!deductInk(sessionCost, 'freestyleTranscription', e)) return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
        toast({ variant: 'destructive', title: 'Not Supported', description: 'Your browser does not support Speech Recognition.' });
        refundInk(sessionCost);
        return;
    }

    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            recordingStartTimeRef.current = Date.now();
        };

        recognitionRef.current.onresult = (event: any) => {
            let currentInterim = '';
            let currentFinal = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    currentFinal += result[0].transcript + ' ';
                } else {
                    currentInterim += result[0].transcript;
                }
            }

            if (currentFinal) {
                setTranscript(prev => prev + currentFinal);
            }
            setInterimTranscript(currentInterim);

            // Session Limit Enforcement
            if (recordingStartTimeRef.current) {
                const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
                if (!isPro && elapsed > 30) {
                    toast({ variant: 'destructive', title: "Demo Limit Reached", description: "Free recordings are capped at 30 seconds." });
                    stopListening();
                    router.push('/pricing');
                }
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                toast({ variant: 'destructive', title: 'Recognition Error', description: event.error });
                stopListening();
            }
        };

        recognitionRef.current.onend = () => {
            if (isListening) recognitionRef.current?.start(); // Keep listening unless manually stopped
        };

        recognitionRef.current.start();
    } catch (err) {
        toast({ variant: 'destructive', title: 'Mic Denied', description: 'Please allow microphone access to use Freestyle.' });
        setIsListening(false);
        refundInk(sessionCost);
    }
  }, [toast, stopListening, deductInk, refundInk, isPro, router, isListening, getCost]);
  
  useEffect(() => {
      if (!open) {
          stopListening();
          setTranscript('');
          setInterimTranscript('');
      }
  }, [open, stopListening]);

  const lines = transcript.split('. ').filter(l => l.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-4 md:p-6 bg-background border-2 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-3xl flex items-center gap-3">
            <Mic className={cn("h-8 w-8 text-primary", isListening && "animate-pulse")} /> 
            FREESTYLE PAD
          </DialogTitle>
          <DialogDescription className="font-code text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Progressive Transcription Active {!isPro && "· (30s Demo Limit)"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow rounded-xl border-2 border-dashed border-white/10 bg-black/20 p-8 flex flex-col gap-6 overflow-hidden relative">
            <div className="flex-grow overflow-y-auto studio-scrollbar space-y-4">
               {lines.map((line, index) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={index} 
                        className="font-code font-bold text-xl md:text-2xl tracking-tight leading-relaxed text-white/90"
                    >
                         <HighlightedText text={line} rhymeGroups={rhymeGroups} />
                    </motion.div>
               ))}
               {interimTranscript && (
                   <div className="font-code font-bold text-xl md:text-2xl tracking-tight text-primary/60 italic animate-pulse">
                       {interimTranscript}...
                   </div>
               )}
               {!transcript && !interimTranscript && (
                   <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-30">
                       <Volume2 className="h-16 w-16 text-muted-foreground animate-bounce" />
                       <p className="font-code text-sm uppercase tracking-[0.3em]">Tap the mic to catch the flow</p>
                   </div>
               )}
            </div>

            <AnimatePresence>
                {isListening && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute bottom-6 right-6 bg-red-600/10 border border-red-600/30 px-4 py-2 rounded-full flex items-center gap-3 shadow-lg"
                    >
                        <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">RECORDING LIVE</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <DialogFooter className="gap-6 flex-row justify-between items-center pt-4">
            <div className="flex items-center gap-4">
                <Button 
                    onClick={(e) => isListening ? stopListening() : startListening(e)} 
                    size="icon" 
                    className={cn(
                        "w-20 h-20 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all active:scale-95 border-4 border-white/5", 
                        isListening ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : "bg-primary hover:bg-primary/90"
                    )}
                >
                    {isListening ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-8 w-8" />}
                </Button>
                <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Session Status</p>
                    <p className="text-sm font-bold text-foreground uppercase">{isListening ? 'Streaming Pickup' : 'Hardware Idle'}</p>
                    <p className="text-[9px] text-primary font-bold uppercase mt-0.5">{tooltip('freestyleTranscription')}</p>
                </div>
            </div>
            
            <div className="flex gap-3">
                <Button variant="ghost" onClick={() => { setTranscript(''); setInterimTranscript(''); }} className="h-12 px-6 font-bold text-xs uppercase text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4 mr-2" /> Reset
                </Button>
                <Button 
                    onClick={() => {
                        const final = (transcript + ' ' + interimTranscript).trim();
                        if (final) onAddFreestyle(final);
                    }} 
                    disabled={(!transcript && !interimTranscript) || isListening} 
                    className="h-12 px-8 font-bold shadow-xl gap-2 text-sm uppercase tracking-widest"
                >
                    <PlusCircle className="h-4 w-4" /> Add to Editor
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}