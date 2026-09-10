'use client';

/**
 * Release a song — publish audio without opening DNA Drop.
 * Pick a vault track, upload the song, set a price, go live.
 * The public page still carries lyrics; this is the sell desk.
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, BellRing, Disc3, Gift, Library, Loader, Music, Play, PlusCircle, Radio, Save, Trash2, Unlink } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
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
import { useFreeDropsFeature } from '@/hooks/use-free-drops-feature';
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
import { emitReleasePublished } from '@/lib/manual-paths';
import { isGuestTryAlbumId } from '@/lib/guest-try';
import { PriceEditor } from '@/components/drop-commerce-panel';
import {
  GuidedReleaseChecklist,
  guidedPublishBlocked,
  type GuidedChecklistStepId,
} from '@/components/guided-release-checklist';
import { useProductSurfaces } from '@/hooks/use-product-surfaces';
import { cn } from '@/lib/utils';
import type { Album, Track, TrackSection } from '@/lib/types';
import type { ReleaseDiscoveryMetadata } from '@/lib/release-discovery';
import { getPrivateReleaseAudio, manageRelease, pingHouseRelease } from '@/lib/release-management-client';
import { releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';
import { Textarea } from '@/components/ui/textarea';

type Picked = { album: Album; track: Track };

function songReleasePlacement(row: Picked): 'single' | 'album' | null {
  if (releaseStatusOf(row.track) === 'live') return 'single';
  const albumLive = row.album.id !== 'unassigned'
    && releaseStatusOf({ ...row.album, tracks: row.album.tracks }) === 'live';
  return albumLive && Boolean(normalizeDropAudio(row.track.dropAudio)) ? 'album' : null;
}

function offlineReleasePlacement(row: Picked): 'single' | 'album' | null {
  if (releaseStatusOf(row.track) === 'unlisted' && releaseShareIdOf(row.track)) return 'single';
  const albumOffline = row.album.id !== 'unassigned'
    && releaseStatusOf({ ...row.album, tracks: row.album.tracks }) === 'unlisted'
    && Boolean(releaseShareIdOf({ ...row.album, tracks: row.album.tracks }));
  return albumOffline && Boolean(normalizeDropAudio(row.track.dropAudio)) ? 'album' : null;
}

function sectionsToLyricText(sections: TrackSection[] | undefined): string {
  if (!sections?.length) return '';
  return sections
    .flatMap((section) => (section.bars || []).map((bar) => String(bar.text || '')))
    .join('\n')
    .replace(/\n+$/g, '');
}

function lyricTextToSections(text: string): TrackSection[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length === 1 && !lines[0].trim()) return [];
  return [
    {
      id: `section-${Date.now()}`,
      type: 'verse',
      bars: lines.map((line, index) => ({
        idx: index + 1,
        text: line,
        accepted: true,
        syllables: 0,
        rhymeKey: '?',
        lineSource: 'written' as const,
      })),
    },
  ];
}

function ReleaseTitleLyricsEditor({
  title,
  lyrics,
  lyricsHint,
  titleInputRef,
  onSaveTitle,
  onSaveLyrics,
  lyricsDisabled,
}: {
  title: string;
  lyrics: string;
  lyricsHint?: string;
  titleInputRef?: React.Ref<HTMLInputElement>;
  onSaveTitle: (next: string) => void;
  onSaveLyrics: (next: string) => void;
  lyricsDisabled?: boolean;
}) {
  const [titleDraft, setTitleDraft] = useState(title);
  const [lyricsDraft, setLyricsDraft] = useState(lyrics);

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  useEffect(() => {
    setLyricsDraft(lyrics);
  }, [lyrics]);

  return (
    <div id="release-step-titleLyrics" className="scroll-mt-4 space-y-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">Title</Label>
        <Input
          ref={titleInputRef}
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={() => {
            const next = titleDraft.trim().slice(0, 120);
            if (!next || next === title) return;
            onSaveTitle(next);
          }}
          maxLength={120}
          placeholder="Release title"
          className="h-10 font-headline text-base font-bold uppercase tracking-tight"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
          Lyrics (optional)
        </Label>
        {lyricsHint ? (
          <p className="text-[10px] leading-relaxed text-muted-foreground">{lyricsHint}</p>
        ) : null}
        <Textarea
          value={lyricsDraft}
          onChange={(event) => setLyricsDraft(event.target.value)}
          onBlur={() => {
            if (lyricsDraft === lyrics) return;
            onSaveLyrics(lyricsDraft);
          }}
          placeholder="Paste or type lyrics if you want them on the sheet."
          className="min-h-[7rem] font-code text-sm"
          disabled={lyricsDisabled}
        />
      </div>
      <p id="release-step-cover" className="scroll-mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Cover art (optional) — this release uses art already on the Vault album or track. Skip cover in the checklist if you do not have art yet.
      </p>
    </div>
  );
}

function HouseReleaseToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
      <Checkbox
        id="house-release"
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5 border-cyan-300 data-[state=checked]:bg-cyan-300 data-[state=checked]:text-black"
      />
      <Label htmlFor="house-release" className="min-w-0 cursor-pointer">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
          <Gift className="h-3.5 w-3.5" /> House · Free for everyone
        </span>
        <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
          Admin only. Every current and future member receives the full release in Library without checkout.
        </span>
      </Label>
    </div>
  );
}

function HouseLibraryNoticePing({
  sent,
  disabled,
  pinging,
  onPing,
}: {
  sent: boolean;
  disabled: boolean;
  pinging: boolean;
  onPing: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.07] p-3">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full border-fuchsia-300/45 bg-fuchsia-400/10 text-[10px] font-bold uppercase tracking-wider text-fuchsia-100 hover:bg-fuchsia-400/20"
        disabled={disabled || pinging}
        onClick={onPing}
      >
        {pinging ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
        {disabled ? 'Publish House Drop first' : sent ? 'Ping New in Library again' : 'Ping New in Library'}
      </Button>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Sends a AKAsheet Activity notification and puts a new bubble on Library in The Scene. Members clear it by reading the notice.
      </p>
    </div>
  );
}

export function FirstDropLatheHost() {
  const router = useRouter();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const { enabled: freeDropsOn } = useFreeDropsFeature();
  const { releaseComposer, releaseRoom: releaseRoomMode } = useProductSurfaces();
  const guided = releaseComposer === 'guided';
  const { user } = useAuth();
  const { toast } = useToast();
  const { albums, addTrack, updateAlbum, updateTrack, deleteTrack, flushCloudNow } = useContext(DataContext);
  const isAdmin = user?.role === 'admin';
  const fileRef = useRef<HTMLInputElement>(null);
  const albumFileRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
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
  const [pingingHouseNotice, setPingingHouseNotice] = useState(false);
  const [schedulingRoom, setSchedulingRoom] = useState(false);

  const scheduleListeningRoom = useCallback(
    async (shareId: string, title: string) => {
      const current = auth.currentUser;
      if (!current) {
        toast({ variant: 'destructive', title: 'Sign in to schedule a listening room' });
        return;
      }
      setSchedulingRoom(true);
      try {
        const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const res = await fetch('/api/release-rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await current.getIdToken()}`,
          },
          body: JSON.stringify({ shareId, scheduledAt, title }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          room?: { id?: string };
          error?: string;
        };
        if (!res.ok || !data.room?.id) {
          throw new Error(data.error || 'Could not schedule listening room');
        }
        toast({
          title: 'Listening room scheduled',
          description: 'Opens in about one hour — you can start early from the room page.',
        });
        setOpen(false);
        router.push(`/room/${encodeURIComponent(data.room.id)}`);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: error instanceof Error ? error.message : 'Could not schedule room',
        });
      } finally {
        setSchedulingRoom(false);
      }
    },
    [router, toast]
  );

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
        title: 'Take the release offline first',
        description: `This recording is part of a live ${albumLive ? 'album' : 'song'} release. Take it offline before removing the master.`,
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

  const songPickerSections = useMemo(() => {
    const released = filtered.filter((row) => songReleasePlacement(row));
    const unreleased = filtered.filter((row) => !songReleasePlacement(row));
    return [
      {
        id: 'released',
        label: 'Already released',
        detail: 'Live now · select one to update or manage it',
        rows: released,
        live: true,
      },
      {
        id: 'unreleased',
        label: released.length ? 'Not released yet' : 'Your songs',
        detail: 'Select a song to prepare its release',
        rows: unreleased,
        live: false,
      },
    ].filter((section) => section.rows.length > 0);
  }, [filtered]);

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
  const houseRelease = Boolean(mode === 'album' ? selectedAlbum?.houseRelease : track?.houseRelease);
  const houseLibraryNotice = Boolean(
    mode === 'album' ? selectedAlbum?.houseLibraryNotice : track?.houseLibraryNotice
  );
  const pickedReleasePlacement = livePicked ? songReleasePlacement(livePicked) : null;
  const pickedOfflinePlacement = livePicked ? offlineReleasePlacement(livePicked) : null;
  const selectedAlbumIsLive = Boolean(
    selectedAlbum && releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'live'
  );
  const selectedAlbumIsOffline = Boolean(
    selectedAlbum
    && releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'unlisted'
    && releaseShareIdOf({ ...selectedAlbum, tracks: selectedAlbum.tracks })
  );
  const guidedSongBlocked =
    guided &&
    Boolean(album && track) &&
    guidedPublishBlocked({
      kind: 'song',
      album: album!,
      track,
      rightsChecked,
      houseRelease,
      hasPrivateAudioUrl: Boolean(privateAudioUrl),
    });
  const guidedAlbumBlocked =
    guided &&
    Boolean(selectedAlbum) &&
    guidedPublishBlocked({
      kind: 'album',
      album: selectedAlbum!,
      rightsChecked,
      houseRelease,
      hasPrivateAudioUrl: Boolean(privateAudioUrl),
    });

  const saveSongDiscovery = (next: ReleaseDiscoveryMetadata) => {
    if (!album || !track) return;
    updateTrack(album.id, track.id, { releaseDiscovery: next });
  };
  const saveAlbumDiscovery = (next: ReleaseDiscoveryMetadata) => {
    if (!selectedAlbum) return;
    updateAlbum(selectedAlbum.id, { releaseDiscovery: next });
  };

  const onPickAudio = async (file: File | undefined) => {
    if (!file || !user || !track || !album) return;
    setUploading(true);
    try {
      const meta = await uploadDropAudio({ userId: user.id, projectId: track.id, file });
      updateTrack(album.id, track.id, { dropAudio: meta, releaseStatus: 'draft' });
      toast({ title: 'Private draft saved', description: 'Test it here, attach lyrics now or later, then release it when ready.' });
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

  const removeCatalogTrack = (row: Track) => {
    if (!selectedAlbum) return;
    if (normalizeDropAudio(row.dropAudio)) return;
    if (
      !window.confirm(
        `Remove "${row.title || 'this track'}" from the album?\n\nIt has no audio yet. This only drops it from the catalog list.`
      )
    ) {
      return;
    }
    deleteTrack(selectedAlbum.id, row.id);
    toast({ title: 'Track removed' });
  };

  const onChecklistStep = (id: GuidedChecklistStepId) => {
    if (id === 'titleLyrics') {
      window.setTimeout(() => titleInputRef.current?.focus(), 80);
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
    if (!hasAudio) {
      toast({
        variant: 'destructive',
        title: 'Drop the song first',
        description: 'Upload the song before publishing the release.',
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
    const pressUpdates: Partial<Track> = {
      dropRightsAttestedAt: new Date().toISOString(),
      ...(isAdmin ? { houseRelease, houseLibraryNotice } : {}),
    };
    if (!houseRelease && !isCommerceLive(normalizeDropPrice(track.dropPrice))) {
      pressUpdates.dropPrice = sellPrice;
    }
    updateTrack(album.id, track.id, pressUpdates);
    setPressing(true);
    try {
      await flushCloudNow();
      const result = await manageRelease({
        kind: 'track',
        action: 'publish',
        albumId: album.id,
        trackId: track.id,
        ...(isAdmin ? { houseRelease, houseLibraryNotice } : {}),
      });
      const shareId = result.releaseShareId;
      if (!shareId) throw new Error('Release link was not created.');
      updateTrack(album.id, track.id, {
        releaseShareId: shareId,
        releaseStatus: 'live',
        releaseSnapshotAt: new Date().toISOString(),
        houseRelease: result.houseRelease === true,
        houseLibraryNotice: result.houseLibraryNotice === true,
      });
      toast({
        title: houseRelease ? 'House release published' : 'Release published',
        description: houseRelease
          ? 'Every current and future member now receives it free in Library.'
          : 'Visitors hear this first on your Artist Home and this share link.',
      });
      emitReleasePublished();
      if (!houseRelease) {
        setOpen(false);
        router.push(`/song/${shareId}`);
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not publish release',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPressing(false);
    }
  };

  const pressAlbumLive = async () => {
    if (!selectedAlbum) return;
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
    if (!houseRelease && !isCommerceLive(normalizeDropPrice(selectedAlbum.dropPrice))) {
      updateAlbum(selectedAlbum.id, { dropPrice: albumSellPrice });
    }
    if (isAdmin) updateAlbum(selectedAlbum.id, { houseRelease, houseLibraryNotice });

    setPressing(true);
    try {
      await flushCloudNow();
      const result = await manageRelease({
        kind: 'album',
        action: 'publish',
        albumId: selectedAlbum.id,
        ...(isAdmin ? { houseRelease, houseLibraryNotice } : {}),
      });
      const shareId = result.releaseShareId;
      if (!shareId) throw new Error('Album release link was not created.');
      updateAlbum(selectedAlbum.id, {
        releaseShareId: shareId,
        releaseStatus: 'live',
        releaseSnapshotAt: new Date().toISOString(),
        houseRelease: result.houseRelease === true,
        houseLibraryNotice: result.houseLibraryNotice === true,
      });
      toast({
        title: houseRelease
          ? 'House album published'
          : selectedAlbum.shareId
            ? 'Album release updated'
            : 'Album release published',
        description: result.releaseCoverOmitted
          ? 'Album published. Its older embedded cover was too large for the release page; re-upload the cover once to optimize it, then republish.'
          : houseRelease
            ? `${albumAudioTracks.length} audio track${albumAudioTracks.length === 1 ? '' : 's'} added free to every member Library.`
            : `${albumAudioTracks.length} audio track${albumAudioTracks.length === 1 ? '' : 's'} included. One purchase unlocks all of them.`,
      });
      emitReleasePublished();
      if (!houseRelease) {
        setOpen(false);
        router.push(`/share/${shareId}`);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not publish album release',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPressing(false);
    }
  };

  const sendHouseLibraryPing = async (kind: 'track' | 'album') => {
    const target = kind === 'album' ? selectedAlbum : track;
    const shareId = releaseShareIdOf(target || {});
    if (!shareId) {
      toast({ variant: 'destructive', title: 'Publish the House Drop first' });
      return;
    }
    setPingingHouseNotice(true);
    try {
      const result = await pingHouseRelease(shareId);
      if (kind === 'album' && selectedAlbum) {
        updateAlbum(selectedAlbum.id, { houseLibraryNotice: true });
      } else if (album && track) {
        updateTrack(album.id, track.id, { houseLibraryNotice: true });
      }
      toast({
        title: result.refreshed ? 'Library ping refreshed' : 'Library ping sent',
        description: result.refreshed
          ? 'Members who already cleared it see +1 again. Anyone still waiting does not get stacked.'
          : 'Members now have a new Activity alert and a Library bubble in The Scene.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not send Library ping',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPingingHouseNotice(false);
    }
  };

  const takeReleaseOffline = async (
    kind: 'track' | 'album',
    targetAlbum: Album,
    targetTrack?: Track,
  ) => {
    const albumRelease = kind === 'album';
    const subject = albumRelease ? `album "${targetAlbum.title}"` : `song "${targetTrack?.title || 'Untitled'}"`;
    if (!window.confirm(`Take the ${subject} offline? New listeners will not be able to discover or buy it. Existing buyers keep access.`)) {
      return;
    }

    setPressing(true);
    try {
      await flushCloudNow();
      const result = await manageRelease({
        kind,
        action: 'unpublish',
        albumId: targetAlbum.id,
        ...(targetTrack ? { trackId: targetTrack.id } : {}),
      });
      const patch = {
        releaseStatus: 'unlisted' as const,
        ...(result.releaseShareId ? { releaseShareId: result.releaseShareId } : {}),
      };
      if (targetTrack) updateTrack(targetAlbum.id, targetTrack.id, patch);
      else updateAlbum(targetAlbum.id, patch);
      setRightsChecked(false);
      toast({
        title: albumRelease ? 'Album release taken offline' : 'Release taken offline',
        description: 'Discovery and checkout are off. The recording stays attached and existing buyers keep access.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not take release offline',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPressing(false);
    }
  };

  const removeReleaseRecord = async (
    kind: 'track' | 'album',
    targetAlbum: Album,
    targetTrack?: Track,
  ) => {
    const name = kind === 'album' ? targetAlbum.title : targetTrack?.title || 'Untitled';
    if (!window.confirm(
      `Remove the old release record for "${name}"?\n\nThis retires its old public release link. Your Vault recording stays, and existing buyers keep Library playback. Publishing again creates a new release link. The separate lyric page stays live.`
    )) return;

    setPressing(true);
    try {
      await flushCloudNow();
      await manageRelease({
        kind,
        action: 'remove',
        albumId: targetAlbum.id,
        ...(targetTrack ? { trackId: targetTrack.id } : {}),
      });
      const patch = {
        releaseStatus: 'draft' as const,
        releaseShareId: undefined,
        releaseSnapshotAt: undefined,
        houseRelease: false,
        houseLibraryNotice: false,
      };
      if (targetTrack) updateTrack(targetAlbum.id, targetTrack.id, patch);
      else updateAlbum(targetAlbum.id, patch);
      toast({
        title: 'Old release record removed',
        description: 'The old link is retired. Vault audio, lyric DNA, and buyer access were kept.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not remove release record',
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
      await manageRelease({
        kind: 'track',
        action: 'save-draft',
        albumId: album.id,
        trackId: track.id,
        ...(isAdmin ? { houseRelease, houseLibraryNotice } : {}),
      });
      toast({ title: 'Draft saved privately', description: 'It is not public or for sale. Return anytime to test or publish it.' });
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
      await manageRelease({
        kind: 'album',
        action: 'save-draft',
        albumId: selectedAlbum.id,
        ...(isAdmin ? { houseRelease, houseLibraryNotice } : {}),
      });
      toast({ title: 'Album draft saved privately', description: 'Test every recording and publish the album release when ready.' });
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
            {guided
              ? 'Follow the checklist. Upload, price, confirm rights, then publish. Lyrics and cover are optional. Free on every signed-in account — DNA Drop lyric links stay Pro.'
              : houseRelease
              ? mode === 'album'
                ? 'Upload the included recordings and publish them as a House album. Every member receives the full album free in Library.'
                : 'Upload the recording and publish it as a House release. Every member receives the full song free in Library.'
              : <>
                  {mode === 'album'
                    ? 'Upload audio for the included tracks and set one bundle price. Lyrics and completed sheets are optional. One purchase unlocks every included recording.'
                    : 'Pick a track, upload the recording, and set its price. Written lyrics and a completed sheet are optional.'}{' '}
                  Free to press live — Pro is not required. DNA Drop is the separate Pro lyric page. You keep the rights — we take a small fee on the sale. {firstDropsFeeCashoutLine()}
                </>}
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

              <ReleaseTitleLyricsEditor
                title={selectedAlbum.title}
                lyrics={sectionsToLyricText(selectedAlbum.tracks[selectedAlbum.tracks.length - 1]?.sections)}
                lyricsHint={
                  selectedAlbum.tracks.length
                    ? `Saved on “${selectedAlbum.tracks[selectedAlbum.tracks.length - 1]?.title || 'the last track'}”. Leave blank to publish audio-only.`
                    : 'Add a catalog track below first if you want optional lyrics on a sheet.'
                }
                titleInputRef={titleInputRef}
                onSaveTitle={(next) => updateAlbum(selectedAlbum.id, { title: next })}
                onSaveLyrics={(next) => {
                  const target = selectedAlbum.tracks[selectedAlbum.tracks.length - 1];
                  if (!target) return;
                  updateTrack(selectedAlbum.id, target.id, { sections: lyricTextToSections(next) });
                }}
                lyricsDisabled={selectedAlbum.tracks.length === 0}
              />

              {guided ? (
                <GuidedReleaseChecklist
                  kind="album"
                  album={selectedAlbum}
                  rightsChecked={rightsChecked}
                  houseRelease={houseRelease}
                  hasPrivateAudioUrl={Boolean(privateAudioUrl)}
                  onDiscoveryChange={saveAlbumDiscovery}
                  onStepActivate={onChecklistStep}
                  advanced={
                    isAdmin ? (
                      <div className="space-y-2">
                        <HouseReleaseToggle
                          checked={houseRelease}
                          onChange={(checked) => updateAlbum(selectedAlbum.id, {
                            houseRelease: checked,
                            ...(!checked ? { houseLibraryNotice: false } : {}),
                          })}
                        />
                        {houseRelease ? (
                          <HouseLibraryNoticePing
                            sent={houseLibraryNotice}
                            disabled={!releaseShareIdOf(selectedAlbum)}
                            pinging={pingingHouseNotice}
                            onPing={() => void sendHouseLibraryPing('album')}
                          />
                        ) : null}
                      </div>
                    ) : undefined
                  }
                />
              ) : null}

              <input
                ref={albumFileRef}
                type="file"
                accept={DROP_AUDIO_ACCEPT}
                className="hidden"
                onChange={(event) => void onPickAlbumAudio(event.target.files?.[0])}
              />

              <div id="release-step-audio" className="scroll-mt-4 space-y-2">
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
                              {audio ? `${audio.fileName || 'Audio ready'}${audio.durationSec ? ` · ${Math.round(audio.durationSec)}s` : ''}` : 'No audio yet · lyrics (optional)'}
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
                              title={releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'live' ? 'Take the album release offline before removing audio' : 'Remove private recording'}
                            >
                              {removingAudioId === row.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-red-400"
                              onClick={() => removeCatalogTrack(row)}
                              aria-label={`Remove ${row.title || 'track'} from album`}
                              title="Remove this track from the album"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {privateAudioUrl ? (
                  <div id="release-step-preview" className="scroll-mt-4">
                    <audio
                      controls
                      src={privateAudioUrl}
                      className="h-10 w-full"
                      onPlay={() => window.dispatchEvent(new CustomEvent('b4b:inline-audio-play'))}
                    />
                  </div>
                ) : (
                  <div id="release-step-preview" className="scroll-mt-4" />
                )}

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

              {isAdmin && !guided ? (
                <div className="space-y-2">
                  <HouseReleaseToggle
                    checked={houseRelease}
                    onChange={(checked) => updateAlbum(selectedAlbum.id, {
                      houseRelease: checked,
                      ...(!checked ? { houseLibraryNotice: false } : {}),
                    })}
                  />
                  {houseRelease ? (
                    <HouseLibraryNoticePing
                      sent={houseLibraryNotice}
                      disabled={!releaseShareIdOf(selectedAlbum)}
                      pinging={pingingHouseNotice}
                      onPing={() => void sendHouseLibraryPing('album')}
                    />
                  ) : null}
                </div>
              ) : null}

              <div id="release-step-price" className="scroll-mt-4">
              {houseRelease ? (
                <p className="rounded-xl border border-cyan-400/20 bg-black/25 px-3 py-2 text-[10px] leading-relaxed text-cyan-100/80">
                  No price or checkout. Signed-in members receive the complete album automatically.
                </p>
              ) : (
                <PriceEditor
                  omitHidden
                  allowFreeDrops={freeDropsOn}
                  label="2. One price for the full album"
                  price={albumSellPrice}
                  onChange={(next) => updateAlbum(selectedAlbum.id, { dropPrice: next })}
                />
              )}
              </div>

              <div id="release-step-rights" className="scroll-mt-4 flex min-h-10 items-center gap-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 px-3 py-2">
                <Checkbox
                  id="album-drop-rights"
                  checked={rightsChecked}
                  onCheckedChange={(checked) => setRightsChecked(checked === true)}
                  className="border-fuchsia-300 data-[state=checked]:bg-fuchsia-400 data-[state=checked]:text-black"
                />
                <Label htmlFor="album-drop-rights" className="cursor-pointer text-[11px] font-medium leading-snug text-foreground/90">
                  I have the rights to {houseRelease ? 'distribute' : 'sell'} every recording included in this album.
                </Label>
              </div>

              <div id="release-step-publish" className="scroll-mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selectedAlbumIsLive ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-red-400/40 bg-red-500/5 font-bold uppercase text-red-300 hover:bg-red-500/15 hover:text-red-200"
                    disabled={pressing || uploading}
                    onClick={() => void takeReleaseOffline('album', selectedAlbum)}
                  >
                    <Unlink className="mr-2 h-4 w-4" /> Take album offline
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="h-12 font-bold uppercase" disabled={pressing || uploading || albumAudioTracks.length === 0} onClick={() => void saveAlbumDraft()}>
                    <Save className="mr-2 h-4 w-4" /> Save private draft
                  </Button>
                )}
                <Button
                  type="button"
                  className="h-12 bg-fuchsia-400 font-headline text-lg font-bold uppercase tracking-wide text-black hover:bg-fuchsia-300"
                  disabled={pressing || uploading || albumAudioTracks.length === 0 || !rightsChecked || guidedAlbumBlocked}
                  onClick={() => void pressAlbumLive()}
                >
                  {pressing ? <Loader className="mr-2 h-5 w-5 animate-spin" /> : <Disc3 className="mr-2 h-5 w-5" />}
                  {houseRelease
                    ? releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'live'
                      ? 'Update House album'
                      : 'Publish House album'
                    : releaseStatusOf({ ...selectedAlbum, tracks: selectedAlbum.tracks }) === 'live'
                      ? 'Update live album'
                      : 'Publish album release'}
                </Button>
              </div>
              {selectedAlbumIsOffline ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full text-[10px] font-bold uppercase text-red-300 hover:bg-red-500/10 hover:text-red-200"
                  disabled={pressing || uploading}
                  onClick={() => void removeReleaseRecord('album', selectedAlbum)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove old album release record
                </Button>
              ) : null}
              <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                {houseRelease
                  ? 'The shared House entitlement puts every included recording in every member Library, including accounts created later.'
                  : 'Album sales, price paid, buyer, timestamp, fees, and payout are recorded in Earnings. The buyer receives every included audio track in Library.'}
              </p>
              {releaseRoomMode === 'v1'
                && selectedAlbumIsLive
                && releaseShareIdOf(selectedAlbum) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-sky-400/35 font-bold uppercase text-sky-200 hover:bg-sky-500/10"
                  disabled={pressing || uploading || schedulingRoom}
                  onClick={() =>
                    void scheduleListeningRoom(
                      releaseShareIdOf(selectedAlbum)!,
                      selectedAlbum.title || 'Album listening room'
                    )
                  }
                >
                  {schedulingRoom ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Radio className="mr-2 h-4 w-4" />
                  )}
                  Schedule listening room
                </Button>
              ) : null}
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
                  ? 'No tracks in this album yet. Write one, then release it here.'
                  : 'No tracks in the vault yet. Write one, then release it here—DNA Drop is only for the separate lyric page.'}
              </p>
            ) : (
              <div className="space-y-4">
                {songPickerSections.map((section) => (
                  <section key={section.id} className="space-y-1.5" aria-label={section.label}>
                    <div className="flex items-end justify-between gap-3 px-1">
                      <div className="min-w-0">
                        <p className={cn(
                          'text-[10px] font-bold uppercase tracking-[0.2em]',
                          section.live ? 'text-emerald-300' : 'text-muted-foreground'
                        )}>
                          {section.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{section.detail}</p>
                      </div>
                      <span className="shrink-0 font-code text-[9px] text-muted-foreground">{section.rows.length}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {section.rows.map((row) => {
                        const audio = Boolean(normalizeDropAudio(row.track.dropAudio));
                        const placement = songReleasePlacement(row);
                        const priced = isCommerceLive(normalizeDropPrice(row.track.dropPrice));
                        return (
                          <li key={`${row.album.id}-${row.track.id}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setPicked(row);
                                setRightsChecked(false);
                              }}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                                placement
                                  ? 'border-emerald-400/25 bg-emerald-500/[0.07] hover:border-emerald-300/55 hover:bg-emerald-500/10'
                                  : 'border-white/10 bg-black/25 hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10'
                              )}
                            >
                              <span className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                                placement
                                  ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                                  : 'border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200'
                              )}>
                                {placement ? <Disc3 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-sm font-bold">{row.track.title}</span>
                                <span className="block break-words font-code text-[9px] uppercase tracking-widest text-muted-foreground">
                                  {row.album.title}
                                  {audio ? ' · song on file' : ' · no audio yet'}
                                  {priced ? ' · priced' : ''}
                                </span>
                              </span>
                              {placement ? (
                                <span className="max-w-[7.5rem] shrink-0 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2 py-1 text-center font-code text-[8px] font-bold uppercase tracking-wider text-emerald-200">
                                  {placement === 'album' ? 'Live on album' : 'Live release'}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
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
            <ReleaseTitleLyricsEditor
              title={track?.title || ''}
              lyrics={sectionsToLyricText(track?.sections)}
              lyricsHint="Leave blank to publish audio-only. Lyrics stay on this sheet in The Vault."
              titleInputRef={titleInputRef}
              onSaveTitle={(next) => {
                if (!album || !track) return;
                updateTrack(album.id, track.id, { title: next });
              }}
              onSaveLyrics={(next) => {
                if (!album || !track) return;
                updateTrack(album.id, track.id, { sections: lyricTextToSections(next) });
              }}
            />

            {guided && album && track ? (
              <GuidedReleaseChecklist
                kind="song"
                album={album}
                track={track}
                rightsChecked={rightsChecked}
                houseRelease={houseRelease}
                hasPrivateAudioUrl={Boolean(privateAudioUrl)}
                onDiscoveryChange={saveSongDiscovery}
                onStepActivate={onChecklistStep}
                advanced={
                  isAdmin ? (
                    <div className="space-y-2">
                      <HouseReleaseToggle
                        checked={houseRelease}
                        onChange={(checked) => updateTrack(album.id, track.id, {
                          houseRelease: checked,
                          ...(!checked ? { houseLibraryNotice: false } : {}),
                        })}
                      />
                      {houseRelease ? (
                        <HouseLibraryNoticePing
                          sent={houseLibraryNotice}
                          disabled={releaseStatusOf(track) !== 'live' || !releaseShareIdOf(track)}
                          pinging={pingingHouseNotice}
                          onPing={() => void sendHouseLibraryPing('track')}
                        />
                      ) : null}
                    </div>
                  ) : undefined
                }
              />
            ) : null}

            <div id="release-step-audio" className="scroll-mt-4 space-y-2">
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
                    title={releaseStatusOf(track) === 'live' ? 'Take the release offline before removing audio' : 'Remove private recording'}
                  >
                    {removingAudioId === track.id ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                ) : null}
              </div>
              {hasAudio && track?.dropAudio ? (
                <div id="release-step-preview" className="scroll-mt-4 space-y-2">
                  <p className={cn('font-code text-[10px] text-emerald-400/90')}>
                    {track.dropAudio.fileName || 'Audio on file'}
                    {track.dropAudio.durationSec ? ` · ${Math.round(track.dropAudio.durationSec)}s` : ''}
                    {releaseStatusOf(track) === 'live' ? ' · live release' : ' · private until published'}
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
                <p id="release-step-preview" className="scroll-mt-4 text-[11px] text-muted-foreground">mp3, wav, m4a — preview caps at 30 seconds until they unlock.</p>
              )}
            </div>

            {isAdmin && album && track && !guided ? (
              <div className="space-y-2">
                <HouseReleaseToggle
                  checked={houseRelease}
                  onChange={(checked) => updateTrack(album.id, track.id, {
                    houseRelease: checked,
                    ...(!checked ? { houseLibraryNotice: false } : {}),
                  })}
                />
                {houseRelease ? (
                  <HouseLibraryNoticePing
                    sent={houseLibraryNotice}
                    disabled={releaseStatusOf(track) !== 'live' || !releaseShareIdOf(track)}
                    pinging={pingingHouseNotice}
                    onPing={() => void sendHouseLibraryPing('track')}
                  />
                ) : null}
              </div>
            ) : null}

            <div id="release-step-price" className="scroll-mt-4">
            {houseRelease ? (
              <p className="rounded-xl border border-cyan-400/20 bg-black/25 px-3 py-2 text-[10px] leading-relaxed text-cyan-100/80">
                No price or checkout. Signed-in members receive the complete song automatically.
              </p>
            ) : (
              <PriceEditor
                omitHidden
                allowFreeDrops={freeDropsOn}
                label="2. What they pay"
                price={sellPrice}
                onChange={(next) => {
                  if (!album || !track) return;
                  updateTrack(album.id, track.id, { dropPrice: next });
                }}
              />
            )}
            </div>

            <div id="release-step-rights" className="scroll-mt-4 flex min-h-10 items-center gap-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 px-3">
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
                I have the rights to {houseRelease ? 'distribute' : 'sell'} this recording.
              </Label>
            </div>

            <div id="release-step-publish" className="scroll-mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pickedReleasePlacement && album && track ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-red-400/40 bg-red-500/5 font-bold uppercase text-red-300 hover:bg-red-500/15 hover:text-red-200"
                  disabled={pressing || uploading}
                  onClick={() => void (
                    pickedReleasePlacement === 'album'
                      ? takeReleaseOffline('album', album)
                      : takeReleaseOffline('track', album, track)
                  )}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  {pickedReleasePlacement === 'album' ? 'Take album offline' : 'Take release offline'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 font-bold uppercase"
                  disabled={pressing || uploading || !hasAudio}
                  onClick={() => void savePrivateDraft()}
                >
                  <Save className="mr-2 h-4 w-4" /> Save private draft
                </Button>
              )}
              <Button
                type="button"
                className="h-12 bg-fuchsia-400 font-headline text-lg font-bold uppercase tracking-wide text-black hover:bg-fuchsia-300"
                disabled={pressing || uploading || !hasAudio || !rightsChecked || guidedSongBlocked}
                onClick={() => void pressLive()}
              >
                {pressing ? <Loader className="mr-2 h-5 w-5 animate-spin" /> : <Disc3 className="mr-2 h-5 w-5" />}
                {houseRelease
                  ? releaseStatusOf(track || {}) === 'live'
                    ? 'Update House release'
                    : 'Publish House release'
                  : releaseStatusOf(track || {}) === 'live'
                    ? 'Update live release'
                    : releaseShareIdOf(track || {})
                      ? 'Republish release'
                      : 'Publish release'}
              </Button>
            </div>
            {pickedOfflinePlacement && album && track ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full text-[10px] font-bold uppercase text-red-300 hover:bg-red-500/10 hover:text-red-200"
                disabled={pressing || uploading}
                onClick={() => void (
                  pickedOfflinePlacement === 'album'
                    ? removeReleaseRecord('album', album)
                    : removeReleaseRecord('track', album, track)
                )}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove old release record
              </Button>
            ) : null}
            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
              {houseRelease
                ? 'Save Draft keeps the recording private. Publish House Release adds the full song to every member Library.'
                : 'Save Draft keeps the full recording private. Publish Release creates the preview and sale page. Lyrics can be attached now or later.'}
            </p>
            {releaseRoomMode === 'v1'
              && track
              && releaseStatusOf(track) === 'live'
              && releaseShareIdOf(track) ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-sky-400/35 font-bold uppercase text-sky-200 hover:bg-sky-500/10"
                disabled={pressing || uploading || schedulingRoom}
                onClick={() =>
                  void scheduleListeningRoom(
                    releaseShareIdOf(track)!,
                    track.title || 'Listening room'
                  )
                }
              >
                {schedulingRoom ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="mr-2 h-4 w-4" />
                )}
                Schedule listening room
              </Button>
            ) : null}
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
