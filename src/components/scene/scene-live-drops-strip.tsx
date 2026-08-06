'use client';

/**
 * Compact manage strip for live album + track DNA drops.
 * Used on The Scene, Vault, and Edit Public Page.
 */

import React, { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { CassetteTape, Disc3, Dna, ExternalLink, Settings2 } from 'lucide-react';
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
};

export function SceneLiveDropsStrip({ className }: { className?: string }) {
  const { albums, loading } = useContext(DataContext);
  const [open, setOpen] = useState(false);

  const { albumDrops, trackDrops, total } = useMemo(() => {
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
        });
      }
    }

    return {
      albumDrops: albumsOut,
      trackDrops: tracksOut,
      total: albumsOut.length + tracksOut.length,
    };
  }, [albums]);

  if (loading) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3.5 py-2.5 text-left transition-colors',
          'hover:border-primary/35 hover:bg-card/70',
          className
        )}
        data-tour="scene-live-drops"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
          <Dna className="h-3.5 w-3.5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
            Live DNA drops
          </span>
          <span className="block truncate text-xs text-foreground/90">
            {total === 0
              ? 'None live — publish from an album or track'
              : `${albumDrops.length} album${albumDrops.length === 1 ? '' : 's'} · ${trackDrops.length} track${trackDrops.length === 1 ? '' : 's'}`}
          </span>
        </span>
        <span className="shrink-0 font-code text-[9px] font-bold uppercase tracking-[0.18em] text-primary/80">
          Manage
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase tracking-wide">
              Your live DNA drops
            </DialogTitle>
            <DialogDescription>
              Albums and track DNA appear on your Artist Home Drop Shelf. Open a drop or jump to the vault to update / take offline.
            </DialogDescription>
          </DialogHeader>

          {total === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                No DNA Drops are live yet. Publish from an album or track in the vault (Pro).
              </p>
              <Button size="sm" variant="outline" className="h-9 font-bold uppercase" asChild>
                <Link href="/vault" onClick={() => setOpen(false)}>
                  Open vault
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {albumDrops.length > 0 && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-violet-300/90">
                    <Disc3 className="h-3.5 w-3.5" /> Album DNA
                  </p>
                  <ul className="space-y-2">
                    {albumDrops.map((drop) => (
                      <li
                        key={drop.shareId}
                        className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3"
                      >
                        <p className="truncate text-sm font-bold">{drop.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {drop.liveTrackCount}/{drop.trackCount} tracks live on album
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
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
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {trackDrops.length > 0 && (
                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-300/90">
                    <CassetteTape className="h-3.5 w-3.5" /> Track DNA
                  </p>
                  <ul className="space-y-2">
                    {trackDrops.map((drop) => (
                      <li
                        key={drop.shareId}
                        className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3"
                      >
                        <p className="truncate text-sm font-bold">{drop.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {drop.fromAlbumHub
                            ? `Also on album · ${drop.albumTitle}`
                            : `From · ${drop.albumTitle}`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold uppercase" asChild>
                            <Link href={`/share/${drop.shareId}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open drop
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" asChild>
                            <Link
                              href={`/albums/${drop.albumId}/tracks/${drop.trackId}`}
                              onClick={() => setOpen(false)}
                            >
                              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Manage in vault
                            </Link>
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
