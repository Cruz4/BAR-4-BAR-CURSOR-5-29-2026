'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, Disc3, ExternalLink, FileText, Gift, Link2, Loader, Music, Radio, Settings2, Trash2, Unlink } from 'lucide-react';
import { DataContext } from '@/context/data-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { attachReleaseToSheet, manageRelease } from '@/lib/release-management-client';
import { ReleaseDnaStatusBadges } from '@/components/release-dna-status-badges';
import {
  findVaultReleaseByShareId,
  groupVaultReleases,
  hasLyrics,
  liveLyricDnaCatalogRows,
  releaseShareIdOf,
  releaseStatusOf,
  type VaultReleaseGroups,
} from '@/lib/release-management';
import { deleteDropAudioFiles } from '@/lib/drop-audio-upload';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { fetchArtistHomeConfig, setHouseReleaseOnHome, subscribeHouseReleaseHome } from '@/lib/profile/artist-home-client';
import { useLinkedHouseReleases } from '@/hooks/use-linked-house-releases';
import { isHouseReleaseVisibleOnHome, type LinkedHouseRelease } from '@/lib/house-artist-link';
import { pressedSongHref } from '@/lib/pressed-song';
import {
  applyReleaseCatalogScrollRestore,
  catalogLinkHref,
  consumeReleaseCatalogReopen,
  RELEASE_CATALOG_SCROLL_ID,
} from '@/lib/release-catalog-navigation';
import type { Album, Track } from '@/lib/types';
import { cn } from '@/lib/utils';

type Row = { album: Album; track?: Track };
type UnpressTarget = { kind: 'album' | 'track'; album?: Album; track?: Track; shareId?: string };
type RemoveTarget = UnpressTarget;
type DraftActionTarget = {
  kind: 'album' | 'track';
  album: Album;
  track?: Track;
  action: 'removeRecording' | 'scrapDraft';
};
type GroupKey = keyof VaultReleaseGroups;
type CatalogSectionId = GroupKey | 'liveMusic' | 'house';

const LIVE_MUSIC_KEYS = [
  'liveSinglesWithLyrics',
  'liveSinglesAudioOnly',
  'liveAlbumsAllLyrics',
  'liveAlbumsMixedLyrics',
  'liveAlbumsAudioOnly',
] as const satisfies readonly GroupKey[];

const LIVE_EMPTY_META: Record<
  (typeof LIVE_MUSIC_KEYS)[number],
  { label: string; note: string; shortLabel: string }
> = {
  liveSinglesWithLyrics: {
    label: 'Live singles · lyrics on sheet',
    shortLabel: 'Live + lyrics',
    note: 'Music is live and the Vault sheet has lyrics.',
  },
  liveSinglesAudioOnly: {
    label: 'Live singles · audio only',
    shortLabel: 'Live audio',
    note: 'Music is live — add lyrics on the sheet when ready.',
  },
  liveAlbumsAllLyrics: {
    label: 'Live albums · all lyrics attached',
    shortLabel: 'Albums · lyrics',
    note: 'Album bundles whose tracks all have lyric sheets.',
  },
  liveAlbumsMixedLyrics: {
    label: 'Live albums · mixed',
    shortLabel: 'Mixed albums',
    note: 'Album bundles with some lyric sheets and some audio-only tracks.',
  },
  liveAlbumsAudioOnly: {
    label: 'Live albums · audio only',
    shortLabel: 'Audio albums',
    note: 'Album bundles without lyric requirements.',
  },
};

const HOUSE_EMPTY_SLOT = {
  id: 'house' as const,
  zone: 'public' as const,
  label: 'House catalog · linked to you',
  shortLabel: 'House',
  note: 'Free Library releases AKAsheet links to your Artist Home. Nothing linked yet — when admin credits you, it appears here with its lyric strands.',
};

/** Vault grouping keys → catalog sections (live music merged for readability). */
const CATALOG_SECTION_DEFS: Array<{
  id: GroupKey | 'liveMusic';
  zone: 'public' | 'private' | 'vault';
  label: string;
  note: string;
  shortLabel: string;
  sourceKey?: GroupKey;
}> = [
  {
    id: 'liveMusic',
    zone: 'public',
    label: 'Live music · public',
    shortLabel: 'Live music',
    note: 'Released recordings fans can stream or buy. Singles and album bundles in one place.',
  },
  {
    id: 'dnaPreviews',
    zone: 'public',
    sourceKey: 'dnaPreviews',
    label: 'Live Lyrics DNA Drops · public',
    shortLabel: 'Lyrics DNA',
    note: 'Lyric pages you published separately — not the strands already listed under a House release above.',
  },
  {
    id: 'offlineReleases',
    zone: 'public',
    sourceKey: 'offlineReleases',
    label: 'Offline · was public',
    shortLabel: 'Offline',
    note: 'Hidden from discovery — republish or remove the release record when you are ready.',
  },
  {
    id: 'privateDrafts',
    zone: 'private',
    sourceKey: 'privateDrafts',
    label: 'Private release drafts',
    shortLabel: 'Drafts',
    note: 'Uploaded audio only you can test before publishing.',
  },
  {
    id: 'unpressed',
    zone: 'vault',
    sourceKey: 'unpressed',
    label: 'Vault only · not released',
    shortLabel: 'Vault only',
    note: 'Sheets and ideas with no public music or lyric page yet.',
  },
];

