'use client';

import React, { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { Disc3, ExternalLink, FileText, Link2, Loader, Music, Radio, Settings2, Unlink } from 'lucide-react';
import { DataContext } from '@/context/data-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { attachReleaseToSheet, manageRelease } from '@/lib/release-management-client';
import { groupVaultReleases, hasLyrics, releaseShareIdOf, releaseStatusOf, type VaultReleaseGroups } from '@/lib/release-management';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import type { Album, Track } from '@/lib/types';

type Row = { album: Album; track?: Track };
type UnpressTarget = { kind: 'album' | 'track'; album: Album; track?: Track };

const GROUPS: Array<{ key: keyof VaultReleaseGroups; label: string; note: string }> = [
  { key: 'privateDrafts', label: 'Private release drafts', note: 'Uploaded recordings only you can test.' },
  { key: 'liveSinglesWithLyrics', label: 'Live singles · lyrics attached', note: 'Pressed songs connected to a Bar4Bar lyric sheet.' },
  { key: 'liveSinglesAudioOnly', label: 'Live singles · audio only', note: 'Pressed songs that can receive a lyric sheet later.' },
  { key: 'liveAlbumsAllLyrics', label: 'Live albums · all lyrics attached', note: 'Bundle releases whose audio tracks all have lyrics.' },
  { key: 'liveAlbumsMixedLyrics', label: 'Live albums · mixed', note: 'Bundle releases with some lyric sheets and some audio-only tracks.' },
  { key: 'liveAlbumsAudioOnly', label: 'Live albums · audio only', note: 'Bundle releases that do not require lyric sheets.' },
  { key: 'dnaPreviews', label: 'DNA lyric previews', note: 'Public lyric pages that are separate from paid releases.' },
  { key: 'unpressed', label: 'Not pressed yet', note: 'Vault tracks and albums that are not publicly for sale.' },
];

function asRows(value: VaultReleaseGroups[keyof VaultReleaseGroups]): Row[] {
  return value.map((item) => ('album' in item ? item : { album: item as Album }));
}

export function ReleaseCatalog() {
  const { albums, updateAlbum, updateTrack, deleteTrack, moveTrack, flushCloudNow } = useContext(DataContext);
  const { toast } = useToast();
  const groups = useMemo(() => groupVaultReleases(albums), [albums]);
  const lyricSheets = useMemo(
    () => albums.flatMap((album) => album.tracks.filter((track) => hasLyrics(track) && !normalizeDropAudio(track.dropAudio)).map((track) => ({ album, track }))),
    [albums]
  );
  const [busy, setBusy] = useState('');
  const [unpress, setUnpress] = useState<UnpressTarget | null>(null);
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
        title: 'Release unpressed',
        description: hideDna
          ? 'The sale and lyric page are off public surfaces. Existing buyers keep access.'
          : 'The sale is off public surfaces. The separate lyric page stays live and existing buyers keep access.',
      });
      setUnpress(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not unpress', description: error instanceof Error ? error.message : undefined });
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
    <section className="mb-4 rounded-2xl border border-cyan-400/25 bg-slate-950/70 p-3 sm:p-4" aria-labelledby="release-catalog-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-code text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-300">Release catalog</p>
          <h2 id="release-catalog-title" className="font-headline text-2xl font-bold uppercase">Music + lyrics, clearly grouped</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Upload and test privately, press a single or full album when ready, then attach a lyric sheet now or later. DNA remains a separate lyric preview.
          </p>
        </div>
        <Button type="button" className="bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300" onClick={() => openFirstDropLathe()}>
          <Disc3 className="mr-2 h-4 w-4" /> New release
        </Button>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {GROUPS.map(({ key, label, note }) => {
          const rows = asRows(groups[key]);
          return (
            <details key={key} className="group rounded-xl border border-white/10 bg-black/25" open={key === 'privateDrafts' || key === 'liveSinglesWithLyrics' || key === 'liveSinglesAudioOnly'}>
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
                              {dnaGroup ? ' · lyric preview live' : status ? ` · ${status}` : ''}
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
                          {releaseId && status !== 'draft' ? (
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
                              <Unlink className="mr-1 h-3 w-3" /> Unpress
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
            <DialogTitle className="font-headline uppercase">Unpress this release?</DialogTitle>
            <DialogDescription>
              It leaves public discovery and new checkout immediately. Existing buyers keep it in Library, and re-pressing restores the same URL. Choose what happens to the separate lyric page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => void unpressRelease(false)}>Keep lyric page live</Button>
            <Button className="bg-red-500 text-white hover:bg-red-400" disabled={Boolean(busy)} onClick={() => void unpressRelease(true)}>Hide release + lyrics</Button>
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
