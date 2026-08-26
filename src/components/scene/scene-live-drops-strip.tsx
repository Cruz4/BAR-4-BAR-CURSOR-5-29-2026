'use client';

/**
 * Compact manage strip for live album + track DNA drops.
 * Used on The Scene, Vault, and Edit Public Page.
 */

import React, { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { CassetteTape, Disc3, Dna, ExternalLink, Loader, Music, Settings2, Unlink } from 'lucide-react';
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
import { dropPriceSummary, isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { cn } from '@/lib/utils';
import { dnaStatusOf, releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';
import { manageRelease } from '@/lib/release-management-client';
import { useToast } from '@/hooks/use-toast';

type ManagedAlbumDrop = {
  kind: 'album';
  shareId: string;
  title: string;
  trackCount: number;
  liveTrackCount: number;
  albumId: string;
  audioTrackCount: number;
  isForSale: boolean;
  dropPriceSummary: string;
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
  const { albums, loading, updateAlbum, updateTrack, flushCloudNow } = useContext(DataContext);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const { albumDrops, trackDrops, total, saleCount, lyricPreviewCount } = useMemo(() => {
    const albumsOut: ManagedAlbumDrop[] = [];
    const tracksOut: ManagedTrackDrop[] = [];
    const seenTracks = new Set<string>();

    for (const album of albums) {
      if (album.id === 'unassigned') continue;
      const albumDnaLive = hasActiveDnaDrop(album.shareId) && dnaStatusOf(album) === 'live';
      const albumReleaseId = releaseShareIdOf({ ...album, tracks: album.tracks });
      const albumReleaseLive = releaseStatusOf({ ...album, tracks: album.tracks }) === 'live';
      if (albumReleaseLive && albumReleaseId) {
        const tracks = album.tracks || [];
        const audioTrackCount = tracks.filter((track) => normalizeDropAudio(track.dropAudio)).length;
        const albumPrice = normalizeDropPrice(album.dropPrice);
        albumsOut.push({
          kind: 'album',
          shareId: albumReleaseId,
          title: album.title || 'Untitled album',
          trackCount: tracks.length,
          liveTrackCount: tracks.filter((t) => hasActiveDnaDrop(t.shareId)).length,
          albumId: album.id,
          audioTrackCount,
          isForSale: audioTrackCount > 0 && isCommerceLive(albumPrice),
          dropPriceSummary: dropPriceSummary(albumPrice),
        });
      }
      if (albumDnaLive && album.shareId && album.shareId !== albumReleaseId) {
        const tracks = album.tracks || [];
        albumsOut.push({
          kind: 'album', shareId: album.shareId, title: album.title || 'Untitled album',
          trackCount: tracks.length, liveTrackCount: tracks.filter((t) => hasActiveDnaDrop(t.shareId)).length,
          albumId: album.id, audioTrackCount: 0, isForSale: false, dropPriceSummary: '',
        });
      }

      for (const track of album.tracks || []) {
        const releaseId = releaseShareIdOf(track);
        const releaseLive = releaseStatusOf(track) === 'live';
        const dnaLive = hasActiveDnaDrop(track.shareId) && dnaStatusOf(track) === 'live';
        const pushTrack = (publicId: string, hasDropAudio: boolean) => {
          if (seenTracks.has(publicId)) return;
          seenTracks.add(publicId);
          tracksOut.push({
            kind: 'track', shareId: publicId, title: track.title || 'Untitled track',
            albumTitle: album.title || 'Album', albumId: album.id, trackId: track.id,
            fromAlbumHub: albumDnaLive, hasDropAudio,
            dropPriceSummary: dropPriceSummary(normalizeDropPrice(track.dropPrice)),
          });
        };
        if (releaseLive && releaseId) pushTrack(releaseId, Boolean(normalizeDropAudio(track.dropAudio)));
        if (dnaLive && track.shareId && track.shareId !== releaseId) pushTrack(track.shareId, false);
      }
    }

    return {
      albumDrops: albumsOut,
      trackDrops: tracksOut,
      total: albumsOut.length + tracksOut.length,
      saleCount:
        tracksOut.filter((track) => track.hasDropAudio).length +
        albumsOut.filter((album) => album.isForSale).length,
      lyricPreviewCount:
        albumsOut.filter((album) => !album.isForSale).length +
        tracksOut.filter((track) => !track.hasDropAudio).length,
    };
  }, [albums]);

  const unpressRelease = async (drop: ManagedTrackDrop | ManagedAlbumDrop) => {
    if (!window.confirm(`Unpress “${drop.title}”? It will leave discovery and checkout, while existing buyers keep access.`)) return;
    const key = `${drop.kind}:${drop.shareId}`;
    setBusy(key);
    try {
      await flushCloudNow();
      const result = await manageRelease({
        kind: drop.kind,
        action: 'unpublish',
        albumId: drop.albumId,
        ...(drop.kind === 'track' ? { trackId: drop.trackId } : {}),
      });
      if (drop.kind === 'track') updateTrack(drop.albumId, drop.trackId, { releaseStatus: 'unlisted', ...(result.releaseShareId ? { releaseShareId: result.releaseShareId } : {}) });
      else updateAlbum(drop.albumId, { releaseStatus: 'unlisted', ...(result.releaseShareId ? { releaseShareId: result.releaseShareId } : {}) });
      toast({ title: 'Release unpressed', description: 'The paid release is hidden. Its DNA lyric page, if any, stays live.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not unpress', description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy('');
    }
  };

  if (loading) return null;

  return (
    <>
      <div
        className={cn(
          'flex w-full flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 text-left',
          saleCount > 0
            ? 'border-amber-400/45 bg-amber-500/10'
            : 'border-border/60 bg-card/40',
          className
        )}
        data-tour="scene-live-drops"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            saleCount > 0
              ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
              : 'border-primary/25 bg-primary/10'
          )}
        >
          {saleCount > 0 ? <Music className="h-4 w-4" /> : <Dna className="h-3.5 w-3.5 text-primary" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
            Your releases
          </span>
          <span className="block text-xs leading-relaxed text-foreground/90">
            {total === 0
              ? 'No releases yet — press your first song or publish a lyric preview'
              : `${saleCount} release${saleCount === 1 ? '' : 's'} for sale · ${lyricPreviewCount} lyric preview${lyricPreviewCount === 1 ? '' : 's'}`}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 bg-fuchsia-400 px-3 text-[10px] font-bold uppercase text-black hover:bg-fuchsia-300"
            onClick={() => openFirstDropLathe()}
          >
            Press a song
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-3 text-[10px] font-bold uppercase"
            onClick={() => setOpen(true)}
          >
            Manage releases
          </Button>
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-4xl max-h-[min(82vh,860px)] flex-col gap-4 overflow-hidden sm:rounded-xl">
          <DialogHeader className="shrink-0 space-y-1.5 pr-8 text-left">
            <DialogTitle className="font-headline uppercase tracking-wide">
              Your releases
            </DialogTitle>
            <DialogDescription>
              Songs for Sale contain uploaded audio and a price. Lyric Previews are public DNA pages for
              sharing words and creative identity; they are not songs for sale.
            </DialogDescription>
          </DialogHeader>

          {total === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nothing released yet. Press a song to upload audio, choose a preview, and set a price,
                or open The Vault to publish a lyric preview.
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
              {trackDrops.some((drop) => drop.hasDropAudio) && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/90">
                    <Music className="h-3.5 w-3.5" /> Songs for sale
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Finished audio that listeners can preview, buy once, and stream in Bar4Bar.
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
                              <Link href={`/song/${drop.shareId}`} target="_blank" rel="noreferrer">
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-400/30 text-[10px] font-bold uppercase text-red-300"
                              disabled={busy === `track:${drop.shareId}`}
                              onClick={() => void unpressRelease(drop)}
                            >
                              {busy === `track:${drop.shareId}` ? <Loader className="mr-1 h-3 w-3 animate-spin" /> : <Unlink className="mr-1 h-3 w-3" />}
                              Unpress
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              )}

              {albumDrops.some((drop) => drop.isForSale) && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/90">
                    <Disc3 className="h-3.5 w-3.5" /> Albums for sale
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    One bundle price unlocks every included recording. Album and single-song sales are recorded separately in Earnings.
                  </p>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {albumDrops.filter((drop) => drop.isForSale).map((drop) => (
                      <li key={`album-sale-${drop.shareId}`} className="flex flex-col rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 p-3">
                        <p className="truncate text-sm font-bold">{drop.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {drop.audioTrackCount} audio track{drop.audioTrackCount === 1 ? '' : 's'} · {drop.dropPriceSummary}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-2 pt-3">
                          <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold uppercase" asChild>
                            <Link href={`/share/${drop.shareId}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open album
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[10px] font-bold uppercase"
                            onClick={() => {
                              setOpen(false);
                              openFirstDropLathe({ albumId: drop.albumId, mode: 'album' });
                            }}
                          >
                            <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Update album
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-red-400/30 text-[10px] font-bold uppercase text-red-300"
                            disabled={busy === `album:${drop.shareId}`}
                            onClick={() => void unpressRelease(drop)}
                          >
                            {busy === `album:${drop.shareId}` ? <Loader className="mr-1 h-3 w-3 animate-spin" /> : <Unlink className="mr-1 h-3 w-3" />}
                            Unpress
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {albumDrops.some((drop) => !drop.isForSale) && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-violet-300/90">
                    <Disc3 className="h-3.5 w-3.5" /> Lyric previews · albums
                  </p>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {albumDrops.filter((drop) => !drop.isForSale).map((drop) => (
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
                              openFirstDropLathe({ albumId: drop.albumId, mode: 'album' });
                            }}
                          >
                            Press album
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
                    <CassetteTape className="h-3.5 w-3.5" /> Lyric previews · tracks
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    These public DNA pages share lyrics and identity. To sell finished audio, press the song separately.
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
                <Link href="/profile/customize#artist-home-releases" onClick={() => setOpen(false)}>
                  Edit Releases on Artist Home
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
