'use client';

import React, { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Disc3, ExternalLink, FileText, Link2, Loader, Music, Radio, Settings2, Trash2, Unlink } from 'lucide-react';
import { DataContext } from '@/context/data-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { attachReleaseToSheet, manageRelease } from '@/lib/release-management-client';
import { groupVaultReleases, hasLyrics, releaseShareIdOf, releaseStatusOf, type VaultReleaseGroups } from '@/lib/release-management';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import type { Album, Track } from '@/lib/types';
import { cn } from '@/lib/utils';

type Row = { album: Album; track?: Track };
type UnpressTarget = { kind: 'album' | 'track'; album: Album; track?: Track };
type RemoveTarget = UnpressTarget;

const GROUPS: Array<{ key: keyof VaultReleaseGroups; label: string; note: string }> = [
  { key: 'privateDrafts', label: 'Private release drafts', note: 'Uploaded recordings only you can test.' },
  { key: 'offlineReleases', label: 'Offline releases', note: 'Hidden releases that can be republished at the same link or retired completely.' },
  { key: 'liveSinglesWithLyrics', label: 'Live singles · lyrics on sheet', note: 'Music is live and the Vault sheet has lyrics written (private until you DNA Drop).' },
  { key: 'liveSinglesAudioOnly', label: 'Live singles · audio only', note: 'Music is live; add lyrics on the Vault sheet, then DNA Drop when you want them public (Pro).' },
  { key: 'liveAlbumsAllLyrics', label: 'Live albums · all lyrics attached', note: 'Bundle releases whose audio tracks all have lyrics.' },
  { key: 'liveAlbumsMixedLyrics', label: 'Live albums · mixed', note: 'Bundle releases with some lyric sheets and some audio-only tracks.' },
  { key: 'liveAlbumsAudioOnly', label: 'Live albums · audio only', note: 'Bundle releases that do not require lyric sheets.' },
  { key: 'dnaPreviews', label: 'Live DNA Drops', note: 'Public lyric pages from a Vault sheet — Studio Pro to publish, view, or import.' },
  { key: 'unpressed', label: 'Not released yet', note: 'Vault tracks and albums that are not publicly available.' },
];

function asRows(value: VaultReleaseGroups[keyof VaultReleaseGroups]): Row[] {
  return value.map((item) => ('album' in item ? item : { album: item as Album }));
}

type ReleaseCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

