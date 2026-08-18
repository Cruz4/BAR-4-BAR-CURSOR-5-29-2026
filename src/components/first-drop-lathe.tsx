'use client';

/**
 * Press a song — sell without opening DNA Drop.
 * Pick a vault track, upload the song, set a price, go live.
 * The public page still carries lyrics; this is the sell desk.
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Banknote, Disc3, Loader, Music, Trash2 } from 'lucide-react';
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
import { uploadDropAudio } from '@/lib/drop-audio-upload';
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

type Picked = { album: Album; track: Track };

export function FirstDropLatheHost() {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const { user } = useAuth();
  const { toast } = useToast();
  const { albums, updateTrack, dropDNA, updateDNA, isCloudSyncActive } = useContext(DataContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [albumScope, setAlbumScope] = useState<string | undefined>();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [rightsChecked, setRightsChecked] = useState(false);

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
      setRightsChecked(false);
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

  const onPickAudio = async (file: File | undefined) => {
    if (!file || !user || !track || !album) return;
    setUploading(true);
    try {
      const meta = await uploadDropAudio({ userId: user.id, projectId: track.id, file });
      updateTrack(album.id, track.id, { dropAudio: meta });
      toast({ title: 'Song uploaded', description: '30-second preview is ready.' });
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
      const shareId = track.shareId
        ? await updateDNA('track', track.id, track.shareId, { albumId: album.id })
        : await dropDNA('track', track.id, { albumId: album.id });
      toast({
        title: 'Pressed live',
        description: 'Visitors hear this first on your Artist Home and this share link.',
      });
      window.open(`/share/${shareId}`, '_blank', 'noopener,noreferrer');
      setOpen(false);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRightsChecked(false);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-fuchsia-500/35 bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl uppercase tracking-tight">
            Press a song
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Pick a track from the vault, upload the song, set a price. You never open DNA Drop to sell —
            that dialog is lyrics only. You keep the rights — we take a small fee on the sale. {firstDropsFeeCashoutLine()}
          </DialogDescription>
        </DialogHeader>

        {!livePicked ? (
          <div className="space-y-3">
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
              <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
                {filtered.map((row) => {
                  const audio = Boolean(normalizeDropAudio(row.track.dropAudio));
                  const live = Boolean(row.track.shareId);
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
                          <span className="block truncate text-sm font-bold">{row.track.title}</span>
                          <span className="block truncate font-code text-[9px] uppercase tracking-widest text-muted-foreground">
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
                    onClick={() => updateTrack(album.id, track.id, { dropAudio: undefined })}
                    aria-label="Remove audio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {hasAudio && track?.dropAudio ? (
                <p className={cn('font-code text-[10px] text-emerald-400/90')}>
                  {track.dropAudio.fileName || 'Audio on file'}
                  {track.dropAudio.durationSec ? ` · ${Math.round(track.dropAudio.durationSec)}s` : ''}
                </p>
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

            <div className="flex items-start gap-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 px-3 py-2.5">
              <Checkbox
                id="drop-rights"
                checked={rightsChecked}
                onCheckedChange={(checked) => setRightsChecked(checked === true)}
                className="mt-0.5 border-fuchsia-300 data-[state=checked]:bg-fuchsia-400 data-[state=checked]:text-black"
              />
              <Label htmlFor="drop-rights" className="cursor-pointer text-[11px] font-medium leading-snug text-foreground/90">
                I have the rights to sell this recording.
              </Label>
            </div>

            <Button
              type="button"
              className="h-12 w-full bg-fuchsia-400 font-headline text-lg font-bold uppercase tracking-wide text-black hover:bg-fuchsia-300"
              disabled={pressing || uploading || !hasAudio || !rightsChecked}
              onClick={() => void pressLive()}
            >
              {pressing ? <Loader className="mr-2 h-5 w-5 animate-spin" /> : <Disc3 className="mr-2 h-5 w-5" />}
              {track?.shareId ? 'Update the live press' : 'Press it live'}
            </Button>
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