const ZONE_COPY: Record<(typeof CATALOG_SECTION_DEFS)[number]['zone'], { title: string; note: string }> = {
  public: {
    title: 'Live & public',
    note: 'House music + its lyric strands stay together. Other live music and standalone lyric DNA are separate below.',
  },
  private: {
    title: 'Private',
    note: 'Only you — nothing on Artist Home or share links until you publish.',
  },
  vault: {
    title: 'Vault workshop',
    note: 'Work in progress — not live yet.',
  },
};

const GROUPS: Array<{ key: GroupKey }> = [
  { key: 'privateDrafts' },
  { key: 'dnaPreviews' },
  { key: 'offlineReleases' },
  { key: 'liveSinglesWithLyrics' },
  { key: 'liveSinglesAudioOnly' },
  { key: 'liveAlbumsAllLyrics' },
  { key: 'liveAlbumsMixedLyrics' },
  { key: 'liveAlbumsAudioOnly' },
  { key: 'unpressed' },
];

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

function sectionStyle(id: CatalogSectionId) {
  if (id === 'liveMusic') return GROUP_STYLE.liveSinglesAudioOnly;
  return GROUP_STYLE[id as GroupKey];
}

function sectionIcon(id: CatalogSectionId) {
  if (id === 'liveMusic') return Music;
  return groupIcon(id as GroupKey);
}

function CatalogVisibilityPills({
  listKey,
  status,
}: {
  listKey: GroupKey | 'liveMusic';
  status: ReturnType<typeof releaseStatusOf>;
}) {
  const dnaLive = listKey === 'dnaPreviews';
  if (dnaLive) {
    return (
      <span className="inline-flex rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-violet-100">
        Public · lyric DNA
      </span>
    );
  }
  if (listKey === 'liveMusic' || status === 'live') {
    return (
      <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-emerald-100">
        Public · music live
      </span>
    );
  }
  if (status === 'unlisted') {
    return (
      <span className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-amber-100">
        Offline · hidden
      </span>
    );
  }
  if (status === 'draft' || listKey === 'privateDrafts') {
    return (
      <span className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-cyan-100">
        Private · draft
      </span>
    );
  }
  if (listKey === 'unpressed' || !status) {
    return (
      <span className="inline-flex rounded-full border border-slate-400/35 bg-slate-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-slate-200">
        Vault only
      </span>
    );
  }
  return null;
}

function CatalogZone({
  zone,
  itemCount,
  children,
}: {
  zone: keyof typeof ZONE_COPY;
  itemCount: number;
  children: React.ReactNode;
}) {
  const copy = ZONE_COPY[zone];
  return (
    <section
      id={`release-catalog-zone-${zone}`}
      className={cn(
        'scroll-mt-3 overflow-hidden rounded-xl border shadow-sm',
        zone === 'public' &&
          'border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.08] via-black/15 to-black/40',
        zone === 'private' &&
          'border-cyan-400/22 bg-gradient-to-b from-cyan-500/[0.07] via-black/15 to-black/40',
        zone === 'vault' && 'border-slate-400/22 bg-gradient-to-b from-slate-500/[0.06] via-black/15 to-black/45'
      )}
      aria-label={copy.title}
    >
      <header
        className={cn(
          'border-b px-3 py-2.5 sm:px-4 sm:py-3',
          zone === 'public' && 'border-emerald-400/15 bg-black/20',
          zone === 'private' && 'border-cyan-400/15 bg-black/20',
          zone === 'vault' && 'border-slate-400/15 bg-black/20'
        )}
      >
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 text-center font-headline text-xs font-bold uppercase tracking-[0.16em] sm:text-sm',
              zone === 'public' && 'text-emerald-100/95',
              zone === 'private' && 'text-cyan-100/95',
              zone === 'vault' && 'text-slate-100/95'
            )}
          >
            {copy.title}
          </p>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 font-code text-[10px] font-bold tabular-nums sm:text-[11px]',
              zone === 'public' && 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100',
              zone === 'private' && 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
              zone === 'vault' && 'border-slate-400/30 bg-slate-500/10 text-slate-100'
            )}
          >
            {itemCount}
          </span>
        </div>
        <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">{copy.note}</p>
      </header>
      <div className="space-y-2 p-2 sm:p-3">{children}</div>
    </section>
  );
}

function asRows(value: VaultReleaseGroups[keyof VaultReleaseGroups]): Row[] {
  return value.map((item) => ('album' in item ? item : { album: item as Album }));
}

type HouseCatalogRow = LinkedHouseRelease & {
  vault?: Row;
};

function vaultHouseRows(albums: Album[]): HouseCatalogRow[] {
  const rows: HouseCatalogRow[] = [];
  const seen = new Set<string>();
  const push = (shareId: string | undefined, row: HouseCatalogRow) => {
    const id = shareId?.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    rows.push({ ...row, shareId: id });
  };
  for (const album of albums) {
    const albumRecord = { ...album, tracks: album.tracks };
    const albumShareId = releaseShareIdOf(albumRecord);
    const albumStatus = releaseStatusOf(albumRecord);
    if (
      albumShareId &&
      (albumStatus === 'live' || albumStatus === 'unlisted') &&
      (album.houseRelease || album.houseLibraryNotice)
    ) {
      push(albumShareId, {
        shareId: '',
        title: album.title || 'Untitled album',
        type: 'album',
        trackCount: album.tracks.length,
        releaseLive: albumStatus === 'live',
        vault: { album },
      });
    }
    for (const track of album.tracks || []) {
      const trackStatus = releaseStatusOf(track);
      if (trackStatus !== 'live' && trackStatus !== 'unlisted') continue;
      if (!track.houseRelease && !track.houseLibraryNotice) continue;
      const trackShareId = releaseShareIdOf(track);
      if (trackShareId && trackShareId === albumShareId) continue;
      push(trackShareId, {
        shareId: '',
        title: track.title || 'Untitled',
        type: 'track',
        albumTitle: album.title,
        ...(albumShareId ? { albumShareId } : {}),
        releaseLive: trackStatus === 'live',
        vault: { album, track },
      });
    }
  }
  return rows;
}

