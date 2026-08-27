'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { Loader, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { DropRepeatControl } from '@/components/drop-repeat-control';
import { Button } from '@/components/ui/button';
import { useDropPlayer } from '@/context/drop-player-context';
import { orderAlbumTracks } from '@/lib/album-track-order';
import { normalizeDropAudio, type DropPrice } from '@/lib/drop-commerce';
import type { DnaDropAlbumPayload } from '@/lib/dna-drop';
import { formatDeckTime, type DeckPlayable } from '@/lib/drop-library';
import { pressedSongHref } from '@/lib/pressed-song';
import { cn } from '@/lib/utils';

type AlbumReleasePlaylistProps = {
  album: DnaDropAlbumPayload;
  shareId: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
};

export function AlbumReleasePlaylist({
  album,
  shareId,
  ownerId,
  ownerName,
  houseRelease = false,
}: AlbumReleasePlaylistProps) {
  const player = useDropPlayer();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const playables = useMemo<DeckPlayable[]>(() =>
    orderAlbumTracks(album.tracks || [], album)
      .filter((track) => Boolean(normalizeDropAudio(track.dropAudio)))
      .map((track, index) => ({
        key: `${shareId}:${track.id}`,
        shareId,
        trackId: track.id,
        title: track.title || `Track ${index + 1}`,
        artistName: ownerName,
        coverArtUrl: track.coverArtUrl || album.coverArtUrl,
        durationSec: normalizeDropAudio(track.dropAudio)?.durationSec,
        scope: 'album',
        albumTitle: album.title,
        albumId: album.id,
        trackNumber: index + 1,
        detailsHref: pressedSongHref(shareId, { trackId: track.id }),
        purchasedAt: '',
        amountCents: 0,
        free: houseRelease,
        houseRelease,
        ownerId,
        listenSource: 'share',
      })),
    [album, houseRelease, ownerId, ownerName, shareId]
  );
  const activeIndex = playables.findIndex((item) => item.key === player.current?.key);
  const activeInAlbum = activeIndex >= 0;
  const shownIndex = activeInAlbum ? activeIndex : Math.min(selectedIndex, Math.max(0, playables.length - 1));
  const shown = playables[shownIndex];

  useEffect(() => {
    if (activeIndex >= 0) setSelectedIndex(activeIndex);
  }, [activeIndex]);

  const playTrack = (index: number) => {
    const item = playables[index];
    if (!item) return;
    setSelectedIndex(index);
    player.setQueue(playables);
    if (player.current?.key === item.key) player.togglePlay();
    else void player.loadAndPlay(item);
  };

  if (!playables.length || !shown) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-[linear-gradient(145deg,rgba(37,12,50,0.9),rgba(5,10,24,0.96))] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="space-y-3 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
              {houseRelease ? 'House album · full playlist' : 'Album release · ordered playlist'}
            </p>
            <Link href={shown.detailsHref} className="mt-1 block truncate font-headline text-lg font-bold uppercase hover:text-fuchsia-200 hover:underline">
              {shown.title}
            </Link>
            <p className="truncate font-code text-[9px] uppercase text-muted-foreground">
              {shown.trackNumber} of {playables.length} · {album.title}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            onClick={() => playTrack(shownIndex)}
            aria-label={activeInAlbum && player.playing ? 'Pause album' : 'Play album'}
          >
            {activeInAlbum && player.loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : activeInAlbum && player.playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => activeInAlbum ? player.prev() : playTrack(Math.max(0, shownIndex - 1))}
            aria-label="Previous album track"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <span className="w-9 shrink-0 text-right font-code text-[9px] tabular-nums text-muted-foreground">
            {activeInAlbum ? formatDeckTime(player.elapsed) : '0:00'}
          </span>
          <input
            type="range"
            min={0}
            max={activeInAlbum ? Math.max(player.duration, 1) : Math.max(shown.durationSec || 1, 1)}
            step={0.1}
            value={activeInAlbum ? Math.min(player.elapsed, Math.max(player.duration, 1)) : 0}
            disabled={!activeInAlbum}
            onChange={(event) => player.seek(Number(event.target.value))}
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Album playback position"
          />
          <span className="w-9 shrink-0 font-code text-[9px] tabular-nums text-muted-foreground">
            {formatDeckTime(activeInAlbum ? player.duration : shown.durationSec || 0)}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => activeInAlbum ? player.skipNext() : playTrack(Math.min(playables.length - 1, shownIndex + 1))}
            aria-label="Next album track"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          <DropRepeatControl repeat={player.repeat} onChange={player.setRepeat} compact />
          <AudioVolumeControl
            compact
            volume={player.volume}
            onVolumeChange={player.setVolume}
            onToggleMute={player.toggleMute}
          />
        </div>
      </div>

      <ol className="max-h-64 overflow-y-auto border-t border-white/10 bg-black/25 p-2">
        {playables.map((item, index) => {
          const active = player.current?.key === item.key;
          return (
            <li key={item.key} className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/[0.04]">
              <button
                type="button"
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                  active
                    ? 'border-fuchsia-300 bg-fuchsia-400 text-black'
                    : 'border-white/15 bg-black/30 text-white hover:border-fuchsia-300/60'
                )}
                onClick={() => playTrack(index)}
                aria-label={`${active && player.playing ? 'Pause' : 'Play'} ${item.title}`}
              >
                {active && player.loading ? <Loader className="h-3 w-3 animate-spin" /> : active && player.playing ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" />}
              </button>
              <span className="w-5 shrink-0 text-right font-code text-[9px] tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link href={item.detailsHref} className="min-w-0 flex-1 truncate text-xs font-bold hover:text-fuchsia-200 hover:underline">
                {item.title}
              </Link>
              <span className="shrink-0 font-code text-[9px] tabular-nums text-muted-foreground">
                {item.durationSec ? formatDeckTime(item.durationSec) : ''}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-white/10 p-3">
        <DropListenPanel
          shareId={shareId}
          title={album.title || 'Album'}
          artistName={ownerName}
          ownerId={ownerId}
          price={album.dropPrice as DropPrice | undefined}
          hasAudio
          houseRelease={houseRelease}
          source="share"
          presentation="compact"
          detailsHref={`/share/${shareId}`}
          checkoutDestination="share"
          purchaseOnly
        />
      </div>
    </section>
  );
}
