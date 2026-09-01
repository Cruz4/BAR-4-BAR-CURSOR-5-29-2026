'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { WallClip } from '@/lib/profile/wall-clips';

type WallClipPlayerProps = {
  clip: WallClip;
  poster?: string;
  compact?: boolean;
  className?: string;
  /** When set, play the visible slide and pause the rest. */
  active?: boolean;
};

export function WallClipPlayer({
  clip,
  poster,
  compact = false,
  className,
  active,
}: WallClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || active === undefined) return;
    if (!active) {
      video.pause();
      return;
    }
    video.currentTime = 0;
    video.muted = false;
    const tryPlay = () =>
      video.play().catch(() => {
        video.muted = true;
        return video.play().catch(() => undefined);
      });
    void tryPlay();
  }, [active, clip.url]);

  return (
    <video
      ref={videoRef}
      src={clip.url}
      poster={poster}
      controls
      playsInline
      loop
      preload={active === false ? 'metadata' : 'auto'}
      className={cn(
        'block w-full rounded-xl bg-black object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]',
        compact ? 'max-h-56' : 'max-h-[min(68dvh,46rem)]',
        className
      )}
    />
  );
}
