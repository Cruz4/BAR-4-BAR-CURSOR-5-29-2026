'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeVoiceStoragePath, voiceFileApiUrl } from '@/lib/audio-mime';
import type { VoiceNote } from '@/lib/profile/voice-notes';

function memoSrc(memo: VoiceNote): string {
  if (memo.storagePath && isSafeVoiceStoragePath(memo.storagePath)) {
    return voiceFileApiUrl(memo.storagePath, { contentType: memo.contentType });
  }
  return memo.url;
}

export function ProfileVoiceMemoBadge({
  memo,
  className,
}: {
  memo: VoiceNote;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const src = memoSrc(memo);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.src = src;
      audio.addEventListener('ended', () => setPlaying(false));
      audio.addEventListener('pause', () => setPlaying(false));
      audioRef.current = audio;
    }
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }
    try {
      audio.currentTime = 0;
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => void toggle(event)}
      title="Voice memo"
      aria-label={playing ? 'Stop voice memo' : 'Play voice memo'}
      className={cn(
        'relative z-[2] inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--ph-border)] bg-[var(--ph-plate)] text-[var(--ph-muted)] transition-colors hover:border-[var(--ph-accent)] hover:text-[var(--ph-accent)] pointer-events-auto',
        playing && 'border-[var(--ph-accent)] text-[var(--ph-accent)]',
        className
      )}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}
