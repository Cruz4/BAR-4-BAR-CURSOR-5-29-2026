'use client';

/**
 * Press a song — sell without opening DNA Drop.
 * Pick a vault track, upload the song, set a price, go live.
 * The public page still carries lyrics; this is the sell desk.
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, Disc3, Library, Loader, Music, Play, PlusCircle, Save, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { DataContext } from '@/context/data-context';
import { deleteDropAudioFiles, uploadDropAudio } from '@/lib/drop-audio-upload';
import {
  DROP_AUDIO_ACCEPT,
  defaultDropPrice,
  firstDropsFeeCashoutLine,
  isCommerceLive,
  normalizeDropAudio,
  normalizeDropPrice,
} from '@/lib/drop-commerce';
import { OPEN_FIRST_DROP_LATHE, type FirstDropLatheDetail } from '@/lib/first-drop-lathe';
import { isGuestTryAlbumId } from '@/lib/guest-try';
import { PriceEditor } from '@/components/drop-commerce-panel';
import { cn } from '@/lib/utils';
import type { Album, Track } from '@/lib/types';
import { getPrivateReleaseAudio, manageRelease } from '@/lib/release-management-client';
import { releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';

type Picked = { album: Album; track: Track };

export function FirstDropLatheHost() {
  const router = useRouter();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const { user } = useAuth();
  const { toast } = useToast();
  const { albums, addTrack, updateAlbum, updateTrack, flushCloudNow, isCloudSyncActive } = useContext(DataContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const albumFileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'song' | 'album'>('song');
  const [query, setQuery] = useState('');
  const [albumScope, setAlbumScope] = useState<string | undefined>();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [uploading, setUploading] = useState(false);
  const [albumUploadTrackId, setAlbumUploadTrackId] = useState<string | null>(null);
  const [pressing, setPressing] = useState(false);
  const [rightsChecked, setRightsChecked] = useState(false);
  const [newCatalogTitle, setNewCatalogTitle] = useState('');
  const [privateAudioUrl, setPrivateAudioUrl] = useState('');
  const [testingAudio, setTestingAudio] = useState(false);
  const [removingAudioId, setRemovingAudioId] = useState('');

  const catalog = useMemo(() => {
    const rows: Picked[] = [];
    for (const album of albums) {
      if (!album || isGuestTryAlbumId(album.id)) continue;
      for (const track of album.tracks || []) {
        if (!track?.id) continue;
        rows.push({ album, track });
      }
    }
    return rows;
  }, [albums]);

  const livePicked = useMemo(() => {
    if (!picked) return null;
    const album = albums.find((a) => a.id === picked.album.id);
    const track = album?.tracks?.find((t) => t.id === picked.track.id);
    if (!album || !track) return picked;
    return { album, track };
  }, [albums, picked]);

  const selectedAlbum = useMemo(() => {
    if (mode !== 'album' || !albumScope) return null;
    return albums.find((candidate) => candidate.id === albumScope && candidate.id !== 'unassigned') || null;
  }, [albumScope, albums, mode]);

  const releaseAlbums = useMemo(
    () => albums.filter((album) => album.id !== 'unassigned' && !isGuestTryAlbumId(album.id)),
    [albums]
  );

  const removePrivateAudio = async (targetAlbum: Album, targetTrack: Track) => {
    const albumLive = releaseStatusOf({ ...targetAlbum, tracks: targetAlbum.tracks }) === 'live';
    const trackLive = releaseStatusOf(targetTrack) === 'live';
    if (albumLive || trackLive) {
      toast({
        variant: 'destructive',
        title: 'Unpress first',
        description: `This recording is part of a live ${albumLive ? 'album' : 'song'}. Unpress it before removing the master.`,
      });
      return;
    }
    const audio = normalizeDropAudio(targetTrack.dropAudio);
    if (!audio) return;
    if (!window.confirm(`Permanently remove the private recording for "${targetTrack.title}"? This cannot be undone.`)) return;
    setRemovingAudioId(targetTrack.id);
    try {
      await deleteDropAudioFiles(audio);
      updateTrack(targetAlbum.id, targetTrack.id, { dropAudio: undefined, releaseStatus: 'draft' });
      setPrivateAudioUrl('');
      toast({ title: 'Private recording removed', description: 'The lyric sheet and other Vault work were kept.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not remove recording', description: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setRemovingAudioId('');
    }
  };

  const scopedCatalog = useMemo(() => {
    if (!albumScope) return catalog;
    return catalog.filter((row) => row.album.id === albumScope);
  }, [albumScope, catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = scopedCatalog;
    if (!q) return source;
    return source.filter(
      (row) =>
        row.track.title.toLowerCase().includes(q) ||
        row.album.title.toLowerCase().includes(q)
    );
  }, [query, scopedCatalog]);

  const applyDetail = useCallback(
    (detail: FirstDropLatheDetail) => {
      setMode(detail.mode === 'album' ? 'album' : 'song');
      setAlbumScope(detail.albumId);
      if (detail.trackId) {
        const hit = catalog.find(
          (row) =>
            row.track.id === detail.trackId &&
            (!detail.albumId || row.album.id === detail.albumId)
        );
        setPicked(hit || null);
      } else {
        setPicked(null);
      }
      setQuery('');
      setNewCatalogTitle('');
      setAlbumUploadTrackId(null);
      setRightsChecked(false);
      setPrivateAudioUrl('');
      setOpen(true);
    },
    [catalog]
  );

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<FirstDropLatheDetail>).detail || {};
      applyDetail(detail);
    };
    window.addEventListener(OPEN_FIRST_DROP_LATHE, onOpen);
    return () => window.removeEventListener(OPEN_FIRST_DROP_LATHE, onOpen);
  }, [applyDetail]);

  if (!firstDropsOn || !user) return null;

  const track = livePicked?.track;
  const album = livePicked?.album;
  const hasAudio = Boolean(normalizeDropAudio(track?.dropAudio));
  const price = normalizeDropPrice(track?.dropPrice);
  const sellPrice = isCommerceLive(price) ? price : { ...defaultDropPrice(), mode: 'fixed' as const, amountCents: 777 };
  const albumPrice = normalizeDropPrice(selectedAlbum?.dropPrice);
  const albumSellPrice = isCommerceLive(albumPrice)
    ? albumPrice
    : { ...defaultDropPrice(), mode: 'fixed' as const, amountCents: 777 };
  const albumAudioTracks = (selectedAlbum?.tracks || []).filter((candidate) =>
    Boolean(normalizeDropAudio(candidate.dropAudio))
  );

  const onPickAudio = async (file: File | undefined) => {
    if (!file || !user || !track || !album) return;
    setUploading(true);
    try {
      const meta = await uploadDropAudio({ userId: user.id, projectId: track.id, file });
      updateTrack(album.id, track.id, { dropAudio: meta, releaseStatus: 'draft' });
      toast({ title: 'Private draft saved', description: 'Test it here, attach lyrics now or later, then press it live when ready.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Could not store audio.',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addCatalogTrack = () => {
    if (!selectedAlbum || !user || !newCatalogTitle.trim()) return;
    try {
      addTrack(selectedAlbum.id, {
        albumId: selectedAlbum.id,
        ownerId: user.id,
        title: newCatalogTitle.trim().slice(0, 120),
        vibe: { genre: 'General', tempoBPM: 90, feeling: [], enabled: false },
        intentRefs: [],
        sections: [],
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        direction: { enabled: false, inheritFromAlbum: true },
      });
      setNewCatalogTitle('');
      toast({
        title: 'Audio track added',
        description: 'Upload the recording next. Lyrics and a completed sheet are optional.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not add track',
        description: error instanceof Error ? error.message : 'Your current track limit may be full.',
      });
    }
  };

  const createAudioOnlySingle = () => {
    if (!user || !newCatalogTitle.trim()) return;
    const loose = albums.find((candidate) => candidate.id === 'unassigned');
    if (!loose) {
      toast({ variant: 'destructive', title: 'Loose Tracks is unavailable', description: 'Reload the Vault and try again.' });
      return;
    }
    try {
      const created = addTrack(loose.id, {
        albumId: loose.id,
        ownerId: user.id,
        title: newCatalogTitle.trim().slice(0, 120),
        vibe: { genre: 'General', tempoBPM: 90, feeling: [], enabled: false },
        intentRefs: [],
        sections: [],
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        direction: { enabled: false, inheritFromAlbum: false },
        releaseStatus: 'draft',
      });
      setPicked({ album: { ...loose, tracks: [...loose.tracks, created] }, track: created });
      setNewCatalogTitle('');
      toast({ title: 'Audio-only single started', description: 'Upload and test the recording privately. A lyric sheet is optional.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not create single', description: error instanceof Error ? error.message : 'Your current track limit may be full.' });
    }
  };

  const onPickAlbumAudio = async (file: File | undefined) => {
    const targetId = albumUploadTrackId;
    if (!file || !user || !selectedAlbum || !targetId) return;
    setUploading(true);
    try {
      const meta = await uploadDropAudio({ userId: user.id, projectId: targetId, file });
      updateTrack(selectedAlbum.id, targetId, { dropAudio: meta, releaseStatus: 'draft' });
      updateAlbum(selectedAlbum.id, { releaseStatus: 'draft' });
      toast({ title: 'Album track uploaded', description: 'Its 30-second preview is ready.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not store audio.',
      });
    } finally {
      setUploading(false);
      setAlbumUploadTrackId(null);
      if (albumFileRef.current) albumFileRef.current.value = '';
    }
  };

  const pressLive = async () => {
    if (!track || !album) return;
    if (!isCloudSyncActive) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro required',
        description: 'Pressing a song live uses your public page — that’s a Pro publish.',
      });
      return;
    }
    if (!hasAudio) {
      toast({
        variant: 'destructive',
        title: 'Drop the song first',
        description: 'Upload the song, then press it live.',
      });
      return;
    }
    if (!rightsChecked) {
      toast({
        variant: 'destructive',
        title: 'Confirm the rights',
        description: 'Check that you have the rights to sell this recording.',
      });
      return;
    }
    const pressUpdates: Partial<Track> = { dropRightsAttestedAt: new Date().toISOString() };
    if (!isCommerceLive(normalizeDropPrice(track.dropPrice))) {
      pressUpdates.dropPrice = sellPrice;
    }
    updateTrack(album.id, track.id, pressUpdates);
    setPressing(true);
    try {
      await flushCloudNow();
      const result = await manageRelease({ kind: 'track', action: 'publish', albumId: album.id, trackId: track.id });
      const shareId = result.releaseShareId;
      if (!shareId) throw new Error('Release link was not created.');
      updateTrack(album.id, track.id, {
        releaseShareId: shareId,
        releaseStatus: 'live',
        releaseSnapshotAt: new Date().toISOString(),
      });
      toast({
        title: 'Pressed live',
        description: 'Visitors hear this first on your Artist Home and this share link.',
      });
      setOpen(false);
      router.push(`/song/${shareId}`);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not press live',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPressing(false);
    }
  };

  const pressAlbumLive = async () => {
    if (!selectedAlbum) return;
    if (!isCloudSyncActive) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro required',
        description: 'Publishing a paid album uses your public Artist Home.',
      });
      return;
    }
    if (albumAudioTracks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Upload at least one song',
        description: 'An album release needs audio, but it does not need written lyrics or completed sheets.',
      });
      return;
    }
    if (!rightsChecked) {
      toast({
        variant: 'destructive',
        title: 'Confirm the rights',
        description: 'Confirm that you have the rights to sell every included recording.',
      });
      return;
    }

    const attestedAt = new Date().toISOString();
    for (const included of albumAudioTracks) {
      updateTrack(selectedAlbum.id, included.id, { dropRightsAttestedAt: attestedAt });
    }
    if (!isCommerceLive(normalizeDropPrice(selectedAlbum.dropPrice))) {
      updateAlbum(selectedAlbum.id, { dropPrice: albumSellPrice });
    }

    setPressing(true);
    try {
      await flushCloudNow();
      const result = await manageRelease({ kind: 'album', action: 'publish', albumId: selectedAlbum.id });
      const shareId = result.releaseShareId;
      if (!shareId) throw new Error('Album release link was not created.');
      updateAlbum(selectedAlbum.id, {
        releaseShareId: shareId,
        releaseStatus: 'live',
        releaseSnapshotAt: new Date().toISOString(),
      });
      toast({
        title: selectedAlbum.shareId ? 'Album release updated' : 'Album pressed live',
        description: `${albumAudioTracks.length} audio track${albumAudioTracks.length === 1 ? '' : 's'} included. One purchase unlocks all of them.`,
      });
      setOpen(false);
      router.push(`/share/${shareId}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not press album',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPressing(false);
    }
  };

  const savePrivateDraft = async () => {
    if (!track || !album || !hasAudio) return;
    setPressing(true);
    try {
      updateTrack(album.id, track.id, { releaseStatus: 'draft' });
      await flushCloudNow();
      await manageRelease({ kind: 'track', action: 'save-draft', albumId: album.id, trackId: track.id });
      toast({ title: 'Draft saved privately', description: 'It is not public or for sale. Return anytime to test or press it live.' });
      setOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save draft', description: error instanceof Error ? error.message : undefined });
    } finally {
      setPressing(false);
    }
  };

  const testPrivateAudio = async () => {
    if (!track || !album) return;
    setTestingAudio(true);
    try {
      await flushCloudNow();
      const result = await getPrivateReleaseAudio(album.id, track.id);
      setPrivateAudioUrl(result.url);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not test recording', description: error instanceof Error ? error.message : undefined });
    } finally {
      setTestingAudio(false);
    }
  };

  const testAlbumAudio = async (trackId: string) => {
    if (!selectedAlbum) return;
    setTestingAudio(true);
    try {
      await flushCloudNow();
      const result = await getPrivateReleaseAudio(selectedAlbum.id, trackId);
      setPrivateAudioUrl(result.url);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not test recording', description: error instanceof Error ? error.message : undefined });
    } finally {
      setTestingAudio(false);
    }
  };

  const saveAlbumDraft = async () => {
    if (!selectedAlbum || albumAudioTracks.length === 0) return;
    setPressing(true);
    try {
      updateAlbum(selectedAlbum.id, { releaseStatus: 'draft' });
      await flushCloudNow();
      await manageRelease({ kind: 'album', action: 'save-draft', albumId: selectedAlbum.id });
      toast({ title: 'Album draft saved privately', description: 'Test every recording and return to press the bundle live when ready.' });
      setOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save album draft', description: error instanceof Error ? error.message : undefined });
    } finally {
      setPressing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRightsChecked(false);
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden border-fuchsia-500/35 bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl uppercase tracking-tight">
            New release
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {mode === 'album'
              ? 'Upload audio for the included tracks and set one bundle price. Lyrics and completed sheets are optional. One purchase unlocks every included recording.'
              : 'Pick a track, upload the recording, and set its price. Written lyrics and a completed sheet are optional.'}{' '}
            You keep the rights — we take a small fee on the sale. {firstDropsFeeCashoutLine()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/25 p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'song' ? 'default' : 'ghost'}
            className="h-9 font-bold uppercase"
            onClick={() => {
              setMode('song');
              setPicked(null);
              setRightsChecked(false);
            }}
          >
            <Music className="mr-1.5 h-3.5 w-3.5" /> Song
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'album' ? 'default' : 'ghost'}
            className="h-9 font-bold uppercase"
            onClick={() => {
              setMode('album');
              setPicked(null);
              setAlbumScope(undefined);
              setRightsChecked(false);
            }}
          >
            <Library className="mr-1.5 h-3.5 w-3.5" /> Album
          </Button>
        </div>

        {mode === 'album' ? (
          !selectedAlbum ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Choose the album listeners will buy as one bundle. You can add audio-only catalog tracks after choosing it.
              </p>
              {releaseAlbums.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Create an album in The Vault first, then return here to upload its recordings.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 font-bold uppercase">
                    <Link href="/vault">Open The Vault</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {releaseAlbums.map((candidate) => {
                    const audioCount = candidate.tracks.filter((row) => normalizeDropAudio(row.dropAudio)).length;
                    return (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-left hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10"
                          onClick={() => {
                            setAlbumScope(candidate.id);
                            setRightsChecked(false);
                          }}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200">
                            <Disc3 className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-bold">{candidate.title || 'Untitled album'}</span>
                            <span className="block break-words font-code text-[9px] uppercase tracking-widest text-muted-foreground">
                              {candidate.tracks.length} catalog track{candidate.tracks.length === 1 ? '' : 's'} · {audioCount} with audio
                              {releaseStatusOf({ ...candidate, tracks: candidate.tracks }) === 'live' ? ' · release live' : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 hover:underline"
                onClick={() => {
                  setAlbumScope(undefined);
                  setRightsChecked(false);
                }}
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Different album
              </button>

              <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-3">
                <p className="font-headline text-xl font-bold uppercase tracking-tight">{selectedAlbum.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Add the recordings listeners receive. A catalog track does not need lyrics, sections, or a completed sheet.
                </p>
              </div>

              <input
                ref={albumFileRef}
                type="file"
                accept={DROP_AUDIO_ACCEPT}
                className="hidden"
                onChange={(event) => void onPickAlbumAudio(event.target.files?.[0])}
              />

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                  1. Album track audio
                </Label>
                {selectedAlbum.tracks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-muted-foreground">
                    No catalog tracks yet. Add the first title below, then upload its recording.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedAlbum.tracks.map((row, index) => {
                      const audio = normalizeDropAudio(row.dropAudio);
                      const busy = uploading && albumUploadTrackId === row.id;
                      return (
                        <li key={row.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
                          <span className="w-6 shrink-0 text-center font-code text-[9px] text-muted-foreground">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-[12rem] flex-1 basis-48">
                            <span className="block break-words text-sm font-bold">{row.title || `Track ${index + 1}`}</span>
                            <span className={cn('block break-all font-code text-[9px]', audio ? 'text-emerald-400' : 'text-muted-foreground')}>
                              {audio ? `${audio.fileName || 'Audio ready'}${audio.durationSec ? ` · ${Math.round(audio.durationSec)}s` : ''}` : 'No audio yet · lyrics optional'}
                            </span>
                          </span>
                          {audio ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 shrink-0 px-2 text-[9px] font-bold uppercase"
                              disabled={testingAudio}
                              onClick={() => void testAlbumAudio(row.id)}
                            >
                              <Play className="mr-1 h-3 w-3" /> Test
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant={audio ? 'outline' : 'secondary'}
                            className="h-8 shrink-0 px-2.5 text-[9px] font-bold uppercase"
                            disabled={uploading}
                            onClick={() => {
                              setAlbumUploadTrackId(row.id);
                              albumFileRef.current?.click();
                            }}
                          >
                            {busy ? <Loader className="mr-1 h-3 w-3 animate-spin" /> : <Music className="mr-1 h-3 w-3" />}
                            {audio ? 'Replace' : 'Upload'}
                          </Button>
                          {audio ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-red-400"
                              disabled={Boolean(removingAudioId)}
                              onClick={() => void removePrivateAudio(selectedAlbum, row)}
                              aria-label={`Remove private recording for ${row.title}`}
                              title={releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'live' ? 'Unpress the album before removing audio' : 'Remove private recording'}
                            >
                              {removingAudioId === row.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {privateAudioUrl ? (
                  <audio
                    controls
                    src={privateAudioUrl}
                    className="h-10 w-full"
                    onPlay={() => window.dispatchEvent(new CustomEvent('b4b:inline-audio-play'))}
                  />
                ) : null}

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Input
                    value={newCatalogTitle}
                    onChange={(event) => setNewCatalogTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCatalogTrack();
                      }
                    }}
                    maxLength={120}
                    placeholder="New audio track title"
                    className="h-9 font-code text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-[9px] font-bold uppercase"
                    disabled={!newCatalogTitle.trim()}
                    onClick={addCatalogTrack}
                  >
                    <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>

              <PriceEditor
                omitHidden
                label="2. One price for the full album"
                price={albumSellPrice}
                onChange={(next) => updateAlbum(selectedAlbum.id, { dropPrice: next })}
              />

              <div className="flex min-h-10 items-center gap-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 px-3 py-2">
                <Checkbox
                  id="album-drop-rights"
                  checked={rightsChecked}
                  onCheckedChange={(checked) => setRightsChecked(checked === true)}
                  className="border-fuchsia-300 data-[state=checked]:bg-fuchsia-400 data-[state=checked]:text-black"
                />
                <Label htmlFor="album-drop-rights" className="cursor-pointer text-[11px] font-medium leading-snug text-foreground/90">
                  I have the rights to sell every recording included in this album.
                </Label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="h-12 font-bold uppercase" disabled={pressing || uploading || albumAudioTracks.length === 0} onClick={() => void saveAlbumDraft()}>
                  <Save className="mr-2 h-4 w-4" /> Save private draft
                </Button>
                <Button
                  type="button"
                  className="h-12 bg-fuchsia-400 font-headline text-lg font-bold uppercase tracking-wide text-black hover:bg-fuchsia-300"
                  disabled={pressing || uploading || albumAudioTracks.length === 0 || !rightsChecked}
                  onClick={() => void pressAlbumLive()}
                >
                  {pressing ? <Loader className="mr-2 h-5 w-5 animate-spin" /> : <Disc3 className="mr-2 h-5 w-5" />}
                  {releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'live' ? 'Update live album' : 'Press album live'}
                </Button>
              </div>
              <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                Album sales, price paid, buyer, timestamp, fees, and payout are recorded in Earnings. The buyer receives every included audio track in Library.
              </p>
              <Button asChild variant="ghost" className="h-9 w-full text-[10px] font-bold uppercase">
                <Link href="/earnings"><Banknote className="mr-1.5 h-3.5 w-3.5" /> Earnings &amp; cash out</Link>
              </Button>
            </div>
          )
        ) : !livePicked ? (
          <div className="space-y-3">
            {!albumScope ? (
              <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">Create audio-only single</Label>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Start with the recording now. Add or attach lyrics whenever you want.</p>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Input
                    value={newCatalogTitle}
                    onChange={(event) => setNewCatalogTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        createAudioOnlySingle();
                      }
                    }}
                    maxLength={120}
                    placeholder="Single title"
                    className="h-9 font-code text-sm"
                  />
                  <Button type="button" size="sm" className="h-9 bg-fuchsia-400 px-3 font-bold uppercase text-black hover:bg-fuchsia-300" disabled={!newCatalogTitle.trim()} onClick={createAudioOnlySingle}>
                    <PlusCircle className="mr-1 h-3.5 w-3.5" /> Create
                  </Button>
                </div>
              </div>
            ) : null}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={albumScope ? 'Search this album…' : 'Search your tracks…'}
              className="h-10 font-code text-sm"
            />
            {albumScope ? (
              <button
                type="button"
                className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 hover:underline"
                onClick={() => setAlbumScope(undefined)}
              >
                Browse every track
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                {albumScope
                  ? 'No tracks in this album yet. Write one, then press it here.'
                  : 'No tracks in the vault yet. Write one, then press it here — you never have to open DNA Drop to sell.'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {filtered.map((row) => {
                  const audio = Boolean(normalizeDropAudio(row.track.dropAudio));
                  const live = releaseStatusOf(row.track) === 'live';
                  const priced = isCommerceLive(normalizeDropPrice(row.track.dropPrice));
                  return (
                    <li key={`${row.album.id}-${row.track.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(row);
                          setRightsChecked(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-left hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200">
                          <Music className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-bold">{row.track.title}</span>
                          <span className="block break-words font-code text-[9px] uppercase tracking-widest text-muted-foreground">
                            {row.album.title}
                            {audio ? ' · song on file' : ' · no audio yet'}
                            {priced ? ' · priced' : ''}
                            {live ? ' · page live' : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 hover:underline"
              onClick={() => {
                setPicked(null);
                setRightsChecked(false);
              }}
            >
              ← Different track
            </button>
            <div>
              <p className="font-headline text-xl font-bold uppercase tracking-tight">{track?.title}</p>
              <p className="text-[11px] text-muted-foreground">{album?.title}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                1. Upload the song
              </Label>
              <input
                ref={fileRef}
                type="file"
                accept={DROP_AUDIO_ACCEPT}
                className="hidden"
                onChange={(e) => void onPickAudio(e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-11 flex-1 bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Disc3 className="mr-2 h-4 w-4" />}
                  {hasAudio ? 'Replace song' : 'Upload song'}
                </Button>
                {hasAudio && track && album ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 text-red-400"
                    disabled={Boolean(removingAudioId)}
                    onClick={() => void removePrivateAudio(album, track)}
                    aria-label="Remove audio"
                    title={releaseStatusOf(track) === 'live' ? 'Unpress the song before removing audio' : 'Remove private recording'}
                  >
                    {removingAudioId === track.id ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                ) : null}
              </div>
              {hasAudio && track?.dropAudio ? (
                <div className="space-y-2">
                  <p className={cn('font-code text-[10px] text-emerald-400/90')}>
                    {track.dropAudio.fileName || 'Audio on file'}
                    {track.dropAudio.durationSec ? ` · ${Math.round(track.dropAudio.durationSec)}s` : ''}
                    {releaseStatusOf(track) === 'live' ? ' · live release' : ' · private until pressed live'}
                  </p>
                  {privateAudioUrl ? (
                    <audio
                      controls
                      src={privateAudioUrl}
                      className="h-10 w-full"
                      onPlay={() => window.dispatchEvent(new CustomEvent('b4b:inline-audio-play'))}
                    />
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 text-[10px] font-bold uppercase"
                      disabled={testingAudio}
                      onClick={() => void testPrivateAudio()}
                    >
                      {testingAudio ? <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                      Test private recording
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">mp3, wav, m4a — preview caps at 30 seconds until they unlock.</p>
              )}
            </div>

            <PriceEditor
              omitHidden
              label="2. What they pay"
              price={sellPrice}
              onChange={(next) => {
                if (!album || !track) return;
                updateTrack(album.id, track.id, { dropPrice: next });
              }}
            />

            <div className="flex min-h-10 items-center gap-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 px-3">
              <Checkbox
                id="drop-rights"
                checked={rightsChecked}
                onCheckedChange={(checked) => setRightsChecked(checked === true)}
                className="border-fuchsia-300 data-[state=checked]:bg-fuchsia-400 data-[state=checked]:text-black"
              />
              <Label
                htmlFor="drop-rights"
                className="flex cursor-pointer items-center text-[11px] font-medium leading-none text-foreground/90"
              >
                I have the rights to sell this recording.
              </Label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 font-bold uppercase"
                disabled={pressing || uploading || !hasAudio}
                onClick={() => void savePrivateDraft()}
              >
                <Save className="mr-2 h-4 w-4" /> Save private draft
              </Button>
              <Button
                type="button"
                className="h-12 bg-fuchsia-400 font-headline text-lg font-bold uppercase tracking-wide text-black hover:bg-fuchsia-300"
                disabled={pressing || uploading || !hasAudio || !rightsChecked}
                onClick={() => void pressLive()}
              >
                {pressing ? <Loader className="mr-2 h-5 w-5 animate-spin" /> : <Disc3 className="mr-2 h-5 w-5" />}
                {releaseStatusOf(track || {}) === 'live' ? 'Update live press' : releaseShareIdOf(track || {}) ? 'Re-press live' : 'Press live'}
              </Button>
            </div>
            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
              Save Draft keeps the full recording private. Press Live publishes the preview and sale page. Lyrics can be attached now or later.
            </p>
            <Button asChild variant="ghost" className="h-9 w-full text-[10px] font-bold uppercase">
              <Link href="/earnings">
                <Banknote className="mr-1.5 h-3.5 w-3.5" />
                Earnings & cash out
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
