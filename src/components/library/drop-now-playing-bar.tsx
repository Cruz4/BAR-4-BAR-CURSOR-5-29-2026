'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useOptionalDropPlayer } from '@/context/drop-player-context';
import { formatDeckTime } from '@/lib/drop-library';
import { Button } from '@/components/ui/button';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { cn } from '@/lib/utils';
import { DropRepeatControl } from '@/components/drop-repeat-control';
import { LivingPressField } from '@/components/profile/living-press-field';
import { albumHubHref } from '@/lib/pressed-song';
import { useDropArtistChrome } from '@/hooks/use-drop-artist-chrome';

export function shouldHideDropNowPlayingBar(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname === '/library' ||
    pathname === '/login' ||
    pathname === '/welcome' ||
    pathname.endsWith('/perform') ||
    pathname.startsWith('/marketing/')
  );
}

export function DropNowPlayingBar() {
  const player = useOptionalDropPlayer();
  const pathname = usePathname();
  const currentShareId = player?.current?.shareId;
  const { chrome, pressingStyle } = useDropArtistChrome(currentShareId, player?.current?.trackId);

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
  const playerImageUrl = chrome?.avatarUrl || current.coverArtUrl;
  const albumTitle = current.albumTitle || chrome?.albumTitle;
  const albumHref = current.albumHref || albumHubHref(chrome?.albumShareId);
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
      <div
        className="pointer-events-auto relative mx-auto flex max-w-lg overflow-hidden rounded-2xl border border-[var(--ph-border,rgba(232,121,249,.3))] bg-black/50 px-2.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
        style={pressingStyle as React.CSSProperties | undefined}
      >
        {chrome?.pressing ? (
          <>
            <LivingPressField config={chrome.pressing} compact className="[&>p]:hidden" />
            <div className="absolute inset-0 bg-black/45" aria-hidden />
          </>
        ) : null}
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-0.5">
          <Link href="/library" className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black hover:bg-white/5">
            {playerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playerImageUrl}
                alt={`${current.artistName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-headline text-sm font-bold text-white">
                {current.artistName.trim().charAt(0).toUpperCase() || 'B'}
              </span>
            )}
          </Link>
          <span className="min-w-0 flex-1">
            <Link href={current.detailsHref || '/library'} className="block truncate font-headline text-sm font-bold uppercase leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,.7)] hover:underline">
              {current.title}
            </Link>
            <span className="block truncate font-code text-[10px] uppercase text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">
              {current.artistName}
              {duration > 0 ? ` · ${formatDeckTime(elapsed)} / ${formatDeckTime(duration)}` : ''}
            </span>
            {albumTitle && albumHref ? (
              <Link
                href={albumHref}
                className="block truncate font-code text-[10px] text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,.7)] hover:text-white hover:underline"
              >
                {albumTitle}
              </Link>
            ) : null}
          </span>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-white hover:bg-white/10" onClick={prev} aria-label="Previous">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full bg-[var(--ph-accent,#e879f9)] text-black hover:brightness-110"
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
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-white hover:bg-white/10" onClick={skipNext} aria-label="Next">
          <SkipForward className="h-4 w-4" />
        </Button>
        <DropRepeatControl repeat={repeat} onChange={setRepeat} className="text-white" />
        <AudioVolumeControl
          compact
          className="text-white"
          volume={volume}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
        />
        </div>
      </div>
    </div>
  );
}