function ReleaseCatalogBody({ className }: { className?: string }) {
  const { albums, updateAlbum, updateTrack, deleteTrack, moveTrack, flushCloudNow } = useContext(DataContext);
  const { toast } = useToast();
  const groups = useMemo(() => groupVaultReleases(albums), [albums]);
  const lyricSheets = useMemo(
    () => albums.flatMap((album) => album.tracks.filter((track) => hasLyrics(track) && !normalizeDropAudio(track.dropAudio)).map((track) => ({ album, track }))),
    [albums]
  );
  const [busy, setBusy] = useState('');
  const [unpress, setUnpress] = useState<UnpressTarget | null>(null);
  const [remove, setRemove] = useState<RemoveTarget | null>(null);
  const [attach, setAttach] = useState<Row | null>(null);

  const unpressRelease = async (hideDna: boolean) => {
    if (!unpress) return;
    const { kind, album, track } = unpress;
    const key = `${kind}:${track?.id || album.id}`;
    setBusy(key);
    try {
      await flushCloudNow();
      const result = await manageRelease({
        kind,
        action: 'unpublish',
        albumId: album.id,
        ...(track ? { trackId: track.id } : {}),
        hideDna,
      });
      const patch = {
        releaseStatus: 'unlisted' as const,
        ...(result.releaseShareId ? { releaseShareId: result.releaseShareId } : {}),
        ...(hideDna ? { dnaStatus: 'unlisted' as const } : {}),
      };
      if (track) updateTrack(album.id, track.id, patch);
      else updateAlbum(album.id, patch);
      toast({
        title: 'Release taken offline',
        description: hideDna
          ? 'The sale and lyric page are off public surfaces. Existing buyers keep access.'
          : 'The sale is off public surfaces. The separate lyric page stays live and existing buyers keep access.',
      });
      setUnpress(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not take release offline', description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy('');
    }
  };

  const removeRelease = async (hideDna: boolean) => {
    if (!remove) return;
    const { kind, album, track } = remove;
    const key = `${kind}:${track?.id || album.id}`;
    setBusy(key);
    try {
      await flushCloudNow();
      await manageRelease({
        kind,
        action: 'remove',
        albumId: album.id,
        ...(track ? { trackId: track.id } : {}),
        hideDna,
      });
      const patch = {
        releaseStatus: 'draft' as const,
        releaseShareId: undefined,
        releaseSnapshotAt: undefined,
        houseRelease: false,
        houseLibraryNotice: false,
        ...(hideDna ? { dnaStatus: 'unlisted' as const } : {}),
      };
      if (track) updateTrack(album.id, track.id, patch);
      else updateAlbum(album.id, patch);
      toast({
        title: 'Old release record removed',
        description: hideDna
          ? 'The old release and lyric page are retired. Your Vault song and existing buyer access remain.'
          : 'The old release link is retired. Your Vault song, lyric page, and existing buyer access remain.',
      });
      setRemove(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not remove release record', description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy('');
    }
  };

  const attachSheet = async (targetAlbumId: string, targetTrackId: string) => {
    if (!attach?.track) return;
    const source = attach;
    const sourceTrack = attach.track;
    setBusy(`attach:${sourceTrack.id}`);
    try {
      await flushCloudNow();
      const result = await attachReleaseToSheet({
        sourceAlbumId: source.album.id,
        sourceTrackId: sourceTrack.id,
        targetAlbumId,
        targetTrackId,
      });
      const targetAlbum = albums.find((album) => album.id === targetAlbumId)!;
      const target = targetAlbum.tracks.find((track) => track.id === targetTrackId)!;
      const sourceReleaseId = releaseShareIdOf(sourceTrack);
      const sourceReleaseStatus = releaseStatusOf(sourceTrack);
      if (targetAlbumId !== result.targetAlbumId) {
        moveTrack(targetTrackId, targetAlbumId, result.targetAlbumId);
      }
      updateTrack(result.targetAlbumId, targetTrackId, {
        title: sourceTrack.title,
        coverArtUrl: sourceTrack.coverArtUrl,
        dropAudio: sourceTrack.dropAudio,
        dropPrice: sourceTrack.dropPrice,
        dropRightsAttestedAt: sourceTrack.dropRightsAttestedAt,
        releaseShareId: sourceReleaseId,
        releaseStatus: sourceReleaseStatus,
        releaseSnapshotAt: sourceTrack.releaseSnapshotAt,
      });
      deleteTrack(source.album.id, sourceTrack.id);
      toast({ title: 'Lyric sheet attached', description: `The release now uses “${target.title}” without changing its release link or sales history.` });
      setAttach(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not attach sheet', description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={cn('min-w-0 space-y-4', className)} aria-label="Release catalog contents">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Upload and test recordings privately, then press music live when ready — free on every account.
          </p>
          <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-cyan-100/75">
            Lyrics live on your Vault sheet. To share them publicly, publish a DNA Drop from that sheet (Studio Pro to publish, view, or import). New release is for the recording, not the lyric link. Take offline keeps the link; Remove retires it — Vault audio and buyer Library access stay.
          </p>
        </div>
        <Button type="button" className="bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300" onClick={() => openFirstDropLathe()}>
          <Disc3 className="mr-2 h-4 w-4" /> New release
        </Button>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {GROUPS.map(({ key, label, note }) => {
          const rows = asRows(groups[key]);
          return (
            <details key={key} className="group rounded-xl border border-white/10 bg-black/25" open={key === 'privateDrafts' || key === 'offlineReleases' || key === 'liveSinglesWithLyrics' || key === 'liveSinglesAudioOnly'}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
                  {key.includes('Album') || key.includes('Albums') ? <Disc3 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide">{label}</span>
                  <span className="block text-[10px] leading-relaxed text-muted-foreground">{note}</span>
                </span>
                <span className="rounded-full border border-white/10 px-2 py-1 font-code text-[10px]">{rows.length}</span>
              </summary>
              {rows.length ? (
                <ul className="space-y-2 border-t border-white/10 p-2.5">
                  {rows.map(({ album, track }) => {
                    const dnaGroup = key === 'dnaPreviews';
                    const dnaId = track?.shareId || album.shareId;
                    const releaseId = dnaGroup ? undefined : releaseShareIdOf(track || { ...album, tracks: album.tracks });
                    const status = releaseStatusOf(track || { ...album, tracks: album.tracks });
                    const rowKey = `${key}:${album.id}:${track?.id || 'album'}`;
                    return (
                      <li key={rowKey} className="rounded-lg border border-white/10 bg-slate-950/75 p-2.5">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{track?.title || album.title || 'Untitled'}</span>
                            <span className="block truncate font-code text-[9px] uppercase tracking-wider text-muted-foreground">
                              {track ? `${album.title} · ${hasLyrics(track) ? 'lyrics attached' : 'audio only'}` : `${album.tracks.length} tracks`}
                              {dnaGroup ? ' · DNA Drop live' : status ? ` · ${status}` : ''}
                              {!dnaGroup && (track?.houseRelease || (!track && album.houseRelease)) ? ' · House · Free' : ''}
                              {!dnaGroup && (track?.houseLibraryNotice || (!track && album.houseLibraryNotice)) ? ' · Library notice on' : ''}
                            </span>
                          </span>
                          {busy.endsWith(track?.id || album.id) ? <Loader className="h-4 w-4 animate-spin" /> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {dnaGroup && dnaId ? (
                            <Button asChild size="sm" variant="secondary" className="h-8 text-[9px] font-bold uppercase">
                              <Link href={`/share/${dnaId}`}><ExternalLink className="mr-1 h-3 w-3" /> Open lyric page</Link>
                            </Button>
                          ) : null}
                          {releaseId && status === 'live' ? (
                            <Button asChild size="sm" variant="secondary" className="h-8 text-[9px] font-bold uppercase">
                              <Link href={track ? `/song/${releaseId}` : `/share/${releaseId}`}>
                                <ExternalLink className="mr-1 h-3 w-3" /> Open release
                              </Link>
                            </Button>
                          ) : null}
                          {dnaGroup ? (
                            <Button asChild size="sm" variant="outline" className="h-8 text-[9px] font-bold uppercase">
                              <Link href={track ? `/albums/${album.id}/tracks/${track.id}` : `/albums/${album.id}`}><Settings2 className="mr-1 h-3 w-3" /> Manage in Vault</Link>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-[9px] font-bold uppercase" onClick={() => openFirstDropLathe({ albumId: album.id, ...(track ? { trackId: track.id } : { mode: 'album' as const }) })}>
                              <Settings2 className="mr-1 h-3 w-3" /> {status === 'live' ? 'Update' : 'Open release desk'}
                            </Button>
                          )}
                          {track && !hasLyrics(track) && normalizeDropAudio(track.dropAudio) ? (
                            <>
                              <Button asChild size="sm" variant="outline" className="h-8 text-[9px] font-bold uppercase">
                                <Link href={`/albums/${album.id}/tracks/${track.id}`}><FileText className="mr-1 h-3 w-3" /> Start lyrics</Link>
                              </Button>
                              {lyricSheets.length ? (
                                <Button size="sm" variant="outline" className="h-8 text-[9px] font-bold uppercase" onClick={() => setAttach({ album, track })}>
                                  <Link2 className="mr-1 h-3 w-3" /> Attach existing
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                          {!dnaGroup && status === 'live' ? (
                            <Button size="sm" variant="outline" className="h-8 border-red-400/30 text-[9px] font-bold uppercase text-red-300" onClick={() => setUnpress({ kind: track ? 'track' : 'album', album, track })}>
                              <Unlink className="mr-1 h-3 w-3" /> Take offline
                            </Button>
                          ) : null}
                          {!dnaGroup && status === 'unlisted' && releaseId ? (
                            <Button size="sm" variant="outline" className="h-8 border-red-400/30 text-[9px] font-bold uppercase text-red-300" onClick={() => setRemove({ kind: track ? 'track' : 'album', album, track })}>
                              <Trash2 className="mr-1 h-3 w-3" /> Remove release
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="border-t border-white/10 px-3 py-3 text-[10px] text-muted-foreground">Nothing in this group yet.</p>}
            </details>
          );
        })}
      </div>

      <Dialog open={Boolean(unpress)} onOpenChange={(open) => !open && setUnpress(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase">Take this release offline?</DialogTitle>
            <DialogDescription>
              It leaves public discovery and new checkout immediately. Existing buyers keep it in Library, and republishing restores the same URL. Choose what happens to the separate lyric page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => void unpressRelease(false)}>Keep lyric page live</Button>
            <Button className="bg-red-500 text-white hover:bg-red-400" disabled={Boolean(busy)} onClick={() => void unpressRelease(true)}>Hide release + lyrics</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(remove)} onOpenChange={(open) => !open && setRemove(null)}>
        <DialogContent className="max-w-md border-red-400/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline uppercase text-red-200">
              <AlertTriangle className="h-5 w-5" /> Remove this release record?
            </DialogTitle>
            <DialogDescription>
              This is different from Take offline. The old public release link is retired and removed from your catalog. Your Vault recording is kept, and existing buyers keep Library playback. Publishing again creates a new release link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => void removeRelease(false)}>
              Remove release · keep lyric page
            </Button>
            <Button className="bg-red-500 text-white hover:bg-red-400" disabled={Boolean(busy)} onClick={() => void removeRelease(true)}>
              Remove release + hide lyric page
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(attach)} onOpenChange={(open) => !open && setAttach(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase">Attach an existing lyric sheet</DialogTitle>
            <DialogDescription>
              The recording, release URL, buyer access, and sales history move atomically to the chosen sheet. Nothing is re-released.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {lyricSheets.map(({ album, track }) => (
              <button key={`${album.id}:${track.id}`} type="button" disabled={Boolean(busy)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3 text-left hover:border-cyan-400/40" onClick={() => void attachSheet(album.id, track.id)}>
                <Radio className="h-4 w-4 shrink-0 text-cyan-300" />
                <span className="min-w-0"><span className="block truncate text-sm font-bold">{track.title}</span><span className="block truncate text-[10px] text-muted-foreground">{album.title}</span></span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function ReleaseCatalogDialog({ open, onOpenChange, className }: ReleaseCatalogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90vh,920px)] w-[calc(100vw-1.5rem)] max-w-6xl flex-col gap-4 overflow-hidden border-cyan-400/30 bg-slate-950 sm:rounded-2xl',
          className
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 pr-8 text-left">
          <DialogTitle className="font-headline text-2xl font-bold uppercase tracking-tight">
            Release Catalog
          </DialogTitle>
          <DialogDescription>
            Manage music releases, live DNA Drops, and drafts from one place.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
          <ReleaseCatalogBody />
        </div>
      </DialogContent>
    </Dialog>
  );
}
