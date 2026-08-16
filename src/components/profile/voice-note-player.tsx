'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Mic, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVoiceTime } from '@/lib/profile/voice-notes';

type VoiceNotePlayerProps = {
  src: string;
  transcript?: string;
  durationSec?: number;
  compact?: boolean;
  className?: string;
  /** Hide the Read / Listen toggle (studio takes are playback-only). */
  showTranscriptToggle?: boolean;
  variant?: 'wall' | 'studio';
};

export function VoiceNotePlayer({
  src,
  transcript,
  durationSec,
  compact = false,
  className,
  showTranscriptToggle = true,
  variant = 'wall',
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<'audio' | 'transcript'>('audio');
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec && durationSec > 0 ? durationSec : 0);
  const studio = variant === 'studio';

  useEffect(() => {
    setMode('audio');
    setPlaying(false);
    setCurrent(0);
    setDuration(durationSec && durationSec > 0 ? durationSec : 0);
  }, [src, durationSec]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (mode !== 'audio' && !audio.paused) audio.pause();
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'audio' ? 'transcript' : 'audio'));
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        /* autoplay blocked until another gesture */
      }
    } else {
      audio.pause();
    }
  };

  const seek = (next: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = next;
    setCurrent(next);
  };

  const cleanTranscript = transcript?.trim() || '';
  const max = duration > 0 ? duration : Math.max(current, 0.1);
  const showHeader = showTranscriptToggle || !studio;

  return (
    <div
      className={cn(
        'rounded-xl border',
        studio
          ? 'border-border/60 bg-background/70'
          : 'border-[var(--ph-border,rgba(255,255,255,0.14))] bg-black/35',
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
        className
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
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
              {mode === 'audio' ? <FileText className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
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
          {cleanTranscript || 'No transcript for this take.'}
        </p>
      ) : (
        <div className={cn('flex items-center gap-2', showHeader && 'mt-2')}>
          <button
            type="button"
            onClick={() => void togglePlay()}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105',
              studio ? 'bg-primary text-primary-foreground' : 'bg-[var(--ph-accent,#7dd3fc)] text-black'
            )}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
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
    </div>
  );
}
