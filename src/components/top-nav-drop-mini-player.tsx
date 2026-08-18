'use client';

import Link from 'next/link';
import React from 'react';
import { Loader, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useOptionalDropPlayer } from '@/context/drop-player-context';
import { formatDeckTime } from '@/lib/drop-library';
import { Button } from '@/components/ui/button';

export function TopNavDropMiniPlayer() {
  const player = useOptionalDropPlayer();
  if (!player?.current) return null;

  const { current, playing, loading, elapsed, duration, togglePlay, skipNext, prev, stop } = player;

  return (
    <div className="border-t border-border/40 bg-background/95 px-2 sm:px-4 md:px-6">
      <div className="mx-auto flex h-10 w-full max-w-6xl items-center gap-1.5">
        <Link
          href="/library"
          className="min-w-0 flex-1 rounded-md px-1.5 py-0.5 hover:bg-white/5"
          aria-label="Open Library"
        >
          <span className="block truncate font-headline text-[11px] font-bold uppercase leading-tight">
            {current.title}
          </span>
          <span className="block truncate font-code text-[9px] uppercase leading-tight text-muted-foreground">
            {current.artistName}
            {duration > 0 ? ` · ${formatDeckTime(elapsed)} / ${formatDeckTime(duration)}` : ''}
          </span>
        </Link>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={prev} aria-label="Previous">
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {loading ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={skipNext} aria-label="Next">
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={stop} aria-label="Stop">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
