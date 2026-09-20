'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { Loader, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { DropRepeatControl } from '@/components/drop-repeat-control';
import { Button } from '@/components/ui/button';
import { DropTransportButton } from '@/components/drop-transport-button';
import { useDropPlayer } from '@/context/drop-player-context';
import { ShareArtistLink } from '@/components/share-artist-link';
import { buildAlbumReleasePlayables } from '@/lib/album-release-playables';
import type { DropPrice } from '@/lib/drop-commerce';
import type { DnaDropAlbumPayload, DnaDropTrackPayload } from '@/lib/dna-drop';
import { normalizeDropPrice } from '@/lib/drop-commerce';
import { formatDeckTime, type DeckPlayable } from '@/lib/drop-library';
import { albumHubHref } from '@/lib/pressed-song';
import { cn } from '@/lib/utils';

type AlbumReleasePlaylistProps = {
  album?: DnaDropAlbumPayload;
  /** Pre-built queue (e.g. from /api/songs album scope). */
  playables?: DeckPlayable[];
  shareId: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
  albumTitle?: string;
  artistName?: string;
  artistSlug?: string | null;
  /** Public album release hub (`/share/…`). */
  albumHref?: string;
  /** Select this track in the queue on load (DNA strand / song page). */
  initialTrackId?: string;
  /** Full album queue vs one track only (lyric DNA strand / single song). */
  queueScope?: 'album' | 'single';
  /** Track payload for single-scope buy/stream chrome. */
  singleTrack?: DnaDropTrackPayload;
};

