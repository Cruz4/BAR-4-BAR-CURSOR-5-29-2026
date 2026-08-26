'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useOptionalDropPlayer } from '@/context/drop-player-context';
import { formatDeckTime } from '@/lib/drop-library';
import { Button } from '@/components/ui/button';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { cn } from '@/lib/utils';
import { DropRepeatControl } from '@/components/drop-repeat-control';

const artistAvatarCache = new Map<string, string | null>();

export function shouldHideDropNowPlayingBar(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname === '/library' ||
    pathname === '/login' ||
    pathname === '/welcome' ||
    pathname.endsWith('/perform') ||
    pathname.startsWith('/share/') || pathname.startsWith('/song/') ||
    pathname.startsWith('/marketing/')
  );
}

export function DropNowPlayingBar() {
  const player = useOptionalDropPlayer();
  const pathname = usePathname();
  const currentShareId = player?.current?.shareId;
  const [artistAvatarUrl, setArtistAvatarUrl] = useState<string>();

  useEffect(() => {
    if (!currentShareId) {
      setArtistAvatarUrl(undefined);
      return;
    }
    if (artistAvatarCache.has(currentShareId)) {
      setArtistAvatarUrl(artistAvatarCache.get(currentShareId) || undefined);
      return;
    }

    let cancelled = false;
    setArtistAvatarUrl(undefined);
    void fetch(`/api/songs/${encodeURIComponent(currentShareId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((summary) => {
        const avatarUrl = typeof summary?.artist?.avatarUrl === 'string' && summary.artist.avatarUrl.trim()
          ? summary.artist.avatarUrl.trim()
          : null;
        artistAvatarCache.set(currentShareId, avatarUrl);
        if (!cancelled) setArtistAvatarUrl(avatarUrl || undefined);
      })
      .catch(() => {
        artistAvatarCache.set(currentShareId, null);
        if (!cancelled) setArtistAvatarUrl(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [currentShareId]);

  if (!player?.current) return null;
  if (shouldHideDropNowPlayingBar(pathname)) return null;

  const {
    current,
    playing,
    loading,
    elapsed,
    duration,
    volume,
    repeat,
    togglePlay,
    skipNext,
    prev,
    setVolume,
    setRepeat,
    toggleMute,
  } = player;
  const playerImageUrl = artistAvatarUrl || current.coverArtUrl;
  const liftForEditor =
    pathname.startsWith('/albums/') || pathname.startsWith('/tracks/');

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[45] px-3',
        liftForEditor
          ? 'bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:bottom-[max(0.65rem,env(safe-area-inset-bottom))]'
          : 'bottom-[max(0.65rem,env(safe-area-inset-bottom))]'
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-fuchsia-400/30 bg-zinc-950/95 px-2.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <Link
          href="/library"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-0.5 hover:bg-white/5"
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-fuchsia-400/25 bg-black">
            {playerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playerImageUrl}
                alt={`${current.artistName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-headline text-sm font-bold text-fuchsia-200">
                {current.artistName.trim().charAt(0).toUpperCase() || 'B'}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-headline text-sm font-bold uppercase leading-tight">
              {current.title}
            </span>
            <span className="block truncate font-code text-[10px] uppercase text-muted-foreground">
              {current.artistName}
              {duration > 0 ? ` · ${formatDeckTime(elapsed)} / ${formatDeckTime(duration)}` : ''}
            </span>
          </span>
        </Link>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={prev} aria-label="Previous">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={skipNext} aria-label="Next">
          <SkipForward className="h-4 w-4" />
        </Button>
        <DropRepeatControl repeat={repeat} onChange={setRepeat} />
        <AudioVolumeControl
          compact
          volume={volume}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  );
}
