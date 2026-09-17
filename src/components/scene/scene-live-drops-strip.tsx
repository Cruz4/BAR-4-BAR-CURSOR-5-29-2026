'use client';

/**
 * Compact manage strip for live album + track DNA drops.
 * Used on The Scene, Vault, and Edit Public Page.
 */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Dna, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataContext } from '@/context/data-context';
import { hasActiveDnaDrop } from '@/lib/dna-drop';
import { dropPriceSummary, isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { cn } from '@/lib/utils';
import {
  dnaStatusOf,
  findVaultReleaseByShareId,
  releaseShareIdOf,
  releaseStatusOf,
} from '@/lib/release-management';
import { ReleaseCatalogDialog } from '@/components/vault/release-catalog';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import type { LinkedHouseRelease } from '@/lib/house-artist-link';

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
  houseLinked?: boolean;
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
  houseLinked?: boolean;
};

export function SceneLiveDropsStrip({ className }: { className?: string }) {
  const { albums, loading } = useContext(DataContext);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [linkedHouse, setLinkedHouse] = useState<LinkedHouseRelease[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setLinkedHouse([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const current = auth.currentUser;
        if (!current || current.uid !== user.id) return;
        const token = await current.getIdToken();
        const houseRes = await fetch(`/api/profile/house-releases?userId=${encodeURIComponent(user.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await houseRes.json().catch(() => ({}))) as { releases?: LinkedHouseRelease[] };
        if (cancelled) return;
        setLinkedHouse(houseRes.ok && Array.isArray(data.releases) ? data.releases : []);
      } catch {
        if (!cancelled) setLinkedHouse([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const { total, saleCount, lyricPreviewCount, houseLinkedCount, dnaLiveCount, musicLiveCount } = useMemo(() => {
    const albumsOut: ManagedAlbumDrop[] = [];
    const tracksOut: ManagedTrackDrop[] = [];
    const seenTracks = new Set<string>();
    const seenAlbumHubs = new Set<string>();

    for (const album of albums) {
      if (album.id === 'unassigned') continue;
      const albumDnaLive = hasActiveDnaDrop(album.shareId) && dnaStatusOf(album) === 'live';
      const albumReleaseId = releaseShareIdOf({ ...album, tracks: album.tracks });
      const albumReleaseLive = releaseStatusOf({ ...album, tracks: album.tracks }) === 'live';
      if (albumReleaseLive && albumReleaseId) {
        const tracks = album.tracks || [];
        const audioTrackCount = tracks.filter((track) => normalizeDropAudio(track.dropAudio)).length;
        const albumPrice = normalizeDropPrice(album.dropPrice);
        seenAlbumHubs.add(albumReleaseId);
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
        if (!seenAlbumHubs.has(album.shareId)) {
          seenAlbumHubs.add(album.shareId);
          albumsOut.push({
            kind: 'album', shareId: album.shareId, title: album.title || 'Untitled album',
            trackCount: tracks.length, liveTrackCount: tracks.filter((t) => hasActiveDnaDrop(t.shareId)).length,
            albumId: album.id, audioTrackCount: 0, isForSale: false, dropPriceSummary: '',
          });
        }
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

    let houseLinkedCount = 0;
    let extraDna = 0;
    for (const item of linkedHouse) {
      const vault = findVaultReleaseByShareId(albums, item.shareId);
      const vaultAlbum = vault?.album;
      const vaultTrack = vault?.track;
      const dnaLive = vaultAlbum
        ? vaultTrack
          ? dnaStatusOf(vaultTrack) === 'live'
          : dnaStatusOf(vaultAlbum) === 'live'
        : false;
      if (dnaLive) extraDna += 1;

      if (item.type === 'album') {
        if (seenAlbumHubs.has(item.shareId)) continue;
        if (!item.releaseLive) continue;
        seenAlbumHubs.add(item.shareId);
        houseLinkedCount += 1;
        albumsOut.push({
          kind: 'album',
          shareId: item.shareId,
          title: item.title || 'Untitled album',
          trackCount: item.trackCount || 0,
          liveTrackCount: dnaLive ? item.trackCount || 0 : 0,
          albumId: vaultAlbum?.id || `house:${item.shareId}`,
          audioTrackCount: item.trackCount || 0,
          isForSale: false,
          dropPriceSummary: 'House · free',
          houseLinked: true,
        });
        continue;
      }

      if (seenTracks.has(item.shareId)) continue;
      if (!item.releaseLive) continue;
      seenTracks.add(item.shareId);
      houseLinkedCount += 1;
      tracksOut.push({
        kind: 'track',
        shareId: item.shareId,
        title: item.title || 'Untitled track',
        albumTitle: item.albumTitle || 'Album',
        albumId: vaultAlbum?.id || `house:${item.shareId}`,
        trackId: vaultTrack?.id || item.shareId,
        fromAlbumHub: false,
        hasDropAudio: true,
        dropPriceSummary: 'House · free',
        houseLinked: true,
      });
    }

    const musicLiveCount =
      tracksOut.filter((track) => track.hasDropAudio).length +
      albumsOut.filter((album) => album.audioTrackCount > 0).length;
    const saleCount =
      tracksOut.filter((track) => track.hasDropAudio && !track.houseLinked).length +
      albumsOut.filter((album) => album.isForSale).length +
      tracksOut.filter((track) => track.houseLinked).length +
      albumsOut.filter((album) => album.houseLinked && album.audioTrackCount > 0).length;
    const lyricPreviewCount =
      albumsOut.filter((album) => !album.isForSale && !album.houseLinked).length +
      tracksOut.filter((track) => !track.hasDropAudio).length;
    const dnaLiveCount =
      albumsOut.filter((album) => album.liveTrackCount > 0).length +
      tracksOut.filter((track) => !track.hasDropAudio).length +
      extraDna;

    return {
      albumDrops: albumsOut,
      trackDrops: tracksOut,
      total: albumsOut.length + tracksOut.length,
      saleCount,
      lyricPreviewCount,
      houseLinkedCount,
      dnaLiveCount,
      musicLiveCount,
    };
  }, [albums, linkedHouse]);

  if (loading) return null;

  const summaryLine =
    total === 0
      ? houseLinkedCount > 0
        ? `${houseLinkedCount} House linked · open Release Catalog to manage`
        : 'Nothing live yet. New release = music (free). Lyrics DNA Drop = share lyrics from The Vault (Pro).'
      : houseLinkedCount > 0
        ? `${houseLinkedCount} House linked · ${musicLiveCount} music live · ${dnaLiveCount} Lyrics DNA Drop${dnaLiveCount === 1 ? '' : 's'}`
        : `${saleCount} for sale · ${lyricPreviewCount} Lyrics DNA Drop${lyricPreviewCount === 1 ? '' : 's'}`;

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
            {summaryLine}
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