function collapseHouseCatalogRows(rows: HouseCatalogRow[]): HouseCatalogRow[] {
  const albumIds = new Set(rows.filter((row) => row.type === 'album').map((row) => row.shareId));
  return rows.filter((row) => {
    if (row.type !== 'track') return true;
    if (albumIds.has(row.shareId)) return false;
    if (row.albumShareId && albumIds.has(row.albumShareId)) return false;
    const parentShare = row.vault?.album
      ? releaseShareIdOf({ ...row.vault.album, tracks: row.vault.album.tracks })
      : undefined;
    if (parentShare && albumIds.has(parentShare)) return false;
    return true;
  });
}

function dnaRowMusicReleaseShareId(row: Row): string | undefined {
  const id = releaseShareIdOf(row.track || { ...row.album, tracks: row.album.tracks });
  return id?.trim() || undefined;
}

function splitHouseLinkedDnaRows(rows: Row[], houseShareIds: Set<string>) {
  const byHouseShare = new Map<string, Row[]>();
  const standalone: Row[] = [];
  for (const row of rows) {
    const musicShareId = dnaRowMusicReleaseShareId(row);
    const dnaShareId = (row.track?.shareId || row.album.shareId)?.trim();
    const houseKey =
      (musicShareId && houseShareIds.has(musicShareId) && musicShareId) ||
      (dnaShareId && houseShareIds.has(dnaShareId) && dnaShareId) ||
      undefined;
    if (houseKey) {
      const bucket = byHouseShare.get(houseKey) ?? [];
      bucket.push(row);
      byHouseShare.set(houseKey, bucket);
    } else {
      standalone.push(row);
    }
  }
  for (const [key, bucket] of byHouseShare) {
    bucket.sort((a, b) => {
      const titleA = (a.track?.title || a.album.title || '').toLocaleLowerCase();
      const titleB = (b.track?.title || b.album.title || '').toLocaleLowerCase();
      return titleA.localeCompare(titleB);
    });
    byHouseShare.set(key, bucket);
  }
  return { byHouseShare, standalone };
}

function houseRowLinkedDna(
  row: HouseCatalogRow,
  byHouseShare: Map<string, Row[]>
): Row[] {
  const direct = byHouseShare.get(row.shareId) ?? [];
  if (direct.length) return direct;
  if (row.albumShareId) return byHouseShare.get(row.albumShareId) ?? [];
  return [];
}

type ReleaseCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

