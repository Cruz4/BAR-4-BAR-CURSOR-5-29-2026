'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getBrowserSpeechRecognition,
  getFreestyleAudioConstraints,
  pickMediaRecorderMimeType,
  speechRecognitionErrorMessage,
  type BrowserSpeechRecognitionCtor,
} from '@/lib/speech-recognition';
import { normalizeAudioContentType } from '@/lib/audio-mime';
import { transcribeVoiceBlob } from '@/lib/voice-transcribe';
import { dualMonoCaptureStream } from '@/lib/audio-mono';
import {
  VOICE_MAX_SECONDS,
  revokeVoiceObjectUrl,
  voiceRecorderSupported,
  type RecordedVoiceClip,
} from '@/lib/profile/voice-notes';

type RecInstance = InstanceType<BrowserSpeechRecognitionCtor>;

export type VoiceRecorderStatus = 'idle' | 'recording' | 'transcribing' | 'recorded';

function liveCaption(
  event: {
    resultIndex: number;
    results: { length: number; [index: number]: { isFinal: boolean; 0?: { transcript: string } } };
  },
  priorFinals: string
): { appendedFinal: string; liveText: string } {
  let appendedFinal = '';
  let interim = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const piece = event.results[i]?.[0]?.transcript || '';
    if (event.results[i]?.isFinal) appendedFinal += `${piece} `;
    else interim += piece;
  }
  appendedFinal = appendedFinal.replace(/\s+/g, ' ').trim();
  const finals = [priorFinals, appendedFinal].filter(Boolean).join(' ').trim();
  return {
    appendedFinal,
    liveText: `${finals} ${interim}`.replace(/\s+/g, ' ').trim(),
  };
}

