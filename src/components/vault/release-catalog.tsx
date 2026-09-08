'use client';

import React, { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, Disc3, ExternalLink, FileText, Link2, Loader, Music, Radio, Settings2, Trash2, Unlink } from 'lucide-react';
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

const GROUPS: Array<{ key: keyof VaultReleaseGroups; label: string; note: string; shortLabel: string }> = [
  { key: 'privateDrafts', shortLabel: 'Drafts', label: 'Private release drafts', note: 'Uploaded recordings only you can test.' },
  { key: 'offlineReleases', shortLabel: 'Offline', label: 'Offline releases', note: 'Hidden releases you can republish or retire.' },
  { key: 'liveSinglesWithLyrics', shortLabel: 'Live + lyrics', label: 'Live singles · lyrics on sheet', note: 'Music is live and the Vault sheet has lyrics.' },
  { key: 'liveSinglesAudioOnly', shortLabel: 'Live audio', label: 'Live singles · audio only', note: 'Music is live — add lyrics on the sheet when ready.' },
  { key: 'liveAlbumsAllLyrics', shortLabel: 'Albums', label: 'Live albums · all lyrics attached', note: 'Bundles whose tracks all have lyric sheets.' },
  { key: 'liveAlbumsMixedLyrics', shortLabel: 'Mixed albums', label: 'Live albums · mixed', note: 'Bundles with some lyric sheets and some audio-only tracks.' },
  { key: 'liveAlbumsAudioOnly', shortLabel: 'Audio albums', label: 'Live albums · audio only', note: 'Bundle releases without lyric requirements.' },
  { key: 'dnaPreviews', shortLabel: 'DNA Drops', label: 'Live DNA Drops', note: 'Public lyric pages from your Vault sheet (Pro).' },
  { key: 'unpressed', shortLabel: 'Vault only', label: 'Not released yet', note: 'Vault work that is not public yet.' },
];

type GroupKey = keyof VaultReleaseGroups;

const GROUP_STYLE: Record<
  GroupKey,
  { border: string; surface: string; iconWrap: string; icon: string; badge: string; chip: string }
> = {
  privateDrafts: {
    border: 'border-cyan-400/35',
    surface: 'bg-gradient-to-br from-cyan-500/[0.12] via-cyan-950/20 to-black/30',
    iconWrap: 'border-cyan-400/30 bg-cyan-400/15',
    icon: 'text-cyan-200',
    badge: 'border-cyan-400/35 bg-cyan-400/15 text-cyan-100',
    chip: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25',
  },
  offlineReleases: {
    border: 'border-amber-400/30',
    surface: 'bg-gradient-to-br from-amber-500/[0.1] via-amber-950/15 to-black/30',
    iconWrap: 'border-amber-400/30 bg-amber-400/12',
    icon: 'text-amber-200',
    badge: 'border-amber-400/35 bg-amber-400/12 text-amber-100',
    chip: 'border-amber-400/35 bg-amber-500/12 text-amber-100 hover:bg-amber-500/22',
  },
  liveSinglesWithLyrics: {
    border: 'border-fuchsia-400/35',
    surface: 'bg-gradient-to-br from-fuchsia-500/[0.12] via-fuchsia-950/20 to-black/30',
    iconWrap: 'border-fuchsia-400/30 bg-fuchsia-400/15',
    icon: 'text-fuchsia-200',
    badge: 'border-fuchsia-400/35 bg-fuchsia-400/15 text-fuchsia-100',
    chip: 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100 hover:bg-fuchsia-500/25',
  },
  liveSinglesAudioOnly: {
    border: 'border-emerald-400/35',
    surface: 'bg-gradient-to-br from-emerald-500/[0.1] via-emerald-950/20 to-black/30',
    iconWrap: 'border-emerald-400/30 bg-emerald-400/15',
    icon: 'text-emerald-200',
    badge: 'border-emerald-400/35 bg-emerald-400/15 text-emerald-100',
    chip: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25',
  },
  liveAlbumsAllLyrics: {
    border: 'border-sky-400/35',
    surface: 'bg-gradient-to-br from-sky-500/[0.1] via-sky-950/20 to-black/30',
    iconWrap: 'border-sky-400/30 bg-sky-400/15',
    icon: 'text-sky-200',
    badge: 'border-sky-400/35 bg-sky-400/15 text-sky-100',
    chip: 'border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25',
  },
  liveAlbumsMixedLyrics: {
    border: 'border-indigo-400/35',
    surface: 'bg-gradient-to-br from-indigo-500/[0.1] via-indigo-950/20 to-black/30',
    iconWrap: 'border-indigo-400/30 bg-indigo-400/15',
    icon: 'text-indigo-200',
    badge: 'border-indigo-400/35 bg-indigo-400/15 text-indigo-100',
    chip: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25',
  },
  liveAlbumsAudioOnly: {
    border: 'border-blue-400/35',
    surface: 'bg-gradient-to-br from-blue-500/[0.1] via-blue-950/20 to-black/30',
    iconWrap: 'border-blue-400/30 bg-blue-400/15',
    icon: 'text-blue-200',
    badge: 'border-blue-400/35 bg-blue-400/15 text-blue-100',
    chip: 'border-blue-400/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25',
  },
  dnaPreviews: {
    border: 'border-violet-400/35',
    surface: 'bg-gradient-to-br from-violet-500/[0.12] via-violet-950/20 to-black/30',
    iconWrap: 'border-violet-400/30 bg-violet-400/15',
    icon: 'text-violet-200',
    badge: 'border-violet-400/35 bg-violet-400/15 text-violet-100',
    chip: 'border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25',
  },
  unpressed: {
    border: 'border-slate-400/30',
    surface: 'bg-gradient-to-br from-slate-500/[0.08] via-slate-950/20 to-black/30',
    iconWrap: 'border-slate-400/25 bg-slate-400/10',
    icon: 'text-slate-200',
    badge: 'border-slate-400/30 bg-slate-400/10 text-slate-100',
    chip: 'border-slate-400/35 bg-slate-500/12 text-slate-100 hover:bg-slate-500/20',
  },
};

