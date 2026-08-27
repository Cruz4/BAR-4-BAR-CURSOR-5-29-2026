'use client';

/**
 * Compact manage strip for live album + track DNA drops.
 * Used on The Scene, Vault, and Edit Public Page.
 */

import React, { useContext, useMemo, useState } from 'react';
import { Dna, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataContext } from '@/context/data-context';
import { hasActiveDnaDrop } from '@/lib/dna-drop';
import { dropPriceSummary, isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { cn } from '@/lib/utils';
import { dnaStatusOf, releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';
import { ReleaseCatalogDialog } from '@/components/vault/release-catalog';

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
  const { albums, loading } = useContext(DataContext);
  const [open, setOpen] = useState(false);

  const { total, saleCount, lyricPreviewCount } = useMemo(() => {
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

  if (loading) return null;

  return (
    <>
      <div
        className={cn(
          'grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-xl border px-3.5 py-3 text-left sm:flex sm:flex-wrap sm:gap-3',
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
        <span className="min-w-0 sm:flex-1">
          <span className="block font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
            Release Catalog
          </span>
          <span className="block text-xs leading-relaxed text-foreground/90">
            {total === 0
              ? 'No releases yet — create your first release or publish a lyric preview'
              : `${saleCount} release${saleCount === 1 ? '' : 's'} for sale · ${lyricPreviewCount} lyric preview${lyricPreviewCount === 1 ? '' : 's'}`}
          </span>
        </span>
        <span className="col-span-2 grid w-full grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:ml-auto sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full whitespace-nowrap bg-fuchsia-400 px-3 text-[10px] font-bold uppercase text-black hover:bg-fuchsia-300 sm:w-auto"
            onClick={() => openFirstDropLathe()}
          >
            New release
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full whitespace-nowrap px-3 text-[10px] font-bold uppercase sm:w-auto"
            onClick={() => setOpen(true)}
          >
            Release Catalog
          </Button>
        </span>
      </div>

      <ReleaseCatalogDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Alias for Vault / Edit Public Page — same manage strip. */
export const LiveDnaDropsManage = SceneLiveDropsStrip;
