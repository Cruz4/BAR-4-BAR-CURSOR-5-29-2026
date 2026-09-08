'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { WallClip } from '@/lib/profile/wall-clips';

type WallClipPlayerProps = {
  clip: WallClip;
  poster?: string;
  compact?: boolean;
  className?: string;
  /** When set, pause this clip while it is not the focused slide. */
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
    }
  }, [active, clip.url]);

  return (
    <video
      ref={videoRef}
      src={clip.url}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      className={cn(
        'block w-full rounded-xl bg-black object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]',
        compact ? 'max-h-56' : 'max-h-[min(68dvh,46rem)]',
        className
      )}
    />
  );
}
