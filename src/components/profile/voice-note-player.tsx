'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Mic, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVoiceTime } from '@/lib/profile/voice-notes';
import { isSafeVoiceStoragePath, voiceFileApiUrl } from '@/lib/audio-mime';
import { auth } from '@/lib/firebase/client/firebase';
import { hookElementDualMono, remixBlobToDualMono } from '@/lib/audio-mono';
import { transcribeVoiceBlob } from '@/lib/voice-transcribe';

type VoiceNotePlayerProps = {
  src: string;
  storagePath?: string;
  contentType?: string;
  transcript?: string;
  durationSec?: number;
  compact?: boolean;
  className?: string;
  /** Hide the Read / Listen toggle (studio takes are playback-only). */
  showTranscriptToggle?: boolean;
  variant?: 'wall' | 'studio';
};

async function waitForSignedInUser(ms = 8000): Promise<typeof auth.currentUser> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, ms);
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return;
      window.clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

async function blobFromUrl(url: string, headers?: HeadersInit): Promise<Blob> {
  const res = await fetch(url, { headers, credentials: 'same-origin' });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Couldn’t load this recording.');
  }
  return res.blob();
}

async function dualMonoObjectUrl(blob: Blob): Promise<string> {
  const remixed = await remixBlobToDualMono(blob);
  return URL.createObjectURL(remixed);
}

async function resolvePlayableSrc(
  src: string,
  storagePath?: string,
  contentType?: string
): Promise<{ url: string; revoke: boolean }> {
  if (!src && !storagePath) throw new Error('Missing recording.');

  try {
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      const blob = await blobFromUrl(src);
      return { url: await dualMonoObjectUrl(blob), revoke: true };
    }

    if (storagePath && isSafeVoiceStoragePath(storagePath) && storagePath.startsWith('voice/')) {
      const blob = await blobFromUrl(voiceFileApiUrl(storagePath, { contentType }));
      return { url: await dualMonoObjectUrl(blob), revoke: true };
    }

    if (storagePath && isSafeVoiceStoragePath(storagePath) && storagePath.startsWith('sheet-takes/')) {
      const user = await waitForSignedInUser();
      const token = await user?.getIdToken();
      if (!token) throw new Error('Sign in to play this take.');
      const blob = await blobFromUrl(voiceFileApiUrl(storagePath, { contentType }), {
        Authorization: `Bearer ${token}`,
      });
      return { url: await dualMonoObjectUrl(blob), revoke: true };
    }

    if (src) {
      const blob = await blobFromUrl(src);
      return { url: await dualMonoObjectUrl(blob), revoke: true };
    }
  } catch (err) {
    if (src) return { url: src, revoke: false };
    throw err;
  }

  throw new Error('Couldn’t load this recording.');
}

async function blobForTranscript(
  src: string,
  storagePath?: string,
  contentType?: string
): Promise<Blob> {
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return blobFromUrl(src);
  }
  if (storagePath && isSafeVoiceStoragePath(storagePath) && storagePath.startsWith('voice/')) {
    return blobFromUrl(voiceFileApiUrl(storagePath, { contentType }));
  }
  if (storagePath && isSafeVoiceStoragePath(storagePath) && storagePath.startsWith('sheet-takes/')) {
    const user = await waitForSignedInUser();
    const token = await user?.getIdToken();
    if (!token) throw new Error('Sign in to transcribe this take.');
    return blobFromUrl(voiceFileApiUrl(storagePath, { contentType }), {
      Authorization: `Bearer ${token}`,
    });
  }
  return blobFromUrl(src);
}

