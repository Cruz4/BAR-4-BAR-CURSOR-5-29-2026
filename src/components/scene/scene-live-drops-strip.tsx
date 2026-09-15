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
          'flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 sm:items-center sm:gap-3 sm:px-3.5 sm:py-3',
          saleCount > 0
            ? 'border-amber-400/45 bg-amber-500/10'
            : 'border-border/60 bg-card/40',
          className
        )}
        data-tour="scene-live-drops"
      >
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:mt-0 sm:h-9 sm:w-9',
            saleCount > 0
              ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
              : 'border-primary/25 bg-primary/10'
          )}
        >
          {saleCount > 0 ? <Music className="h-4 w-4" /> : <Dna className="h-3.5 w-3.5 text-primary" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 sm:text-[10px]">
            Release Catalog
          </span>
          <span className="block text-xs leading-snug text-foreground/90 sm:text-sm sm:leading-relaxed">
            {total === 0
              ? 'Nothing live yet. New release = music (free). Lyrics DNA Drop = share lyrics from The Vault (Pro).'
              : `${saleCount} for sale · ${lyricPreviewCount} Lyrics DNA Drop${lyricPreviewCount === 1 ? '' : 's'}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-8 whitespace-nowrap bg-fuchsia-400 px-2.5 text-[10px] font-bold uppercase text-black hover:bg-fuchsia-300 sm:h-9 sm:px-3 sm:text-xs sm:w-auto"
            onClick={() => openFirstDropLathe()}
          >
            New release
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 whitespace-nowrap px-2.5 text-[10px] font-bold uppercase sm:h-9 sm:px-3 sm:text-xs sm:w-auto"
            onClick={() => setOpen(true)}
          >
            Catalog
          </Button>
        </span>
      </div>

      <ReleaseCatalogDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Alias for Vault / Edit Public Page — same manage strip. */
export const LiveDnaDropsManage = SceneLiveDropsStrip;
