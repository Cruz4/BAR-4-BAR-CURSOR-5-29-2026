'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { InkArmAffordance, inkArmedButtonClass } from '@/components/ui/ink-arm-affordance';
import { HighlightedText } from './highlighted-text';
import { FreestyleMicLevelVisualizer } from './freestyle-mic-level';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { withAiAuth } from '@/lib/ai-client';
import { lazyTranscribeFreestyleAudio } from '@/lib/lazy-ai-flows';
import {
  blobToBase64,
  getBrowserSpeechRecognition,
  hasDetectableSpeech,
  isCapacitorNativeApp,
  isLikelyUnreliableBrowserSpeech,
  measureAudioSpeechLevel,
  pickMediaRecorderMimeType,
  getFreestyleAudioConstraints,
  isMobileDevice,
  speechRecognitionErrorMessage,
  MAX_TRANSCRIBE_BLOB_BYTES,
  type BrowserSpeechRecognitionCtor,
} from '@/lib/speech-recognition';
import {
  formatTrackVibeForTranscription,
  FREESTYLE_PRIOR_TAIL_CHARS,
  truncateFreestyleContextField,
} from '@/lib/freestyle-transcription-context';
import { mergeFreestyleTranscriptChunk, sanitizeFreestyleTranscript } from '@/lib/freestyle-transcript';

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

/** Complete segment length (stop/start with requestData flush) */
const STUDIO_SEGMENT_MS = 2800;
const STUDIO_RECORDER_RESTART_MS = 120;
const STUDIO_AUDIO_BITS_PER_SECOND = 96_000;
const MIN_CHUNK_BYTES = 1000;
const MAX_BROWSER_SPEECH_RESTARTS = 4;