export function VoiceNotePlayer({
  src,
  storagePath,
  contentType,
  transcript,
  durationSec,
  compact = false,
  className,
  showTranscriptToggle = true,
  variant = 'wall',
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [mode, setMode] = useState<'audio' | 'transcript'>('audio');
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec && durationSec > 0 ? durationSec : 0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [shownTranscript, setShownTranscript] = useState(transcript?.trim() || '');
  const [reading, setReading] = useState(false);
  const transcribeTriedRef = useRef(false);
  const studio = variant === 'studio';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setMode('audio');
    setPlaying(false);
    setCurrent(0);
    setReady(false);
    setError(null);
    setDuration(durationSec && durationSec > 0 ? durationSec : 0);

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onTime = () => setCurrent(audio.currentTime || 0);
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onErr = () => {
      setPlaying(false);
      setReady(false);
      setError('Couldn’t load this recording.');
    };
    const onCanPlay = () => setReady(true);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onErr);

    let cancelled = false;
    let objectUrl: string | null = null;
    void resolvePlayableSrc(src, storagePath, contentType)
      .then((resolved) => {
        if (cancelled) {
          if (resolved.revoke) URL.revokeObjectURL(resolved.url);
          return;
        }
        if (resolved.revoke) objectUrl = resolved.url;
        audio.src = resolved.url;
        audio.load();
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Couldn’t load this recording.');
      });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onErr);
      audio.removeAttribute('src');
      audio.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, storagePath, contentType, durationSec]);

  useEffect(() => {
    setShownTranscript(transcript?.trim() || '');
    transcribeTriedRef.current = false;
  }, [transcript, src]);

  useEffect(() => {
    return () => {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx) void ctx.close();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (mode !== 'audio' && !audio.paused) audio.pause();
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'audio' ? 'transcript' : 'audio'));
  };

  useEffect(() => {
    if (mode === 'audio' && !shownTranscript.trim()) transcribeTriedRef.current = false;
  }, [mode, shownTranscript]);

  useEffect(() => {
    if (mode !== 'transcript' || shownTranscript.trim() || transcribeTriedRef.current) return;
    transcribeTriedRef.current = true;
    let cancelled = false;
    setReading(true);
    void (async () => {
      try {
        const blob = await blobForTranscript(src, storagePath, contentType);
        const text = await transcribeVoiceBlob(blob);
        if (!cancelled && text) setShownTranscript(text);
        if (!cancelled && !text) setShownTranscript('');
      } catch (err) {
        if (!cancelled) {
          setShownTranscript(
            err instanceof Error && /sign in/i.test(err.message)
              ? 'Sign in to generate a transcript.'
              : 'Couldn’t transcribe this take. Try again in a moment.'
          );
        }
      } finally {
        if (!cancelled) setReading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, shownTranscript, src, storagePath, contentType]);

  const togglePlay = async (event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (!audio.src) {
      setError('Still loading this recording…');
      return;
    }
    try {
      setPlaying(true);
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = hookElementDualMono(audio);
        }
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
      } catch {
        /* remixed wav still plays through the element */
      }
      await audio.play();
    } catch (err) {
      setPlaying(false);
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotSupportedError'
          ? 'This recording isn’t playable in this browser. Try Chrome.'
          : name === 'NotAllowedError'
            ? 'Tap play again to start the take.'
            : 'Couldn’t play. Tap again, or try Chrome.'
      );
    }
  };

  const seek = (next: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = next;
    setCurrent(next);
  };

  const cleanTranscript = shownTranscript.trim();
  const max = duration > 0 ? duration : Math.max(current, 0.1);
  const showHeader = showTranscriptToggle || !studio;

  return (
    <div
      className={cn(
        'relative z-10 rounded-xl border',
        studio
          ? 'border-border/60 bg-background/70'
          : 'border-[var(--ph-border,rgba(255,255,255,0.14))] bg-black/35',
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
        className
      )}
    >
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        aria-hidden
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      />
      {showHeader ? (
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.18em]',
              studio ? 'text-muted-foreground' : 'text-[var(--ph-muted,rgba(255,255,255,0.55))]'
            )}
          >
            {mode === 'audio' ? 'Voice note' : 'Transcript'}
          </p>
          {showTranscriptToggle ? (
            <button
              type="button"
              onClick={toggleMode}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
                studio
                  ? 'border-border/70 bg-muted/40 text-primary hover:bg-muted'
                  : 'border-white/15 bg-white/5 text-[var(--ph-accent,#7dd3fc)] hover:bg-white/10'
              )}
              aria-pressed={mode === 'transcript'}
              title={mode === 'audio' ? 'Read transcript' : 'Play audio'}
            >
              {mode === 'audio' ? <FileText className="h-3 w-3 pointer-events-none" /> : <Mic className="h-3 w-3 pointer-events-none" />}
              {mode === 'audio' ? 'Read' : 'Listen'}
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === 'transcript' && showTranscriptToggle ? (
        <p
          className={cn(
            'mt-2 whitespace-pre-wrap text-sm leading-relaxed',
            studio ? 'text-foreground/90' : 'text-[var(--ph-text,#fff)]/90'
          )}
        >
          {reading ? 'Writing transcript…' : cleanTranscript || 'No transcript for this take.'}
        </p>
      ) : (
        <div className={cn('flex items-center gap-2', showHeader && 'mt-2')}>
          <button
            type="button"
            onClick={(event) => void togglePlay(event)}
            className={cn(
              'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 pointer-events-auto',
              studio ? 'bg-primary text-primary-foreground' : 'bg-[var(--ph-accent,#7dd3fc)] text-black',
              !ready && !error ? 'opacity-70' : ''
            )}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <Pause className="pointer-events-none h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="pointer-events-none ml-0.5 h-3.5 w-3.5 fill-current" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={max}
            step={0.05}
            value={Math.min(current, max)}
            onChange={(e) => seek(Number(e.target.value))}
            className={cn('h-1.5 w-full cursor-pointer', studio ? 'accent-primary' : 'accent-sky-300')}
            aria-label="Seek"
          />
          <span
            className={cn(
              'shrink-0 font-code text-[10px] tabular-nums',
              studio ? 'text-muted-foreground' : 'text-[var(--ph-muted,rgba(255,255,255,0.6))]'
            )}
          >
            {formatVoiceTime(current)} / {formatVoiceTime(duration || durationSec || 0)}
          </span>
        </div>
      )}
      {error ? (
        <p className={cn('mt-1.5 text-[11px]', studio ? 'text-destructive' : 'text-red-300')}>{error}</p>
      ) : null}
    </div>
  );
}
