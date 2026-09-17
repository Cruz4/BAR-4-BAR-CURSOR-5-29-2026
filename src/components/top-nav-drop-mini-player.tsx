'use client';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import { Loader, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useOptionalDropPlayer } from '@/context/drop-player-context';
import { formatDeckTime } from '@/lib/drop-library';
import { Button } from '@/components/ui/button';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { measureSpectrumBand } from '@/lib/audio-spectrum';
import { DropRepeatControl } from '@/components/drop-repeat-control';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { LivingPressField } from '@/components/profile/living-press-field';
import { profileHref } from '@/lib/profile/profile-slug';
import { albumHubHref } from '@/lib/pressed-song';
import { useDropArtistChrome } from '@/hooks/use-drop-artist-chrome';

const MINI_EQ_BANDS = [
  { lowHz: 35, highHz: 130, gain: 0.72 },
  { lowHz: 130, highHz: 420, gain: 0.82 },
  { lowHz: 420, highHz: 1_600, gain: 0.92 },
  { lowHz: 1_600, highHz: 5_200, gain: 1.02 },
  { lowHz: 5_200, highHz: 13_000, gain: 1.12 },
] as const;

function clampMeter(value: number): number {
  return Math.max(0.12, Math.min(0.96, value));
}

function smoothMiniMeter(current: number, target: number): number {
  const speed = target > current ? 0.38 : 0.2;
  return current + (target - current) * speed;
}