function startBrowserTranscription(opts: {
  recorderRef: { current: MediaRecorder | null };
  recognitionRef: { current: RecInstance | null };
  finalTranscriptRef: { current: string };
  liveTranscriptRef: { current: string };
  setLiveTranscript: (text: string) => void;
  setError: (text: string | null) => void;
}): void {
  const SpeechRec = getBrowserSpeechRecognition() as BrowserSpeechRecognitionCtor | null;
  if (!SpeechRec) return;
  try {
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
    rec.onresult = (event) => {
      const assembled = liveCaption(event, opts.finalTranscriptRef.current);
      if (assembled.appendedFinal) {
        opts.finalTranscriptRef.current = [opts.finalTranscriptRef.current, assembled.appendedFinal]
          .filter(Boolean)
          .join(' ')
          .trim();
      }
      opts.setLiveTranscript(assembled.liveText || opts.finalTranscriptRef.current);
      opts.liveTranscriptRef.current = assembled.liveText || opts.finalTranscriptRef.current;
    };
    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (opts.recorderRef.current?.state === 'recording' || !opts.recorderRef.current) {
          try {
            rec.start();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      const message = speechRecognitionErrorMessage(event.error);
      if (message && (event.error === 'not-allowed' || event.error === 'audio-capture')) {
        opts.setError(message);
      }
    };
    rec.onend = () => {
      if (opts.recorderRef.current?.state === 'recording') {
        try {
          rec.start();
        } catch {
          /* some browsers refuse restart */
        }
      }
    };
    opts.recognitionRef.current = rec;
    rec.start();
  } catch {
    opts.recognitionRef.current = null;
  }
}

export function useVoiceRecorder(opts?: { maxSeconds?: number; transcribe?: boolean }) {
  const maxSeconds = opts?.maxSeconds ?? VOICE_MAX_SECONDS;
  const transcribe = opts?.transcribe !== false;
  const maxSecondsRef = useRef(maxSeconds);
  maxSecondsRef.current = maxSeconds;
  const transcribeRef = useRef(transcribe);
  transcribeRef.current = transcribe;

  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [clip, setClip] = useState<RecordedVoiceClip | null>(null);
  const [supported] = useState(() => voiceRecorderSupported());

  const streamRef = useRef<MediaStream | null>(null);
  const captureCloseRef = useRef<(() => void) | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<RecInstance | null>(null);
  const finalTranscriptRef = useRef('');
  const liveTranscriptRef = useRef('');
  const clipRef = useRef<RecordedVoiceClip | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const stopStream = useCallback(() => {
    captureCloseRef.current?.();
    captureCloseRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const discardClip = useCallback(() => {
    revokeVoiceObjectUrl(clipRef.current);
    clipRef.current = null;
    setClip(null);
    setLiveTranscript('');
    finalTranscriptRef.current = '';
    liveTranscriptRef.current = '';
    setElapsedMs(0);
    setStatus('idle');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError('Voice notes need a browser that can record audio.');
      return;
    }
    setError(null);
    discardClip();
    chunksRef.current = [];
    finalTranscriptRef.current = '';
    liveTranscriptRef.current = '';
    setLiveTranscript('');

    const mimeType = pickMediaRecorderMimeType();
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...getFreestyleAudioConstraints(),
          channelCount: 1,
        },
        video: false,
      });
    } catch {
      setError('Microphone access was blocked. Allow the mic and try again.');
      return;
    }

    if (transcribeRef.current) {
      startBrowserTranscription({
        recorderRef,
        recognitionRef,
        finalTranscriptRef,
        liveTranscriptRef,
        setLiveTranscript,
        setError,
      });
    }

    let capture: Awaited<ReturnType<typeof dualMonoCaptureStream>>;
    try {
      capture = await dualMonoCaptureStream(mic);
    } catch {
      mic.getTracks().forEach((track) => track.stop());
      setError('Could not start the recorder.');
      return;
    }
    captureCloseRef.current = capture.close;
    streamRef.current = capture.stream;

    const recorder = new MediaRecorder(capture.stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      clearTimers();
      recorderRef.current = null;
      const contentType = normalizeAudioContentType(recorder.mimeType || mimeType || 'audio/webm');
      const blob = new Blob(chunksRef.current, { type: contentType });
      chunksRef.current = [];
      const durationSec = Math.max(0.2, (Date.now() - startedAtRef.current) / 1000);
      if (blob.size < 400) {
        stopRecognition();
        stopStream();
        setError('That take was too quiet. Try again a little closer to the mic.');
        setStatus('idle');
        setElapsedMs(0);
        return;
      }

      void (async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 600));
        stopRecognition();
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        stopStream();
        let transcript = (finalTranscriptRef.current || liveTranscriptRef.current).trim();
        const next: RecordedVoiceClip = {
          blob,
          objectUrl: URL.createObjectURL(blob),
          durationSec: Math.min(maxSecondsRef.current, durationSec),
          contentType,
          transcript,
        };
        revokeVoiceObjectUrl(clipRef.current);
        clipRef.current = next;
        setClip(next);
        setStatus(transcript ? 'recorded' : 'transcribing');
        if (transcript) return;
        try {
          transcript = await transcribeVoiceBlob(blob);
          if (clipRef.current?.objectUrl === next.objectUrl) {
            const updated = { ...clipRef.current, transcript };
            clipRef.current = updated;
            setClip(updated);
          }
        } catch {
          /* Read can retry from the saved audio */
        }
        setStatus('recorded');
      })();
    };

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setStatus('recording');
    recorder.start(250);
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    stopTimerRef.current = window.setTimeout(() => {
      stop();
    }, maxSecondsRef.current * 1000);
  }, [clearTimers, discardClip, stop, stopRecognition, stopStream, supported]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopRecognition();
      stopStream();
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      revokeVoiceObjectUrl(clipRef.current);
    };
  }, [clearTimers, stopRecognition, stopStream]);

  return {
    supported,
    status,
    elapsedMs,
    error,
    liveTranscript,
    clip,
    start,
    stop,
    discard: discardClip,
  };
}