export function AlbumReleasePlaylist({
  album,
  playables: playablesProp,
  shareId,
  ownerId,
  ownerName,
  houseRelease = false,
  albumTitle,
  artistName: artistNameProp,
  artistSlug,
  albumHref: albumHrefProp,
  initialTrackId,
  queueScope = 'album',
  singleTrack,
}: AlbumReleasePlaylistProps) {
  const player = useDropPlayer();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resolvedAlbumTitle = albumTitle || album?.title || 'Album';
  const creditedArtist = artistNameProp?.trim() || ownerName;
  const playables = useMemo<DeckPlayable[]>(() => {
    if (playablesProp?.length) return playablesProp;
    if (!album) return [];
    return buildAlbumReleasePlayables({
      album,
      shareId,
      ownerId,
      ownerName,
      houseRelease,
      listenSource: 'share',
    });
  }, [album, houseRelease, ownerId, ownerName, playablesProp, shareId]);
  const resolvedAlbumHref =
    albumHrefProp?.trim() ||
    playables.find((item) => item.albumHref)?.albumHref ||
    albumHubHref(shareId);
  const activeIndex = playables.findIndex((item) => item.key === player.current?.key);
  const activeInAlbum = activeIndex >= 0;
  const shownIndex = activeInAlbum ? activeIndex : Math.min(selectedIndex, Math.max(0, playables.length - 1));
  const shown = playables[shownIndex];

  useEffect(() => {
    if (activeIndex >= 0) setSelectedIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (!initialTrackId || !playables.length) return;
    const idx = playables.findIndex((item) => item.trackId === initialTrackId);
    if (idx >= 0) setSelectedIndex(idx);
  }, [initialTrackId, playables]);

  const playTrack = (index: number) => {
    const item = playables[index];
    if (!item) return;
    setSelectedIndex(index);
    player.setQueue(playables);
    if (player.current?.key === item.key) player.togglePlay();
    else void player.loadAndPlay(item);
  };

  if (!playables.length || !shown) return null;

  const isSingleQueue = queueScope === 'single' || playables.length === 1;
  const kicker = isSingleQueue
    ? houseRelease
      ? 'House release · this track'
      : 'Release audio · this strand'
    : houseRelease
      ? 'House album · full playlist'
      : 'Album release · ordered playlist';

  const albumPlaying = Boolean(activeInAlbum && player.playing);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-[linear-gradient(145deg,rgba(37,12,50,0.9),rgba(5,10,24,0.96))] shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-shadow duration-300',
        albumPlaying && 'border-fuchsia-300/55 shadow-[0_0_32px_rgba(217,70,239,0.18)]'
      )}
    >
      <div className="space-y-3 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
              {kicker}
            </p>
            <Link href={shown.detailsHref} className="mt-1 block truncate font-headline text-lg font-bold uppercase hover:text-fuchsia-200 hover:underline">
              {shown.title}
            </Link>
            <p className="truncate font-code text-[9px] uppercase text-muted-foreground">
              {isSingleQueue ? (
                resolvedAlbumTitle && resolvedAlbumTitle !== 'Album' ? (
                  <>
                    <span className="text-muted-foreground/80">From </span>
                    {resolvedAlbumHref ? (
                      <Link
                        href={resolvedAlbumHref}
                        className="font-bold text-fuchsia-200/90 transition-colors hover:text-fuchsia-100 hover:underline underline-offset-2"
                      >
                        {resolvedAlbumTitle}
                      </Link>
                    ) : (
                      resolvedAlbumTitle
                    )}
                  </>
                ) : (
                  'Single track'
                )
              ) : (
                <>
                  {shown.trackNumber} of {playables.length} ·{' '}
                  {resolvedAlbumHref ? (
                    <Link
                      href={resolvedAlbumHref}
                      className="font-bold text-fuchsia-200/90 transition-colors hover:text-fuchsia-100 hover:underline underline-offset-2"
                    >
                      {resolvedAlbumTitle}
                    </Link>
                  ) : (
                    resolvedAlbumTitle
                  )}
                </>
              )}
            </p>
            <ShareArtistLink
              name={creditedArtist}
              slug={artistSlug}
              className="mt-1.5"
              size="sm"
            />
          </div>
          <DropTransportButton
            playing={Boolean(activeInAlbum && player.playing)}
            loading={Boolean(activeInAlbum && player.loading)}
            size="md"
            onClick={() => playTrack(shownIndex)}
            aria-label={activeInAlbum && player.playing ? 'Pause album' : 'Play album'}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {!isSingleQueue ? (
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
          ) : null}
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
          {!isSingleQueue ? (
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
          ) : null}
          <DropRepeatControl repeat={player.repeat} onChange={player.setRepeat} compact />
          <AudioVolumeControl
            compact
            volume={player.volume}
            onVolumeChange={player.setVolume}
            onToggleMute={player.toggleMute}
          />
        </div>
      </div>

      {!isSingleQueue ? (
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
              <div className="min-w-0 flex-1">
                <Link href={item.detailsHref} className="block truncate text-xs font-bold hover:text-fuchsia-200 hover:underline">
                  {item.title}
                </Link>
                <ShareArtistLink
                  name={creditedArtist}
                  slug={artistSlug}
                  showLabel={false}
                  size="sm"
                  className="text-muted-foreground/90"
                />
              </div>
              <span className="shrink-0 font-code text-[9px] tabular-nums text-muted-foreground">
                {item.durationSec ? formatDeckTime(item.durationSec) : ''}
              </span>
            </li>
          );
        })}
      </ol>
      ) : null}

      <div className="border-t border-white/10 p-3">
        <DropListenPanel
          shareId={shareId}
          title={isSingleQueue ? shown.title : resolvedAlbumTitle}
          artistName={creditedArtist}
          ownerId={ownerId}
          price={
            (isSingleQueue
              ? normalizeDropPrice(singleTrack?.dropPrice)
              : album?.dropPrice) as DropPrice | undefined
          }
          hasAudio
          houseRelease={houseRelease}
          source="share"
          presentation="compact"
          detailsHref={shown.detailsHref}
          checkoutDestination={isSingleQueue ? 'song' : 'share'}
          trackId={isSingleQueue ? shown.trackId : undefined}
          purchaseOnly
        />
      </div>
    </section>
  );
}
