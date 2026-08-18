'use client';

/**
 * Compact manage strip for live album + track DNA drops.
 * Used on The Scene, Vault, and Edit Public Page.
 */

import React, { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { CassetteTape, Disc3, Dna, ExternalLink, Music, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataContext } from '@/context/data-context';
import { hasActiveDnaDrop } from '@/lib/dna-drop';
import { dropPriceSummary, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { cn } from '@/lib/utils';

type ManagedAlbumDrop = {
  kind: 'album';
  shareId: string;
  title: string;
  trackCount: number;
  liveTrackCount: number;
  albumId: string;
};

type ManagedTrackDrop = {
  kind: 'track';
  shareId: string;
  title: string;
  albumTitle: string;
  albumId: string;
  trackId: string;
  fromAlbumHub: boolean;
  hasDropAudio: boolean;
  dropPriceSummary: string;
};

export function SceneLiveDropsStrip({ className }: { className?: string }) {
  const { albums, loading } = useContext(DataContext);
  const [open, setOpen] = useState(false);

  const { albumDrops, trackDrops, total, firstDropCount } = useMemo(() => {
    const albumsOut: ManagedAlbumDrop[] = [];
    const tracksOut: ManagedTrackDrop[] = [];
    const seenTracks = new Set<string>();

    for (const album of albums) {
      if (album.id === 'unassigned') continue;
      const albumLive = hasActiveDnaDrop(album.shareId);
      if (albumLive && album.shareId) {
        const tracks = album.tracks || [];
        albumsOut.push({
          kind: 'album',
          shareId: album.shareId,
          title: album.title || 'Untitled album',
          trackCount: tracks.length,
          liveTrackCount: tracks.filter((t) => hasActiveDnaDrop(t.shareId)).length,
          albumId: album.id,
        });
      }

      for (const track of album.tracks || []) {
        if (!hasActiveDnaDrop(track.shareId) || !track.shareId) continue;
        if (seenTracks.has(track.shareId)) continue;
        seenTracks.add(track.shareId);
        tracksOut.push({
          kind: 'track',
          shareId: track.shareId,
          title: track.title || 'Untitled track',
          albumTitle: album.title || 'Album',
          albumId: album.id,
          trackId: track.id,
          fromAlbumHub: albumLive,
          hasDropAudio: Boolean(normalizeDropAudio(track.dropAudio)),
          dropPriceSummary: dropPriceSummary(normalizeDropPrice(track.dropPrice)),
        });
      }
    }

    return {
      albumDrops: albumsOut,
      trackDrops: tracksOut,
      total: albumsOut.length + tracksOut.length,
      firstDropCount: tracksOut.filter((t) => t.hasDropAudio).length,
    };
  }, [albums]);

  if (loading) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
          firstDropCount > 0
            ? 'border-amber-400/45 bg-amber-500/10 hover:border-amber-300/60 hover:bg-amber-500/15'
            : 'border-border/60 bg-card/40 hover:border-primary/35 hover:bg-card/70',
          className
        )}
        data-tour="scene-live-drops"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            firstDropCount > 0
              ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
              : 'border-primary/25 bg-primary/10'
          )}
        >
          {firstDropCount > 0 ? <Music className="h-4 w-4" /> : <Dna className="h-3.5 w-3.5 text-primary" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
            {firstDropCount > 0 ? 'Your songs for sale' : 'Live drops'}
          </span>
          <span className="block truncate text-xs text-foreground/90">
            {total === 0
              ? 'None live — publish a track, then add the song + price'
              : firstDropCount > 0
                ? `${firstDropCount} on sale · visitors hear these first on your home`
                : `${albumDrops.length} album${albumDrops.length === 1 ? '' : 's'} · ${trackDrops.length} track${trackDrops.length === 1 ? '' : 's'} · no song for sale yet`}
          </span>
        </span>
        <span className="shrink-0 font-code text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
          Manage
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-4xl max-h-[min(82vh,860px)] flex-col gap-4 overflow-hidden sm:rounded-xl">
          <DialogHeader className="shrink-0 space-y-1.5 pr-8 text-left">
            <DialogTitle className="font-headline uppercase tracking-wide">
              Your live drops
            </DialogTitle>
            <DialogDescription>
              DNA Drops are the public lyric pages. First Drops are the song on those pages — upload audio
              and set a price on First Drops. Fans find them on your Artist Home and The Scene.
            </DialogDescription>
          </DialogHeader>

          {total === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nothing live yet. Tap Press a song on The Scene to upload a song and put it on
                sale. DNA Drop is only for sharing lyrics — not for selling.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-9 bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300"
                  onClick={() => {
                    setOpen(false);
                    openFirstDropLathe();
                  }}
                >
                  Press a song
                </Button>
                <Button size="sm" variant="outline" className="h-9 font-bold uppercase" asChild>
                  <Link href="/vault" onClick={() => setOpen(false)}>
                    Open vault
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
              {firstDropCount > 0 && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/90">
                    <Music className="h-3.5 w-3.5" /> First Drops · live
                  </p>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {trackDrops
                      .filter((d) => d.hasDropAudio)
                      .map((drop) => (
                        <li
                          key={`fd-${drop.shareId}`}
                          className="flex flex-col rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 p-3"
                        >
                          <p className="truncate text-sm font-bold">{drop.title}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {drop.dropPriceSummary || 'Song on this DNA Drop'}
                            {drop.fromAlbumHub ? ` · ${drop.albumTitle}` : ''}
                          </p>
                          <div className="mt-auto flex flex-wrap gap-2 pt-3">
                            <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold uppercase" asChild>
                              <Link href={`/share/${drop.shareId}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open drop
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[10px] font-bold uppercase"
                              onClick={() => {
                                setOpen(false);
                                openFirstDropLathe({ albumId: drop.albumId, trackId: drop.trackId });
                              }}
                            >
                              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Update press
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              )}

              {albumDrops.length > 0 && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-violet-300/90">
                    <Disc3 className="h-3.5 w-3.5" /> Album DNA
                  </p>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {albumDrops.map((drop) => (
                      <li
                        key={drop.shareId}
                        className="flex flex-col rounded-xl border border-violet-500/30 bg-violet-500/10 p-3"
                      >
                        <p className="truncate text-sm font-bold">{drop.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {drop.liveTrackCount}/{drop.trackCount} tracks live on album
                        </p>
                        <div className="mt-auto flex flex-wrap gap-2 pt-3">
                          <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold uppercase" asChild>
                            <Link href={`/share/${drop.shareId}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open album
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" asChild>
                            <Link href={`/albums/${drop.albumId}`} onClick={() => setOpen(false)}>
                              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Manage in vault
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-fuchsia-400 text-[10px] font-bold uppercase text-black hover:bg-fuchsia-300"
                            onClick={() => {
                              setOpen(false);
                              openFirstDropLathe({ albumId: drop.albumId });
                            }}
                          >
                            Press a track
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {trackDrops.some((d) => !d.hasDropAudio) && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-300/90">
                    <CassetteTape className="h-3.5 w-3.5" /> Track DNA · no song yet
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Lyrics are live. Press the song on First Drops to sell it — you do not go back through DNA Drop.
                  </p>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {trackDrops
                      .filter((d) => !d.hasDropAudio)
                      .map((drop) => (
                      <li
                        key={drop.shareId}
                        className="flex flex-col rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3"
                      >
                        <p className="truncate text-sm font-bold">{drop.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {drop.fromAlbumHub
                            ? `DNA only · also on album · ${drop.albumTitle}`
                            : `DNA only · from ${drop.albumTitle}`}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-2 pt-3">
                          <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold uppercase" asChild>
                            <Link href={`/share/${drop.shareId}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open drop
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-fuchsia-400 text-[10px] font-bold uppercase text-black hover:bg-fuchsia-300"
                            onClick={() => {
                              setOpen(false);
                              openFirstDropLathe({ albumId: drop.albumId, trackId: drop.trackId });
                            }}
                          >
                            <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Press this song
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Button size="sm" variant="ghost" className="w-full h-9 text-[10px] font-bold uppercase" asChild>
                <Link href="/profile/customize" onClick={() => setOpen(false)}>
                  Artist Home Drop Shelf settings
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Alias for Vault / Edit Public Page — same manage strip. */
export const LiveDnaDropsManage = SceneLiveDropsStrip;