export function FreestylePad({ open, onOpenChange, onAddFreestyle, disabled, trackVibe, albumTheme, styleProfileSummary, isPro }: FreestylePadProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isStudioTranscribing, setIsStudioTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
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
  const studioChunkQueueRef = useRef<
    Array<{ blob: Blob; mimeType: string; priorTranscriptTail: string; sessionId: number }>
  >([]);
  const recordingSessionRef = useRef(0);
  const transcriptRef = useRef('');
  const networkRetryRef = useRef(false);
  const studioFailNotifiedRef = useRef(false);
  const silentChunkStreakRef = useRef(0);
  const browserSpeechRestartRef = useRef(0);
  const [pickupMode, setPickupMode] = useState<'studio' | 'browser'>('studio');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const { refundInk } = useUsage();
  const { getEffectiveCost, tooltip } = useInkCosts();
  const { runWithInk, isArmed } = useTouchInkRunner();

  const transcriptionContext = useMemo(
    () => ({
      albumTheme: truncateFreestyleContextField(albumTheme),
      trackVibeSummary: formatTrackVibeForTranscription(trackVibe),
      styleProfileSummary: truncateFreestyleContextField(styleProfileSummary, 600),
    }),
    [albumTheme, trackVibe, styleProfileSummary]
  );

  const clearSegmentTimer = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
  }, []);

  const releaseMediaStream = useCallback(() => {
    clearSegmentTimer();
    segmentChunksRef.current = [];
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setMicStream(null);
  }, [clearSegmentTimer]);

  const discardStaleStudioWork = useCallback(() => {
    recordingSessionRef.current += 1;
    studioChunkQueueRef.current = [];
    studioChunkBusyRef.current = false;
    setIsStudioTranscribing(false);
  }, []);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    listeningRef.current = false;
    setIsListening(false);
    setRecordingElapsedSec(0);
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
        if (typeof mediaRecorderRef.current.requestData === 'function') {
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }

    releaseMediaStream();

    const stillProcessing =
      studioChunkBusyRef.current || studioChunkQueueRef.current.length > 0;
    setInterimTranscript(stillProcessing ? 'Transcribing your last clip…' : '');
    setIsStudioTranscribing(stillProcessing);
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
    setTranscript((prev) => {
      const merged = prev ? mergeFreestyleTranscriptChunk(prev, trimmed) : trimmed;
      transcriptRef.current = merged;
      return merged;
    });
  }, []);

  const drainStudioChunkQueue = useCallback(async () => {
    if (studioChunkBusyRef.current) return;

    const next = studioChunkQueueRef.current.shift();
    if (!next) return;

    const { blob, mimeType, priorTranscriptTail, sessionId } = next;
    if (blob.size < MIN_CHUNK_BYTES || blob.size > MAX_TRANSCRIBE_BLOB_BYTES) {
      void drainStudioChunkQueue();
      return;
    }

    studioChunkBusyRef.current = true;
    setIsStudioTranscribing(true);
    try {
      const speechLevel = await measureAudioSpeechLevel(blob);
      if (sessionId !== recordingSessionRef.current) {
        return;
      }
      if (!hasDetectableSpeech(speechLevel, blob.size)) {
        silentChunkStreakRef.current += 1;
        if (silentChunkStreakRef.current === 3 && !studioFailNotifiedRef.current) {
          studioFailNotifiedRef.current = true;
          toast({
            variant: 'destructive',
            title: 'No Speech Detected',
            description:
              'The mic is open but audio looks silent. Check your input device, speak closer to the mic, or try wired headphones.',
          });
        }
        return;
      }
      silentChunkStreakRef.current = 0;
      const audioBase64 = await blobToBase64(blob);
      const result = await lazyTranscribeFreestyleAudio(
        await withAiAuth({
          audioBase64,
          mimeType,
          priorTranscriptTail: priorTranscriptTail || undefined,
          albumTheme: transcriptionContext.albumTheme || undefined,
          trackVibeSummary: transcriptionContext.trackVibeSummary || undefined,
          styleProfileSummary: transcriptionContext.styleProfileSummary || undefined,
        })
      );
      if (sessionId !== recordingSessionRef.current) {
        return;
      }
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
      const queuePending = studioChunkQueueRef.current.length > 0;
      if (listeningRef.current) {
        setInterimTranscript('Listening… keep rapping');
      } else if (queuePending || studioChunkBusyRef.current) {
        setInterimTranscript('Transcribing your last clip…');
      } else {
        setInterimTranscript('');
      }
      setIsStudioTranscribing(queuePending);
      void drainStudioChunkQueue();
    }
  }, [appendTranscript, toast, transcriptionContext]);

  const enqueueStudioChunk = useCallback(
    (blob: Blob, mimeType: string) => {
      const sessionId = recordingSessionRef.current;
      studioChunkQueueRef.current.push({
        blob,
        mimeType,
        priorTranscriptTail: transcriptRef.current.slice(-FREESTYLE_PRIOR_TAIL_CHARS).trim(),
        sessionId,
      });
      void drainStudioChunkQueue();
    },
    [drainStudioChunkQueue]
  );

  const scheduleStudioRecorderRestart = useCallback((recorder: MediaRecorder) => {
    if (!listeningRef.current || manualStopRef.current) return;
    setTimeout(() => {
      if (!listeningRef.current || manualStopRef.current) return;
      try {
        if (recorder.state === 'inactive') {
          recorder.start();
        }
      } catch {
        /* mobile browsers may reject immediate restart */
      }
    }, STUDIO_RECORDER_RESTART_MS);
  }, []);

  const startStudioListening = useCallback(async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

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
          audio: getFreestyleAudioConstraints(),
        }));
      mediaStreamRef.current = stream;
      setMicStream(stream);
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
          scheduleStudioRecorderRestart(recorder);
          return;
        }

        const segmentBlob = new Blob(parts, { type: mimeType });
        void (async () => {
          if (listeningRef.current) {
            enforceSessionLimit();
          }
          enqueueStudioChunk(segmentBlob, mimeType);
          scheduleStudioRecorderRestart(recorder);
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
        const rec = mediaRecorderRef.current;
        if (rec?.state === 'recording') {
          try {
            if (typeof rec.requestData === 'function') {
              rec.requestData();
            }
          } catch {
            /* ignore */
          }
          setTimeout(() => {
            if (rec.state === 'recording') {
              try {
                rec.stop();
              } catch {
                /* ignore */
              }
            }
          }, 40);
        }
      }, STUDIO_SEGMENT_MS);
      listeningRef.current = true;
      setPickupMode('studio');
      setIsListening(true);
      setInterimTranscript('Recording… first words in ~3 sec');
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
  }, [enforceSessionLimit, refundInk, scheduleStudioRecorderRestart, stopListening, toast, enqueueStudioChunk]);

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
          audio: getFreestyleAudioConstraints(),
        });
      }
      setMicStream(mediaStreamRef.current);
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
      browserSpeechRestartRef.current += 1;
      if (browserSpeechRestartRef.current > MAX_BROWSER_SPEECH_RESTARTS) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
        setInterimTranscript('Switching to studio pickup…');
        void startStudioListening();
        return;
      }
      setTimeout(() => {
        if (manualStopRef.current || !listeningRef.current) return;
        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
          void startStudioListening();
        }
      }, 250);
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
      const sessionCost = getEffectiveCost('freestyleTranscription');
      if (
        !runWithInk('freestyleTranscription', sessionCost, 'freestyleTranscription', e, () => {
      sessionCostRef.current = sessionCost;
      networkRetryRef.current = false;
      studioFailNotifiedRef.current = false;
      silentChunkStreakRef.current = 0;
      browserSpeechRestartRef.current = 0;
      manualStopRef.current = false;
      discardStaleStudioWork();

      // Start mic after ink/emoji paint — awaiting getUserMedia here stalled the float sequence
      void (async () => {
        const forceStudioOnly = process.env.NEXT_PUBLIC_FREESTYLE_STUDIO_ONLY === '1';
        const allowBrowserSpeech = process.env.NEXT_PUBLIC_FREESTYLE_BROWSER_SPEECH === '1';
        const canUseBrowserSpeech =
          allowBrowserSpeech &&
          getBrowserSpeechRecognition() &&
          !isLikelyUnreliableBrowserSpeech() &&
          !isMobileDevice() &&
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
    [runWithInk, getEffectiveCost, startBrowserListening, startStudioListening, discardStaleStudioWork]
  );

  useEffect(() => {
    if (!isListening) return;
    const started = recordingStartTimeRef.current ?? Date.now();
    const tick = () => setRecordingElapsedSec(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [isListening]);

  useEffect(() => {
    if (!open) {
      stopListening();
      discardStaleStudioWork();
      setTranscript('');
      transcriptRef.current = '';
      setInterimTranscript('');
      setRecordingElapsedSec(0);
      networkRetryRef.current = false;
    }
  }, [open, stopListening, discardStaleStudioWork]);

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
              ? 'Live speech pickup (experimental)'
              : 'Studio mic · words appear every ~3s while you rap'}{' '}
            {!isPro && '· (30s demo limit)'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow rounded-xl border-2 border-dashed border-white/10 bg-black/20 p-4 md:p-8 flex flex-col gap-4 md:gap-6 overflow-hidden relative">
          {isListening && (
            <div className="shrink-0 rounded-xl border border-primary/25 bg-black/50 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <FreestyleMicLevelVisualizer stream={micStream} active={isListening} />
            </div>
          )}
          <div className="flex-grow overflow-y-auto studio-scrollbar space-y-4 min-h-0">
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
              <div className="font-code font-bold text-xl md:text-2xl tracking-tight text-primary/80 italic animate-pulse border-l-2 border-primary/40 pl-4">
                {liveLine}
                {isListening && !liveLine.includes('Transcribing') ? '…' : ''}
              </div>
            )}
            {isListening && !transcript && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 px-5 py-4 text-center space-y-2">
                <p className="font-headline text-lg font-bold text-primary uppercase tracking-wide">
                  Recording {recordingElapsedSec > 0 ? `${recordingElapsedSec}s` : '…'}
                </p>
                <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
                  {pickupMode === 'studio'
                    ? 'Watch the bars above — when they light up green, the mic hears you. Words land in ~3s.'
                    : 'Speak clearly — words appear as you rap'}
                </p>
              </div>
            )}
            {!isListening && isStudioTranscribing && !transcript && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-center">
                <p className="font-code text-sm uppercase tracking-widest text-amber-200/90 flex items-center justify-center gap-2">
                  <Loader className="h-4 w-4 animate-spin shrink-0" />
                  Transcribing your clip…
                </p>
              </div>
            )}
            {!transcript && !liveLine && !isListening && !isStudioTranscribing && (
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
            <InkArmAffordance armed={isArmed('freestyleTranscription')}>
            <Button
              onClick={(e) => (isListening ? stopListening() : startListening(e))}
              size="icon"
              className={cn(
                'w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all active:scale-95 border-4 border-white/5 shrink-0',
                isListening ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-primary hover:bg-primary/90',
                inkArmedButtonClass(isArmed('freestyleTranscription'))
              )}
              aria-label={isArmed('freestyleTranscription') ? 'Tap again to confirm freestyle session' : 'Start freestyle recording'}
            >
              {isListening ? <Square className="h-7 w-7 sm:h-8 sm:w-8 fill-current" /> : <Mic className="h-7 w-7 sm:h-8 sm:w-8" />}
            </Button>
            </InkArmAffordance>
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
                discardStaleStudioWork();
                setTranscript('');
                transcriptRef.current = '';
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
              disabled={(!transcript && !interimTranscript) || isListening || isStudioTranscribing}
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