function ReleaseCatalogBody({
  className,
  catalogOpen = true,
}: {
  className?: string;
  catalogOpen?: boolean;
}) {
  const { albums, updateAlbum, updateTrack, deleteTrack, moveTrack, flushCloudNow } = useContext(DataContext);
  const { user } = useAuth();
  const { toast } = useToast();
  const groups = useMemo(() => groupVaultReleases(albums), [albums]);
  const lyricSheets = useMemo(
    () => albums.flatMap((album) => album.tracks.filter((track) => hasLyrics(track) && !normalizeDropAudio(track.dropAudio)).map((track) => ({ album, track }))),
    [albums]
  );
  const [busy, setBusy] = useState('');
  const [unpress, setUnpress] = useState<UnpressTarget | null>(null);
  const [remove, setRemove] = useState<RemoveTarget | null>(null);
  const [draftDraft, setDraftDraft] = useState<DraftActionTarget | null>(null);
  const [attach, setAttach] = useState<Row | null>(null);
  const { linkedHouse, loadingHouse, refreshLinkedHouse } = useLinkedHouseReleases(user?.id, catalogOpen);
  const [hiddenHouseIds, setHiddenHouseIds] = useState<string[]>([]);
  const [houseHomeBusy, setHouseHomeBusy] = useState('');

  useEffect(() => {
    if (catalogOpen) refreshLinkedHouse();
  }, [catalogOpen, refreshLinkedHouse]);

  useEffect(() => {
    if (!user?.id) {
      setHiddenHouseIds([]);
      return;
    }
    let cancelled = false;
    void fetchArtistHomeConfig()
      .then((homeConfig) => {
        if (!cancelled) setHiddenHouseIds(homeConfig?.featured.hiddenHouseReleaseShareIds || []);
      })
      .catch(() => {
        if (!cancelled) setHiddenHouseIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => subscribeHouseReleaseHome(setHiddenHouseIds), []);

  useEffect(() => {
    if (!catalogOpen) return;
    const state = consumeReleaseCatalogReopen();
    applyReleaseCatalogScrollRestore(state);
  }, [catalogOpen]);

  const houseRows = useMemo(() => {
    const byId = new Map<string, HouseCatalogRow>();
    for (const row of vaultHouseRows(albums)) byId.set(row.shareId, row);
    for (const item of linkedHouse) {
      const existing = byId.get(item.shareId);
      if (existing) {
        byId.set(item.shareId, { ...existing, ...item, vault: existing.vault });
        continue;
      }
      byId.set(item.shareId, {
        ...item,
        vault: findVaultReleaseByShareId(albums, item.shareId),
      });
    }
    return collapseHouseCatalogRows([...byId.values()]);
  }, [albums, linkedHouse]);

  const houseShareIds = useMemo(() => new Set(houseRows.map((row) => row.shareId)), [houseRows]);

  const unpressRelease = async (hideDna: boolean) => {
    if (!unpress) return;
    const { kind, album, track, shareId } = unpress;
    if (!album && !shareId) return;
    const key = `${kind}:${track?.id || album?.id || shareId}`;
    setBusy(key);
    try {
      if (album) await flushCloudNow();
      const result = await manageRelease({
        kind,
        action: 'unpublish',
        ...(album ? { albumId: album.id } : {}),
        ...(track ? { trackId: track.id } : {}),
        ...(shareId ? { shareId } : {}),
        hideDna,
      });
      const patch = {
        releaseStatus: 'unlisted' as const,
        ...(result.releaseShareId ? { releaseShareId: result.releaseShareId } : {}),
        ...(hideDna ? { dnaStatus: 'unlisted' as const } : {}),
      };
      if (album && track) updateTrack(album.id, track.id, patch);
      else if (album) updateAlbum(album.id, patch);
      if (shareId) refreshLinkedHouse();
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

  const isEditablePrivateDraft = (album: Album, track: Track | undefined, status: ReturnType<typeof releaseStatusOf>) => {
    if (status !== 'draft') return false;
    const subject = track || { ...album, tracks: album.tracks };
    return !releaseShareIdOf(subject);
  };

  const draftRowHasRecording = (album: Album, track: Track | undefined) =>
    track
      ? Boolean(normalizeDropAudio(track.dropAudio))
      : (album.tracks || []).some((row) => Boolean(normalizeDropAudio(row.dropAudio)));

  const runDraftDraftAction = async () => {
    if (!draftDraft) return;
    const { kind, album, track, action } = draftDraft;
    const key = `${action}:${kind}:${track?.id || album.id}`;
    setBusy(key);
    try {
      await flushCloudNow();
      if (action === 'removeRecording') {
        const targets = track ? [track] : (album.tracks || []);
        for (const row of targets) {
          const audio = normalizeDropAudio(row.dropAudio);
          if (!audio) continue;
          await deleteDropAudioFiles(audio);
          updateTrack(album.id, row.id, { dropAudio: undefined, releaseStatus: 'draft' });
        }
        if (!track) updateAlbum(album.id, { releaseStatus: 'draft' });
        toast({
          title: track ? 'Private recording removed' : 'Album recordings removed',
          description: 'Lyric sheets and other Vault work were kept.',
        });
      } else if (track) {
        const audio = normalizeDropAudio(track.dropAudio);
        if (audio) await deleteDropAudioFiles(audio);
        deleteTrack(album.id, track.id);
        toast({
          title: 'Draft removed from Vault',
          description: `"${track.title || 'This song'}" was deleted from your catalog.`,
        });
      }
      setDraftDraft(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: action === 'removeRecording' ? 'Could not remove recording' : 'Could not delete draft',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy('');
    }
  };

  const removeRelease = async (hideDna: boolean) => {
    if (!remove?.album) return;
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const liveDnaRows = useMemo(() => liveLyricDnaCatalogRows(albums), [albums]);

  const { houseLinkedDnaByShare, standaloneDnaRows, houseLinkedDnaTotal } = useMemo(() => {
    const { byHouseShare, standalone } = splitHouseLinkedDnaRows(liveDnaRows, houseShareIds);
    let total = 0;
    for (const rows of byHouseShare.values()) total += rows.length;
    return {
      houseLinkedDnaByShare: byHouseShare,
      standaloneDnaRows: standalone,
      houseLinkedDnaTotal: total,
    };
  }, [liveDnaRows, houseShareIds]);

  const groupRows = useMemo(
    () =>
      GROUPS.map((group) => ({
        key: group.key,
        rows:
          group.key === 'dnaPreviews'
            ? standaloneDnaRows
            : asRows(groups[group.key]).filter((row) => {
                const shareId = releaseShareIdOf(row.track || { ...row.album, tracks: row.album.tracks });
                return !shareId || !houseShareIds.has(shareId);
              }),
      })),
    [groups, houseShareIds, standaloneDnaRows]
  );

  const catalogSections = useMemo(() => {
    const rowMap = new Map(groupRows.map((entry) => [entry.key, entry.rows]));
    return CATALOG_SECTION_DEFS.map((def) => {
      const rows =
        def.id === 'liveMusic'
          ? LIVE_MUSIC_KEYS.flatMap((key) => rowMap.get(key) ?? [])
          : rowMap.get((def.sourceKey ?? def.id) as GroupKey) ?? [];
      const listKey: GroupKey | 'liveMusic' = def.id === 'liveMusic' ? 'liveMusic' : (def.sourceKey ?? def.id) as GroupKey;
      return {
        ...def,
        rows,
        listKey,
        style: sectionStyle(def.id),
        Icon: sectionIcon(def.id),
      };
    });
  }, [groupRows]);

  const vaultCount = useMemo(
    () => catalogSections.reduce((sum, section) => sum + section.rows.length, 0),
    [catalogSections]
  );
  const totalCount = vaultCount + houseRows.length;

  const activeSections = useMemo(
    () => catalogSections.filter((section) => section.rows.length > 0),
    [catalogSections]
  );

  const emptyCatalogSlots = useMemo(() => {
    const rowMap = new Map(groupRows.map((entry) => [entry.key, entry.rows]));
    type EmptySlot = {
      id: CatalogSectionId;
      zone: 'public' | 'private' | 'vault';
      label: string;
      note: string;
      shortLabel: string;
      rows: Row[];
      listKey: GroupKey | 'liveMusic';
      style: (typeof GROUP_STYLE)[GroupKey];
      Icon: typeof Music;
    };
    const slots: EmptySlot[] = [];

    if (!houseRows.length) {
      slots.push({
        ...HOUSE_EMPTY_SLOT,
        rows: [],
        listKey: 'liveMusic',
        style: {
          border: 'border-cyan-400/40',
          surface: 'bg-gradient-to-br from-cyan-500/[0.1] via-cyan-950/20 to-black/30',
          iconWrap: 'border-cyan-400/30 bg-cyan-400/15',
          icon: 'text-cyan-200',
          badge: 'border-cyan-400/35 bg-cyan-400/15 text-cyan-100',
          chip: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25',
        },
        Icon: Gift,
      });
    }

    for (const key of LIVE_MUSIC_KEYS) {
      if ((rowMap.get(key)?.length ?? 0) > 0) continue;
      const meta = LIVE_EMPTY_META[key];
      slots.push({
        id: key,
        zone: 'public',
        label: meta.label,
        note: meta.note,
        shortLabel: meta.shortLabel,
        rows: [],
        listKey: 'liveMusic',
        style: GROUP_STYLE[key],
        Icon: groupIcon(key),
      });
    }

    const standaloneDnaEmpty = standaloneDnaRows.length === 0;
    if (standaloneDnaEmpty) {
      slots.push({
        id: 'dnaPreviews',
        zone: 'public',
        label: 'Live Lyrics DNA Drops · public (standalone)',
        shortLabel: 'Lyrics DNA',
        note:
          houseLinkedDnaTotal > 0
            ? 'Your live lyric pages on this House release are under House above. This slot is for extra lyric DNA you publish apart from House.'
            : 'Pro lyric pages on /share and Artist Home — publish from Vault when ready.',
        rows: [],
        listKey: 'dnaPreviews',
        style: GROUP_STYLE.dnaPreviews,
        Icon: Radio,
      });
    }

    if ((rowMap.get('offlineReleases')?.length ?? 0) === 0) {
      const def = CATALOG_SECTION_DEFS.find((d) => d.id === 'offlineReleases')!;
      slots.push({
        id: 'offlineReleases',
        zone: def.zone,
        label: def.label,
        note: def.note,
        shortLabel: def.shortLabel,
        rows: [],
        listKey: 'offlineReleases',
        style: GROUP_STYLE.offlineReleases,
        Icon: groupIcon('offlineReleases'),
      });
    }

    if ((rowMap.get('privateDrafts')?.length ?? 0) === 0) {
      const def = CATALOG_SECTION_DEFS.find((d) => d.id === 'privateDrafts')!;
      slots.push({
        id: 'privateDrafts',
        zone: def.zone,
        label: def.label,
        note: def.note,
        shortLabel: def.shortLabel,
        rows: [],
        listKey: 'privateDrafts',
        style: GROUP_STYLE.privateDrafts,
        Icon: groupIcon('privateDrafts'),
      });
    }

    if ((rowMap.get('unpressed')?.length ?? 0) === 0) {
      const def = CATALOG_SECTION_DEFS.find((d) => d.id === 'unpressed')!;
      slots.push({
        id: 'unpressed',
        zone: def.zone,
        label: def.label,
        note: def.note,
        shortLabel: def.shortLabel,
        rows: [],
        listKey: 'unpressed',
        style: GROUP_STYLE.unpressed,
        Icon: groupIcon('unpressed'),
      });
    }

    return slots;
  }, [groupRows, houseRows.length, standaloneDnaRows.length, houseLinkedDnaTotal]);

  const visibleSectionCount = activeSections.length + (houseRows.length ? 1 : 0);

  const publicZoneItemCount =
    houseRows.length +
    houseLinkedDnaTotal +
    activeSections.filter((s) => s.zone === 'public').reduce((sum, s) => sum + s.rows.length, 0);
  const privateZoneItemCount = activeSections
    .filter((s) => s.zone === 'private')
    .reduce((sum, s) => sum + s.rows.length, 0);
  const vaultZoneItemCount = activeSections
    .filter((s) => s.zone === 'vault')
    .reduce((sum, s) => sum + s.rows.length, 0);

  const scrollToGroup = (key: CatalogSectionId | 'house') => {
    setExpandedSection(key);
    window.requestAnimationFrame(() => {
      document.getElementById(`release-catalog-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const toggleSection = (key: string) => {
    setExpandedSection((current) => (current === key ? null : key));
  };

  const setHouseOnHome = async (shareId: string, visible: boolean) => {
    setHouseHomeBusy(shareId);
    try {
      const next = await setHouseReleaseOnHome(shareId, visible);
      setHiddenHouseIds(next);
      toast({
        title: visible ? 'Showing on Artist Home' : 'Hidden from Artist Home',
        description: 'Same switch as Module Deck. Members keep this House release in Library either way.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not update Artist Home',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setHouseHomeBusy('');
    }
  };

  const renderRows = (
    listKey: GroupKey | 'liveMusic',
    rows: Row[],
    opts?: { houseLyricStrand?: boolean; catalogSectionId?: string }
  ) => {
    const sectionId =
      opts?.catalogSectionId ??
      (opts?.houseLyricStrand ? 'release-catalog-house' : `release-catalog-${listKey}`);
    return (
    <ul
      className={cn(
        'space-y-2',
        opts?.houseLyricStrand ? 'mt-2' : 'max-h-[min(42vh,380px)] overflow-y-auto overscroll-contain border-t border-white/10 p-2.5'
      )}
    >
      {rows.map(({ album, track }) => {
        const dnaGroup = listKey === 'dnaPreviews';
        const dnaId = track?.shareId || album.shareId;
        const musicReleaseId = releaseShareIdOf(track || { ...album, tracks: album.tracks });
        const releaseId = musicReleaseId;
        const status = releaseStatusOf(track || { ...album, tracks: album.tracks });
        const rowKey = `${listKey}:${opts?.houseLyricStrand ? 'house' : 'main'}:${album.id}:${track?.id || 'album'}`;
        return (
          <li
            key={rowKey}
            className={cn(
              'rounded-lg border bg-slate-950/75 p-2.5',
              opts?.houseLyricStrand ? 'border-violet-400/25 bg-violet-950/30' : 'border-white/10'
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-bold">{track?.title || album.title || 'Untitled'}</span>
                  {opts?.houseLyricStrand ? (
                    <span className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-cyan-100">
                      House · lyric strand
                    </span>
                  ) : (
                    <CatalogVisibilityPills listKey={listKey} status={status} />
                  )}
                </span>
                <span className="block truncate font-code text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                  {track
                    ? dnaGroup || opts?.houseLyricStrand
                      ? `${album.title} · lyric DNA page`
                      : `${album.title} · ${hasLyrics(track) ? 'lyrics on sheet' : 'audio only'}`
                    : dnaGroup
                      ? `${album.tracks.length} tracks`
                      : `${album.tracks.length} tracks · album release`}
                  {listKey === 'liveMusic' && !track && !dnaGroup ? ' · bundle' : ''}
                  {listKey === 'liveMusic' && track && !dnaGroup ? ' · single' : ''}
                  {opts?.houseLyricStrand ? ' · tied to this House release' : ''}
                  {!opts?.houseLyricStrand && dnaGroup && musicReleaseId ? ' · linked music release' : ''}
                  {!dnaGroup && (track?.houseRelease || (!track && album.houseRelease)) ? ' · House · Free' : ''}
                  {!dnaGroup && (track?.houseLibraryNotice || (!track && album.houseLibraryNotice)) ? ' · Library notice on' : ''}
                </span>
                {!dnaGroup ? (
                  <ReleaseDnaStatusBadges
                    className="mt-1.5"
                    album={album}
                    track={track}
                    dnaShareId={track?.shareId || album.shareId}
                  />
                ) : null}
              </span>
              {busy.endsWith(track?.id || album.id) ? <Loader className="h-4 w-4 animate-spin" /> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dnaGroup && dnaId ? (
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs font-bold uppercase">
                  <Link href={catalogLinkHref(`/share/${dnaId}`, sectionId)}>
                    <ExternalLink className="mr-1 h-3 w-3" /> Open lyric page
                  </Link>
                </Button>
              ) : null}
              {releaseId && (dnaGroup || status === 'live') && !opts?.houseLyricStrand ? (
                <Button
                  asChild
                  size="sm"
                  variant={dnaGroup ? 'outline' : 'secondary'}
                  className="h-9 text-xs font-bold uppercase"
                >
                  <Link
                    href={catalogLinkHref(
                      track
                        ? pressedSongHref(releaseId, { trackId: track.id })
                        : `/share/${releaseId}`,
                      sectionId
                    )}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" /> {dnaGroup ? 'Linked music' : 'Open release'}
                  </Link>
                </Button>
              ) : null}
              {dnaGroup ? (
                <Button asChild size="sm" variant="outline" className="h-9 text-xs font-bold uppercase">
                  <Link
                    href={catalogLinkHref(
                      track ? `/albums/${album.id}/tracks/${track.id}` : `/albums/${album.id}`,
                      sectionId
                    )}
                  >
                    <Settings2 className="mr-1 h-3 w-3" /> Manage in Vault
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-9 text-xs font-bold uppercase" onClick={() => openFirstDropLathe({ albumId: album.id, ...(track ? { trackId: track.id } : { mode: 'album' as const }) })}>
                  <Settings2 className="mr-1 h-3 w-3" /> {status === 'live' ? 'Update' : 'Open release desk'}
                </Button>
              )}
              {track && !hasLyrics(track) && normalizeDropAudio(track.dropAudio) ? (
                <>
                  <Button asChild size="sm" variant="outline" className="h-9 text-xs font-bold uppercase">
                    <Link href={catalogLinkHref(`/albums/${album.id}/tracks/${track.id}`, sectionId)}>
                      <FileText className="mr-1 h-3 w-3" /> Start lyrics
                    </Link>
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
              {!dnaGroup && isEditablePrivateDraft(album, track, status) && draftRowHasRecording(album, track) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 border-red-400/30 text-xs font-bold uppercase text-red-300"
                  onClick={() =>
                    setDraftDraft({
                      kind: track ? 'track' : 'album',
                      album,
                      track,
                      action: 'removeRecording',
                    })
                  }
                >
                  <Trash2 className="mr-1 h-3 w-3" /> {track ? 'Remove recording' : 'Remove all recordings'}
                </Button>
              ) : null}
              {!dnaGroup && isEditablePrivateDraft(album, track, status) && track ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 border-red-400/30 text-xs font-bold uppercase text-red-300"
                  onClick={() =>
                    setDraftDraft({
                      kind: 'track',
                      album,
                      track,
                      action: 'scrapDraft',
                    })
                  }
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Delete draft
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
    );
  };

  const renderGroupCard = (
    section: {
      id: CatalogSectionId;
      label: string;
      note: string;
      shortLabel: string;
      rows: Row[];
      listKey: GroupKey | 'liveMusic';
      style: (typeof GROUP_STYLE)[GroupKey];
      Icon: typeof Music;
    },
    opts?: { compactEmpty?: boolean }
  ) => (
    <details
      key={section.id}
      id={`release-catalog-${section.id}`}
      className={cn(
        'group w-full scroll-mt-0 overflow-hidden rounded-xl border shadow-sm ring-1 ring-black/20',
        section.style.border,
        section.style.surface,
        section.rows.length === 0 && opts?.compactEmpty && 'opacity-70'
      )}
      open={expandedSection === section.id}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden"
        onClick={(event) => {
          event.preventDefault();
          toggleSection(section.id);
        }}
      >
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', section.style.iconWrap, section.style.icon)}>
          <section.Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold uppercase tracking-wide text-foreground">{section.label}</span>
          <span className="block text-xs leading-relaxed text-muted-foreground sm:text-sm">{section.note}</span>
        </span>
        <span className={cn('rounded-full border px-2 py-1 font-code text-xs font-bold', section.style.badge)}>
          {section.rows.length}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      {section.rows.length ? (
        renderRows(section.listKey, section.rows, { catalogSectionId: `release-catalog-${section.id}` })
      ) : (
        <p className="border-t border-white/10 px-3 py-3 text-xs text-muted-foreground sm:text-sm">
          Nothing in {section.shortLabel.toLowerCase()} yet.
        </p>
      )}
    </details>
  );

  const renderHouseCard = () => (
    <details
      id="release-catalog-house"
      className="group w-full scroll-mt-0 overflow-hidden rounded-xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/[0.14] via-cyan-950/25 to-black/30 shadow-sm ring-1 ring-black/20"
      open={expandedSection === 'house'}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden"
        onClick={(event) => {
          event.preventDefault();
          toggleSection('house');
        }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/15 text-cyan-200">
          <Gift className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold uppercase tracking-wide text-foreground">House catalog · linked to you</span>
          <span className="block text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Free Library music credited to your page. Lyric DNA strands on the same release are listed under each House row — not mixed into your separate Lyrics DNA section.
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded-full border border-cyan-400/35 bg-cyan-400/15 px-2 py-1 font-code text-xs font-bold text-cyan-100">
            {houseRows.length} release{houseRows.length === 1 ? '' : 's'}
          </span>
          {houseLinkedDnaTotal > 0 ? (
            <span className="rounded-full border border-violet-400/35 bg-violet-500/12 px-2 py-0.5 font-code text-[10px] font-bold text-violet-100">
              {houseLinkedDnaTotal} House lyric strand{houseLinkedDnaTotal === 1 ? '' : 's'}
            </span>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="max-h-[min(52vh,440px)] space-y-3 overflow-y-auto overscroll-contain border-t border-white/10 p-2.5">
        {houseRows.map((row) => {
          const vault = row.vault;
          const album = vault?.album;
          const track = vault?.track;
          const vaultMatch = album ? { album, track } : findVaultReleaseByShareId(albums, row.shareId);
          const dnaAlbum = vaultMatch?.album ?? album;
          const dnaTrack = vaultMatch?.track ?? track;
          const dnaShareId =
            dnaTrack?.shareId?.trim() ||
            (dnaAlbum?.tracks || []).find((t) => t.shareId?.trim())?.shareId ||
            dnaAlbum?.shareId;
          const onHome = isHouseReleaseVisibleOnHome(row.shareId, hiddenHouseIds);
          const href = row.type === 'album' ? `/share/${row.shareId}` : pressedSongHref(row.shareId);
          const linkedStrands = houseRowLinkedDna(row, houseLinkedDnaByShare);
          return (
            <div key={row.shareId} className="space-y-2">
            <div className="rounded-lg border border-cyan-400/20 bg-slate-950/75 p-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold">{row.title}</span>
                  <span className="block truncate font-code text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                    House · Free
                    {row.type === 'album' ? ` · Album · ${row.trackCount || 0} tracks` : row.albumTitle ? ` · ${row.albumTitle}` : ' · Single'}
                    {row.releaseLive ? ' · live' : ' · Library only'}
                    {album ? '' : ' · Linked to your page'}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-cyan-100">
                      House
                    </span>
                    {row.releaseLive ? (
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-emerald-100">
                        Music live
                      </span>
                    ) : null}
                  </span>
                  {dnaAlbum ? (
                    <ReleaseDnaStatusBadges
                      className="mt-1.5"
                      album={dnaAlbum}
                      track={dnaTrack}
                      dnaShareId={dnaShareId}
                    />
                  ) : (
                    <span className="mt-1.5 inline-flex rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                      No lyric DNA · open Update to publish from Vault
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs font-bold uppercase">
                  <Link href={catalogLinkHref(href, 'release-catalog-house')}>
                    <ExternalLink className="mr-1 h-3 w-3" /> Open release
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs font-bold uppercase"
                  onClick={() => {
                    if (album) {
                      openFirstDropLathe({
                        albumId: album.id,
                        ...(track ? { trackId: track.id } : { mode: 'album' as const }),
                      });
                      return;
                    }
                    openFirstDropLathe({
                      shareId: row.shareId,
                      mode: row.type === 'album' ? 'album' : 'song',
                    });
                  }}
                >
                  <Settings2 className="mr-1 h-3 w-3" /> Update
                </Button>
                {row.releaseLive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-red-400/30 text-xs font-bold uppercase text-red-300"
                    onClick={() => setUnpress({
                      kind: track ? 'track' : row.type,
                      ...(album ? { album, track } : {}),
                      shareId: row.shareId,
                    })}
                  >
                    <Unlink className="mr-1 h-3 w-3" /> Take offline
                  </Button>
                ) : null}
                <label className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100">
                  <span>{onHome ? 'On your page' : 'Hidden on page'}</span>
                  <Switch
                    checked={onHome}
                    disabled={houseHomeBusy === row.shareId}
                    onCheckedChange={(checked) => void setHouseOnHome(row.shareId, checked === true)}
                  />
                </label>
              </div>
            </div>
            {linkedStrands.length ? (
              <div className="rounded-lg border border-violet-400/20 bg-violet-950/20 p-2.5 pl-3 sm:pl-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                  Lyric DNA on this House release · {linkedStrands.length}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Public lyric pages for tracks on this free Library release — edit strands here or in Vault.
                </p>
                {renderRows('dnaPreviews', linkedStrands, { houseLyricStrand: true })}
              </div>
            ) : null}
            </div>
          );
        })}
      </div>
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
                Upload a recording with <strong className="text-foreground">New release</strong>, write lyrics in The Vault, then Lyrics DNA Drop when you want lyrics public (Pro).
              </p>
            </>
          ) : (
            <>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">{totalCount}</span> item{totalCount === 1 ? '' : 's'} in{' '}
                <span className="font-bold text-foreground">{visibleSectionCount}</span> section{visibleSectionCount === 1 ? '' : 's'} —
                grouped in <span className="text-emerald-200/90">three panels</span> below — live &amp; public, private, and vault-only.
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cyan-100/75 sm:text-sm">
                Music release = stream/buy. Lyrics DNA Drop = public lyrics (Pro). House = free Library link on your page.
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
            Sections for live singles, albums, Lyrics DNA Drops, and drafts appear here automatically once you create them. No need to hunt through empty folders.
          </p>
          <Button type="button" className="mt-5 bg-fuchsia-400 font-bold uppercase text-black hover:bg-fuchsia-300" onClick={() => openFirstDropLathe()}>
            <Disc3 className="mr-2 h-4 w-4" /> Start your first release
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {loadingHouse ? (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100/80 sm:text-xs">
                House · loading…
              </span>
            ) : null}
            {houseRows.length ? (
              <button
                type="button"
                onClick={() => scrollToGroup('house')}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/25 sm:text-xs"
              >
                House · {houseRows.length}
              </button>
            ) : null}
            {activeSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToGroup(section.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors sm:text-xs',
                  section.style.chip
                )}
              >
                {section.shortLabel} · {section.rows.length}
              </button>
            ))}
          </div>

          <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-5">
            {loadingHouse && !houseRows.length ? (
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 px-4 py-6 text-center text-sm text-muted-foreground">
                Loading House releases linked to your page…
              </div>
            ) : null}
            {houseRows.length || activeSections.some((s) => s.zone === 'public') ? (
              <CatalogZone zone="public" itemCount={publicZoneItemCount}>
                {houseRows.length ? renderHouseCard() : null}
                {activeSections.filter((s) => s.zone === 'public').map((section) => renderGroupCard(section))}
              </CatalogZone>
            ) : null}
            {activeSections.some((s) => s.zone === 'private') ? (
              <CatalogZone zone="private" itemCount={privateZoneItemCount}>
                {activeSections.filter((s) => s.zone === 'private').map((section) => renderGroupCard(section))}
              </CatalogZone>
            ) : null}
            {activeSections.some((s) => s.zone === 'vault') ? (
              <CatalogZone zone="vault" itemCount={vaultZoneItemCount}>
                {activeSections.filter((s) => s.zone === 'vault').map((section) => renderGroupCard(section))}
              </CatalogZone>
            ) : null}
          </div>

          {emptyCatalogSlots.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => setShowEmptySections((value) => !value)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground sm:text-sm">
                  {showEmptySections ? 'Hide' : 'Show'} empty sections ({emptyCatalogSlots.length})
                </span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showEmptySections && 'rotate-180')} />
              </button>
              {showEmptySections ? (
                <div className="mt-4 space-y-5">
                  {(['public', 'private', 'vault'] as const).map((zone) => {
                    const zoneSlots = emptyCatalogSlots.filter((slot) => slot.zone === zone);
                    if (!zoneSlots.length) return null;
                    return (
                      <div key={zone} className="space-y-2">
                        <p className="text-center font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                          {ZONE_COPY[zone].title} · not used yet
                        </p>
                        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-2 sm:p-3">
                          {zoneSlots.map((section) => renderGroupCard(section, { compactEmpty: true }))}
                        </div>
                      </div>
                    );
                  })}
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

      <Dialog open={Boolean(draftDraft)} onOpenChange={(open) => !open && setDraftDraft(null)}>
        <DialogContent className="max-w-md border-red-400/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline uppercase text-red-200">
              <AlertTriangle className="h-5 w-5" />
              {draftDraft?.action === 'scrapDraft'
                ? 'Delete this private draft?'
                : draftDraft?.track
                  ? 'Remove private recording?'
                  : 'Remove all album recordings?'}
            </DialogTitle>
            <DialogDescription>
              {draftDraft?.action === 'scrapDraft'
                ? 'This permanently deletes the Vault song and any private master on file. It has not been published, so there are no buyer copies to preserve.'
                : draftDraft?.track
                  ? 'The master file is deleted from storage. The lyric sheet and release prep stay in your Vault.'
                  : 'Every private master on this album draft is deleted. Track sheets and album prep stay in your Vault.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => setDraftDraft(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-400"
              disabled={Boolean(busy)}
              onClick={() => void runDraftDraftAction()}
            >
              {draftDraft?.action === 'scrapDraft' ? 'Delete draft' : 'Remove recording'}
            </Button>
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
            Manage music releases, live Lyrics DNA Drops, and drafts from one place.
          </DialogDescription>
        </DialogHeader>
        <div
          id={RELEASE_CATALOG_SCROLL_ID}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
        >
          {open ? <ReleaseCatalogBody catalogOpen /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