function MiniDropEqualizer({ analyser, playing }: { analyser: AnalyserNode | null; playing: boolean }) {
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    let tick = 0;
    const smoothed = [0.18, 0.18, 0.18, 0.18, 0.18];
    const baseline = [0.18, 0.18, 0.18, 0.18, 0.18];
    const previous = [0.18, 0.18, 0.18, 0.18, 0.18];
    let calibrated = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const render = () => {
      tick += 0.12;
      if (analyser && bins) analyser.getByteFrequencyData(bins);

      let targets = [0.18, 0.18, 0.18, 0.18, 0.18];
      if (playing && reducedMotion) {
        targets = [0.42, 0.5, 0.58, 0.5, 0.42];
      } else if (playing && analyser && bins && bins.length > 0) {
        const levels = MINI_EQ_BANDS.map((band) => measureSpectrumBand(analyser, bins, band));
        if (!calibrated) {
          levels.forEach((level, index) => {
            baseline[index] = level;
            previous[index] = level;
          });
          calibrated = true;
        }
        targets = levels.map((level, index) => {
          const baselineSpeed = level < baseline[index] ? 0.045 : 0.012;
          baseline[index] += (level - baseline[index]) * baselineSpeed;
          const lift = Math.max(0, level - baseline[index]);
          const attack = Math.max(0, level - previous[index]);
          const release = Math.max(0, previous[index] - level);
          previous[index] = level;
          return clampMeter(0.12 + level * 0.42 + lift * 2.6 + attack * 3.2 - release * 0.8);
        });
      } else if (playing) {
        const edge = 0.3 + Math.abs(Math.sin(tick)) * 0.35;
        const inner = 0.36 + Math.abs(Math.sin(tick + 0.7)) * 0.42;
        const center = 0.44 + Math.abs(Math.sin(tick + 1.2)) * 0.48;
        targets = [edge, inner, center, inner, edge];
      }

      barRefs.current.forEach((bar, index) => {
        if (!bar) return;
        smoothed[index] = smoothMiniMeter(smoothed[index], targets[index]);
        bar.style.transform = `scaleY(${smoothed[index]})`;
      });

      if (playing && !reducedMotion) frame = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(frame);
  }, [analyser, playing]);

  return (
    <div
      className="flex h-7 w-10 shrink-0 items-center justify-center gap-[3px] sm:pointer-events-none sm:absolute sm:left-1/2 sm:-translate-x-1/2"
      role="img"
      aria-label={playing ? 'Audio levels moving with the current song' : 'Audio levels paused'}
      title={playing ? 'Now playing' : 'Playback paused'}
    >
      {[13, 21, 27, 21, 13].map((height, index) => (
        <span
          key={height + index}
          ref={(element) => {
            barRefs.current[index] = element;
          }}
          className="w-[3px] origin-center rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.32)]"
          style={{ height, transform: 'scaleY(0.18)' }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function TopNavDropMiniPlayer() {
  const player = useOptionalDropPlayer();
  const currentShareId = player?.current?.shareId;
  const currentTrackId = player?.current?.trackId;
  const coverArtUrl = player?.current?.coverArtUrl;
  const { chrome, pressingStyle } = useDropArtistChrome(currentShareId, currentTrackId);

  if (!player?.current) return null;

  const {
    current,
    playing,
    loading,
    elapsed,
    duration,
    volume,
    repeat,
    analyser,
    togglePlay,
    skipNext,
    prev,
    seek,
    stop,
    setVolume,
    setRepeat,
    toggleMute,
  } = player;

  const artistHref = profileHref(chrome?.slug);
  const avatarUrl = chrome?.useStarMark ? chrome.avatarUrl : (chrome?.avatarUrl || coverArtUrl);
  const albumTitle = current.albumTitle || chrome?.albumTitle;
  const albumHref = current.albumHref || albumHubHref(chrome?.albumShareId);

  return (
    <div
      className="relative overflow-hidden border-t border-white/10"
      style={{
        ...(pressingStyle as React.CSSProperties | undefined),
        backgroundColor: chrome?.pressing ? 'var(--ph-bg)' : undefined,
      }}
    >
      {chrome?.pressing ? (
        <LivingPressField config={chrome.pressing} compact className="[&>p]:hidden" />
      ) : (
        <div className="absolute inset-0 bg-background/95" aria-hidden />
      )}
      <div className="absolute inset-0 bg-black/35" aria-hidden />
      <div className="relative z-10 px-2 sm:px-4 md:px-6">
        <div className="relative mx-auto w-full max-w-6xl py-1">
          <div className="flex min-h-9 items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[calc(50%-28px)]">
              <ArtistStarAvatar
                name={current.artistName}
                avatarUrl={avatarUrl}
                useStarMark={chrome?.useStarMark}
                starMarkSeed={chrome?.starMarkSeed}
                studioChrome={chrome?.studioChrome}
                href={artistHref}
                size={22}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1 rounded-md px-0.5">
                <Link
                  href={current.detailsHref}
                  className="block min-w-0 hover:bg-white/5"
                  aria-label={`Open ${current.title}`}
                >
                  <span className="block truncate font-headline text-[13px] font-bold uppercase leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                    {current.title}
                  </span>
                  <span className="mt-0.5 block truncate font-code text-[11px] uppercase leading-none text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
                    {current.artistName}
                    {duration > 0 ? ` · ${formatDeckTime(elapsed)} / ${formatDeckTime(duration)}` : ''}
                  </span>
                </Link>
                {albumTitle && albumHref ? (
                  <Link
                    href={albumHref}
                    className="mt-0.5 block truncate font-code text-[10px] leading-none text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] hover:text-white hover:underline"
                  >
                    {albumTitle}
                  </Link>
                ) : null}
              </div>
            </div>
            <MiniDropEqualizer analyser={analyser} playing={playing} />
            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-white hover:bg-white/10" onClick={prev} aria-label="Previous">
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
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-white hover:bg-white/10" onClick={skipNext} aria-label="Next">
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
              <span className="hidden sm:inline-flex"><DropRepeatControl repeat={repeat} onChange={setRepeat} compact className="text-white" /></span>
              <span className="hidden sm:inline-flex"><AudioVolumeControl compact className="text-white" volume={volume} onVolumeChange={setVolume} onToggleMute={toggleMute} /></span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 rounded-full text-white/40 hover:bg-white/10 hover:text-white/70"
                onClick={stop}
                aria-label="Close mini player"
                title="Close mini player"
              >
                <X className="h-3 w-3 stroke-[1.75]" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-1.5 pb-0.5">
            <span className="w-8 text-right font-code text-[8px] tabular-nums text-white/75">{formatDeckTime(elapsed)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              value={Math.min(elapsed, Math.max(duration, 1))}
              onChange={(event) => seek(Number(event.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--ph-accent,#e879f9)]"
              aria-label="Mini player playback position"
            />
            <span className="w-8 font-code text-[8px] tabular-nums text-white/75">{formatDeckTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
