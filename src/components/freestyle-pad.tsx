'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, PlusCircle, Loader, Trash2, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Track } from '@/lib/types';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { useTouchInkRunner } from '@/hooks/use-touch-ink-runner';
import { HighlightedText } from './highlighted-text';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { withAiAuth } from '@/lib/ai-client';
import { transcribeFreestyleAudio } from '@/ai/flows/transcribe-freestyle-audio';
import {
  blobToBase64,
  getBrowserSpeechRecognition,
  hasDetectableSpeech,
  isCapacitorNativeApp,
  isLikelyUnreliableBrowserSpeech,
  measureAudioSpeechLevel,
  pickMediaRecorderMimeType,
  speechRecognitionErrorMessage,
  MAX_TRANSCRIBE_BLOB_BYTES,
  type BrowserSpeechRecognitionCtor,
} from '@/lib/speech-recognition';
import { sanitizeFreestyleTranscript } from '@/lib/freestyle-transcript';

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

/** Complete WebM segment length (stop/start), not timeslice fragments */
const STUDIO_SEGMENT_MS = 4500;
const STUDIO_AUDIO_BITS_PER_SECOND = 64_000;
const MIN_CHUNK_BYTES = 1500;

export function FreestylePad({ open, onOpenChange, onAddFreestyle, disabled, trackVibe, albumTheme, styleProfileSummary, isPro }: FreestylePadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isStudioTranscribing, setIsStudioTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [rhymeGroups, setRhymeGroups] = useState<{ words: string[] }[]>([]);
  const recognitionRef = useRef<InstanceType<BrowserSpeechRecognitionCtor> | null>(null);
  const listeningRef = useRef(false);
  const manualStopRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const sessionCostRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const studioMimeRef = useRef<string | undefined>(undefined);
  const segmentChunksRef = useRef<Blob[]>([]);
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const studioChunkBusyRef = useRef(false);
  const studioChunkQueueRef = useRef<Array<{ blob: Blob; mimeType: string }>>([]);
  const networkRetryRef = useRef(false);
  const studioFailNotifiedRef = useRef(false);
  const [pickupMode, setPickupMode] = useState<'studio' | 'browser'>('studio');
  const { refundInk } = useUsage();
  const { getCost, tooltip } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const clearSegmentTimer = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
  }, []);

  const releaseMediaStream = useCallback(() => {
    clearSegmentTimer();
    segmentChunksRef.current = [];
    studioChunkQueueRef.current = [];
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, [clearSegmentTimer]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    listeningRef.current = false;
    setIsListening(false);
    setIsStudioTranscribing(false);
    setInterimTranscript('');
    recordingStartTimeRef.current = null;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }

    releaseMediaStream();
  }, [releaseMediaStream]);

  const enforceSessionLimit = useCallback(() => {
    if (!recordingStartTimeRef.current || isPro) return false;
    const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
    if (elapsed <= 30) return false;
    toast({
      variant: 'destructive',
      title: 'Demo Limit Reached',
      description: 'Free recordings are capped at 30 seconds.',
    });
    stopListening();
    router.push('/pricing');
    return true;
  }, [isPro, router, stopListening, toast]);

  const appendTranscript = useCallback((text: string) => {
    const trimmed = sanitizeFreestyleTranscript(text);
    if (!trimmed) return;
    setTranscript((prev) => (prev ? `${prev.trimEnd()} ${trimmed}` : trimmed));
  }, []);

  const drainStudioChunkQueue = useCallback(async () => {
    if (studioChunkBusyRef.current) return;

    const next = studioChunkQueueRef.current.shift();
    if (!next) return;

    const { blob, mimeType } = next;
    if (blob.size < MIN_CHUNK_BYTES || blob.size > MAX_TRANSCRIBE_BLOB_BYTES) {
      void drainStudioChunkQueue();
      return;
    }

    studioChunkBusyRef.current = true;
    setIsStudioTranscribing(true);
    try {
      const speechLevel = await measureAudioSpeechLevel(blob);
      if (!hasDetectableSpeech(speechLevel)) {
        return;
      }
      const audioBase64 = await blobToBase64(blob);
      const result = await transcribeFreestyleAudio(
        await withAiAuth({ audioBase64, mimeType })
      );
      appendTranscript(result.transcript);
    } catch (err) {
      console.warn('[FreestylePad] studio transcription chunk failed', err);
      if (!studioFailNotifiedRef.current) {
        studioFailNotifiedRef.current = true;
        const raw = err instanceof Error ? err.message : 'Check your connection and try again.';
        const detail = raw.includes('fetch failed')
          ? 'Studio could not reach Gemini. Check your internet and GEMINI_API_KEY, then try again.'
          : raw;
        toast({
          variant: 'destructive',
          title: 'Transcription Unavailable',
          description: detail.includes('Sign in')
            ? detail
            : `${detail} If this keeps happening, confirm GEMINI_API_KEY is set on the server.`,
        });
      }
    } finally {
      studioChunkBusyRef.current = false;
      if (listeningRef.current) {
        setInterimTranscript('Listening…');
      }
      setIsStudioTranscribing(studioChunkQueueRef.current.length > 0);
      void drainStudioChunkQueue();
    }
  }, [appendTranscript, toast]);

  const enqueueStudioChunk = useCallback(
    (blob: Blob, mimeType: string) => {
      studioChunkQueueRef.current.push({ blob, mimeType });
      void drainStudioChunkQueue();
    },
    [drainStudioChunkQueue]
  );

  const startStudioListening = useCallback(async () => {
    const mimeType = pickMediaRecorderMimeType();
    if (!mimeType) {
      toast({
        variant: 'destructive',
        title: 'Recording Not Supported',
        description: 'Your browser cannot record audio for studio transcription.',
      });
      refundInk(sessionCostRef.current);
      return;
    }

    try {
      const stream =
        mediaStreamRef.current ??
        (await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }));
      mediaStreamRef.current = stream;
      studioMimeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: STUDIO_AUDIO_BITS_PER_SECOND,
      });
      mediaRecorderRef.current = recorder;
      segmentChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          segmentChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const parts = segmentChunksRef.current;
        segmentChunksRef.current = [];
        if (!parts.length) {
          if (listeningRef.current && !manualStopRef.current) {
            try {
              recorder.start();
            } catch {
              /* ignore */
            }
          }
          return;
        }

        const segmentBlob = new Blob(parts, { type: mimeType });
        void (async () => {
          if (listeningRef.current) {
            enforceSessionLimit();
          }
          enqueueStudioChunk(segmentBlob, mimeType);
          if (listeningRef.current && !manualStopRef.current) {
            try {
              recorder.start();
            } catch {
              /* ignore */
            }
          }
        })();
      };

      recorder.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Recording Error',
          description: 'Audio capture stopped unexpectedly.',
        });
        stopListening();
        refundInk(sessionCostRef.current);
      };

      recorder.start();
      clearSegmentTimer();
      segmentTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, STUDIO_SEGMENT_MS);
      listeningRef.current = true;
      setPickupMode('studio');
      setIsListening(true);
      setInterimTranscript('Listening…');
      recordingStartTimeRef.current = Date.now();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Mic Denied',
        description: 'Please allow microphone access to use Freestyle.',
      });
      refundInk(sessionCostRef.current);
      setIsListening(false);
    }
  }, [enforceSessionLimit, refundInk, stopListening, toast, enqueueStudioChunk]);

  const startBrowserListening = useCallback(async () => {
    const SpeechRecognitionAPI = getBrowserSpeechRecognition();
    if (!SpeechRecognitionAPI) {
      await startStudioListening();
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await startStudioListening();
      return;
    }

    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Mic Denied',
        description: 'Please allow microphone access to use Freestyle.',
      });
      refundInk(sessionCostRef.current);
      return;
    }

    manualStopRef.current = false;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      listeningRef.current = true;
      setPickupMode('browser');
      setIsListening(true);
      recordingStartTimeRef.current = Date.now();
    };

    recognition.onresult = (event) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.[0]) continue;
        if (result.isFinal) {
          currentFinal += `${result[0].transcript} `;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      if (currentFinal) {
        appendTranscript(currentFinal);
      }
      setInterimTranscript(currentInterim);
      enforceSessionLimit();
    };

    recognition.onerror = async (event) => {
      if (event.error === 'network' && !networkRetryRef.current) {
        networkRetryRef.current = true;
        manualStopRef.current = false;
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
        setInterimTranscript('Listening…');
        await startStudioListening();
        return;
      }

      const message = speechRecognitionErrorMessage(event.error);
      if (message) {
        toast({
          variant: 'destructive',
          title: 'Recognition Error',
          description: message,
        });
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        stopListening();
        refundInk(sessionCostRef.current);
      }
    };

    recognition.onend = () => {
      if (manualStopRef.current || !listeningRef.current) return;
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      await startStudioListening();
    }
  }, [appendTranscript, enforceSessionLimit, refundInk, startStudioListening, stopListening, toast]);

  const startListening = useCallback(
    (e?: React.MouseEvent) => {
      const sessionCost = getCost('freestyleTranscription');
      if (
        !runWithInk('freestyleTranscription', sessionCost, 'freestyleTranscription', e, () => {
      sessionCostRef.current = sessionCost;
      networkRetryRef.current = false;
      studioFailNotifiedRef.current = false;
      manualStopRef.current = false;

      // Start mic after ink/emoji paint — awaiting getUserMedia here stalled the float sequence
      void (async () => {
        const forceStudioOnly = process.env.NEXT_PUBLIC_FREESTYLE_STUDIO_ONLY === '1';
        const canUseBrowserSpeech =
          getBrowserSpeechRecognition() &&
          !isLikelyUnreliableBrowserSpeech() &&
          !(await isCapacitorNativeApp());

        if (!forceStudioOnly && canUseBrowserSpeech) {
          await startBrowserListening();
          return;
        }

        await startStudioListening();
      })();
        })
      ) {
        return;
      }
    },
    [runWithInk, getCost, startBrowserListening, startStudioListening]
  );

  useEffect(() => {
    if (!open) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      networkRetryRef.current = false;
    }
  }, [open, stopListening]);

  const lines = transcript.split('. ').filter((l) => l.trim().length > 0);
  const liveLine = interimTranscript.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-4 md:p-6 bg-background border-2 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-3xl flex items-center gap-3">
            <Mic className={cn('h-8 w-8 text-primary', isListening && 'animate-pulse')} />
            FREESTYLE PAD
          </DialogTitle>
          <DialogDescription className="font-code text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            {pickupMode === 'browser'
              ? 'Live speech pickup (Chrome / Edge recommended)'
              : 'Studio mic pickup · words appear every few seconds'}{' '}
            {!isPro && '· (30s demo limit)'}
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
            {liveLine && (
              <div className="font-code font-bold text-xl md:text-2xl tracking-tight text-primary/60 italic animate-pulse">
                {liveLine}
                {isStudioTranscribing ? '' : '...'}
              </div>
            )}
            {!transcript && !liveLine && (
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
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                  {isStudioTranscribing
                    ? 'PROCESSING AUDIO'
                    : pickupMode === 'studio'
                      ? 'STUDIO PICKUP'
                      : 'RECORDING LIVE'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-3 sm:gap-6 flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button
              onClick={(e) => (isListening ? stopListening() : startListening(e))}
              size="icon"
              className={cn(
                'w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all active:scale-95 border-4 border-white/5 shrink-0',
                isListening ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-primary hover:bg-primary/90'
              )}
            >
              {isListening ? <Square className="h-7 w-7 sm:h-8 sm:w-8 fill-current" /> : <Mic className="h-7 w-7 sm:h-8 sm:w-8" />}
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Session Status</p>
              <p className="text-xs sm:text-sm font-bold text-foreground uppercase truncate">
                {isListening
                  ? isStudioTranscribing
                    ? 'Processing…'
                    : pickupMode === 'studio'
                      ? 'Studio Pickup'
                      : 'Live Pickup'
                  : 'Hardware Idle'}
              </p>
              <p className="text-[9px] text-primary font-bold uppercase mt-0.5 truncate">
                {tooltip('freestyleTranscription')}
              </p>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => {
                setTranscript('');
                setInterimTranscript('');
              }}
              className="h-11 sm:h-12 px-4 sm:px-6 font-bold text-[10px] sm:text-xs uppercase text-muted-foreground hover:text-red-500 flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" /> Reset
            </Button>
            <Button
              onClick={() => {
                const final = (transcript + ' ' + interimTranscript).trim();
                if (final) onAddFreestyle(final);
              }}
              disabled={(!transcript && !interimTranscript) || isListening}
              className="h-11 sm:h-12 px-4 sm:px-8 font-bold shadow-xl gap-1.5 sm:gap-2 text-[10px] sm:text-sm uppercase tracking-widest flex-1 sm:flex-none min-w-0"
            >
              <PlusCircle className="h-4 w-4 shrink-0" /> <span className="truncate">Add to Editor</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