function groupIcon(key: GroupKey) {
  if (key === 'dnaPreviews') return Radio;
  if (key.includes('Album')) return Disc3;
  return Music;
}

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

  const [showEmptySections, setShowEmptySections] = useState(false);

  const groupRows = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        rows: asRows(groups[group.key]),
        style: GROUP_STYLE[group.key],
        Icon: groupIcon(group.key),
      })),
    [groups]
  );

  const totalCount = useMemo(
    () => groupRows.reduce((sum, group) => sum + group.rows.length, 0),
    [groupRows]
  );

  const activeGroups = useMemo(
    () => groupRows.filter((group) => group.rows.length > 0),
    [groupRows]
  );

  const emptyGroups = useMemo(
    () => groupRows.filter((group) => group.rows.length === 0),
    [groupRows]
  );

  const scrollToGroup = (key: GroupKey) => {
    document.getElementById(`release-catalog-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const node = document.getElementById(`release-catalog-${key}`) as HTMLDetailsElement | null;
    if (node) node.open = true;
  };

  const renderRows = (key: GroupKey, rows: Row[]) => (
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
                <span className="block truncate text-base font-bold">{track?.title || album.title || 'Untitled'}</span>
                <span className="block truncate font-code text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
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
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs font-bold uppercase">
                  <Link href={`/share/${dnaId}`}><ExternalLink className="mr-1 h-3 w-3" /> Open lyric page</Link>
                </Button>
              ) : null}
              {releaseId && status === 'live' ? (
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs font-bold uppercase">
                  <Link href={track ? `/song/${releaseId}` : `/share/${releaseId}`}>
                    <ExternalLink className="mr-1 h-3 w-3" /> Open release
                  </Link>
                </Button>
              ) : null}
              {dnaGroup ? (
                <Button asChild size="sm" variant="outline" className="h-9 text-xs font-bold uppercase">
                  <Link href={track ? `/albums/${album.id}/tracks/${track.id}` : `/albums/${album.id}`}><Settings2 className="mr-1 h-3 w-3" /> Manage in Vault</Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-9 text-xs font-bold uppercase" onClick={() => openFirstDropLathe({ albumId: album.id, ...(track ? { trackId: track.id } : { mode: 'album' as const }) })}>
                  <Settings2 className="mr-1 h-3 w-3" /> {status === 'live' ? 'Update' : 'Open release desk'}
                </Button>
              )}
              {track && !hasLyrics(track) && normalizeDropAudio(track.dropAudio) ? (
                <>
                  <Button asChild size="sm" variant="outline" className="h-9 text-xs font-bold uppercase">
                    <Link href={`/albums/${album.id}/tracks/${track.id}`}><FileText className="mr-1 h-3 w-3" /> Start lyrics</Link>
                  </Button>
                  {lyricSheets.length ? (
                    <Button size="sm" variant="outline" className="h-9 text-xs font-bold uppercase" onClick={() => setAttach({ album, track })}>
                      <Link2 className="mr-1 h-3 w-3" /> Attach existing
                    </Button>
                  ) : null}
                </>
              ) : null}
              {!dnaGroup && status === 'live' ? (
                <Button size="sm" variant="outline" className="h-9 border-red-400/30 text-xs font-bold uppercase text-red-300" onClick={() => setUnpress({ kind: track ? 'track' : 'album', album, track })}>
                  <Unlink className="mr-1 h-3 w-3" /> Take offline
                </Button>
              ) : null}
              {!dnaGroup && status === 'unlisted' && releaseId ? (
                <Button size="sm" variant="outline" className="h-9 border-red-400/30 text-xs font-bold uppercase text-red-300" onClick={() => setRemove({ kind: track ? 'track' : 'album', album, track })}>
                  <Trash2 className="mr-1 h-3 w-3" /> Remove release
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );

  const renderGroupCard = (
    { key, label, note, shortLabel, rows, style, Icon }: (typeof groupRows)[number],
    opts?: { compactEmpty?: boolean }
  ) => (
    <details
      key={key}
      id={`release-catalog-${key}`}
      className={cn(
        'group scroll-mt-3 overflow-hidden rounded-xl border shadow-sm',
        style.border,
        style.surface,
        rows.length === 0 && opts?.compactEmpty && 'opacity-70'
      )}
      open={rows.length > 0}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', style.iconWrap, style.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold uppercase tracking-wide text-foreground">{label}</span>
          <span className="block text-xs leading-relaxed text-muted-foreground sm:text-sm">{note}</span>
        </span>
        <span className={cn('rounded-full border px-2 py-1 font-code text-xs font-bold', style.badge)}>
          {rows.length}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      {rows.length ? (
        renderRows(key, rows)
      ) : (
        <p className="border-t border-white/10 px-3 py-3 text-xs text-muted-foreground sm:text-sm">
          Nothing in {shortLabel.toLowerCase()} yet.
        </p>
      )}
    </details>
  );

  return (
    <section className={cn('min-w-0 space-y-4', className)} aria-label="Release catalog contents">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {totalCount === 0 ? (
            <>
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
                Your catalog is empty — that is normal when you are just getting started.
              </p>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Upload a recording with <strong className="text-foreground">New release</strong>, write lyrics in The Vault, then DNA Drop when you want lyrics public (Pro).
              </p>
            </>
          ) : (
            <>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">{totalCount}</span> item{totalCount === 1 ? '' : 's'} across{' '}
                <span className="font-bold text-foreground">{activeGroups.length}</span> section{activeGroups.length === 1 ? '' : 's'}.
                Jump below or expand a colored group.
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cyan-100/75 sm:text-sm">
                New release = music. DNA Drop = public lyrics from your Vault sheet.
              </p>
            </>
          )}
        </div>
        <Button type="button" className="bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300" onClick={() => openFirstDropLathe()}>
          <Disc3 className="mr-2 h-4 w-4" /> New release
        </Button>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-gradient-to-br from-cyan-500/[0.08] via-fuchsia-500/[0.05] to-violet-500/[0.08] px-5 py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200">
            <Disc3 className="h-7 w-7" />
          </span>
          <p className="mt-4 font-headline text-lg font-bold uppercase tracking-tight text-foreground">Nothing released yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Sections for live singles, albums, DNA Drops, and drafts appear here automatically once you create them. No need to hunt through empty folders.
          </p>
          <Button type="button" className="mt-5 bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300" onClick={() => openFirstDropLathe()}>
            <Disc3 className="mr-2 h-4 w-4" /> Start your first release
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {activeGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => scrollToGroup(group.key)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors sm:text-xs',
                  group.style.chip
                )}
              >
                {group.shortLabel} · {group.rows.length}
              </button>
            ))}
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            {activeGroups.map((group) => renderGroupCard(group))}
          </div>

          {emptyGroups.length > 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <button
                type="button"
                onClick={() => setShowEmptySections((value) => !value)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground sm:text-sm">
                  {showEmptySections ? 'Hide' : 'Show'} empty sections ({emptyGroups.length})
                </span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showEmptySections && 'rotate-180')} />
              </button>
              {showEmptySections ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {emptyGroups.map((group) => renderGroupCard(group, { compactEmpty: true }))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

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
                <span className="min-w-0"><span className="block truncate text-base font-bold">{track.title}</span><span className="block truncate text-xs text-muted-foreground sm:text-sm">{album.title}</span></span>
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
          <DialogDescription className="text-sm leading-relaxed sm:text-base">
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
