'use client';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Album,
  ArrowDownAZ,
  BadgeDollarSign,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Disc3,
  Download,
  ExternalLink,
  FolderOpen,
  Gift,
  Layers2,
  ListMusic,
  ListPlus,
  Loader,
  Lock,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Unlink,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDropCrates } from '@/hooks/use-drop-crates';
import { useDropPlayer } from '@/context/drop-player-context';
import { centsToUsdLabel } from '@/lib/drop-commerce';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import {
  createDropCrate,
  deleteDropCrate,
  renameDropCrate,
  toggleShareInCrate,
} from '@/lib/drop-crates';
import {
  buildBrowseArtists,
  deckHue,
  flattenLibraryItems,
  formatDeckTime,
  groupPlayables,
  markPlayed,
  readPlayedMap,
  searchPlayables,
  shufflePlayables,
  sortPlayables,
  type DeckBrowseArtist,
  type DeckGroup,
  type DeckPlayable,
  type DeckSort,
  type DeckViewMode,
  type DropCrate,
  type DropLibraryItem,
} from '@/lib/drop-library';
import { cn } from '@/lib/utils';
import { DropVisualizer } from '@/components/library/drop-visualizer';
import { LibraryPressingBackground } from '@/components/library/library-pressing-background';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { pressTokens, pressingCssVars, type PressingConfig } from '@/lib/profile/pressing';
import {
  downloadPressedAudioOffline,
  listOfflinePressedAudioKeys,
  removePressedAudioOffline,
} from '@/lib/offline/pressed-audio-cache';
import { manageRelease } from '@/lib/release-management-client';
import { DataContext } from '@/context/data-context';
import { fetchActivityFeed, markActivityEventsRead } from '@/lib/activity/client';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';

const LIBRARY_PREFERENCES_KEY = 'b4b:library-organizer:v1';
const DECK_VIEW_OPTIONS: Array<{
  value: DeckViewMode;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'browse', label: 'Artist shelves', detail: 'Artist → release → track', icon: FolderOpen },
  { value: 'list', label: 'Track stack', detail: 'One quick playable list', icon: Layers2 },
];
const DECK_SORT_OPTIONS: Array<{
  value: DeckSort;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'release', label: 'Tracklist order', detail: 'Keep albums in artist order', icon: ListMusic },
  { value: 'fresh', label: 'Newest unlocks', detail: 'Latest additions first', icon: Sparkles },
  { value: 'played', label: 'Recently spun', detail: 'What you played last', icon: Clock3 },
  { value: 'az', label: 'Song title A–Z', detail: 'Alphabetical by track', icon: ArrowDownAZ },
  { value: 'artist', label: 'Artist name', detail: 'Alphabetical by artist', icon: UserRound },
  { value: 'paid', label: 'Highest support', detail: 'Largest purchase first', icon: BadgeDollarSign },
];
const DECK_GROUP_OPTIONS: Array<{
  value: DeckGroup;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'kind', label: 'Release type', detail: 'Yours, albums, and singles', icon: Album },
  { value: 'artist', label: 'Artist', detail: 'A section for each artist', icon: UserRound },
  { value: 'access', label: 'How it unlocked', detail: 'House, purchased, and free', icon: Gift },
  { value: 'month', label: 'Month added', detail: 'A timeline of your Library', icon: CalendarDays },
  { value: 'none', label: 'No sections', detail: 'One uninterrupted stack', icon: ListMusic },
];

function PressingPlate({
  item,
  playing,
}: {
  item: DeckPlayable | null;
  playing: boolean;
}) {
  const hue = deckHue(item?.shareId || 'empty');
  const letter = (item?.title || 'B').trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-full border-2 shadow-[0_0_40px_rgba(232,121,249,0.18)]',
        playing ? 'border-fuchsia-300/50 animate-[spin_8s_linear_infinite]' : 'border-fuchsia-400/25'
      )}
      style={{ animationPlayState: playing ? 'running' : 'paused' }}
    >
      {item?.coverArtUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.coverArtUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 210deg, hsl(${hue} 80% 18%), hsl(${(hue + 40) % 360} 70% 28%), hsl(${hue} 85% 12%), hsl(${(hue + 80) % 360} 60% 22%))`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_34%,rgba(0,0,0,0.55)_36%,rgba(0,0,0,0.2)_58%,transparent_60%)]" />
      {!item?.coverArtUrl && (
        <span className="absolute inset-0 flex items-center justify-center font-headline text-4xl font-bold text-white/80">
          {letter}
        </span>
      )}
      <div className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-200/40 bg-zinc-950" />
    </div>
  );
}

export function DropDeck({
  userId,
  items,
  pressing,
  canDownloadOffline,
}: {
  userId: string;
  items: DropLibraryItem[];
  pressing?: PressingConfig | null;
  canDownloadOffline: boolean;
}) {
  const { toast } = useToast();
  const { updateAlbum, updateTrack } = useContext(DataContext);
  const { crates, loaded: cratesLoaded } = useDropCrates(userId);
  const {
    current,
    playing,
    loading,
    elapsed,
    duration,
    volume,
    repeat,
    analyser,
    setQueue: setPlayerQueue,
    setRepeat,
    loadAndPlay,
    togglePlay,
    skipNext,
    prev,
    seek,
    setVolume,
    toggleMute,
  } = useDropPlayer();

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<DeckViewMode>('browse');
  const [sort, setSort] = useState<DeckSort>('release');
  const [group, setGroup] = useState<DeckGroup>('kind');
  const [crateId, setCrateId] = useState<string>('all');
  const [preferencesOwner, setPreferencesOwner] = useState<string | null>(null);
  const [played, setPlayed] = useState(readPlayedMap);
  const [shuffle, setShuffle] = useState(false);
  const [shuffleKeys, setShuffleKeys] = useState<string[] | null>(null);
  const [crateName, setCrateName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedArtists, setExpandedArtists] = useState<Record<string, boolean>>({});
  const [expandedAlbums, setExpandedAlbums] = useState<Record<string, boolean>>({});
  const [offlineKeys, setOfflineKeys] = useState<Set<string>>(new Set());
  const [offlineBusyKey, setOfflineBusyKey] = useState<string | null>(null);
  const [unpressBusyKey, setUnpressBusyKey] = useState<string | null>(null);
  const [hiddenReleaseIds, setHiddenReleaseIds] = useState<Set<string>>(new Set());
  const [dismissedHouseNotices, setDismissedHouseNotices] = useState<Set<string>>(new Set());
  const currentKey = current?.key ?? null;
  const pressingStyle = useMemo(
    () => (pressing ? pressingCssVars(pressTokens(pressing)) : undefined),
    [pressing]
  );

  useEffect(() => {
    const validViews: DeckViewMode[] = ['browse', 'list'];
    const validSorts: DeckSort[] = ['release', 'fresh', 'played', 'az', 'artist', 'paid'];
    const validGroups: DeckGroup[] = ['kind', 'artist', 'access', 'month', 'none'];
    try {
      const raw = localStorage.getItem(`${LIBRARY_PREFERENCES_KEY}:${userId}`);
      const saved = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      if (validViews.includes(saved.viewMode as DeckViewMode)) setViewMode(saved.viewMode as DeckViewMode);
      if (validSorts.includes(saved.sort as DeckSort)) setSort(saved.sort as DeckSort);
      if (validGroups.includes(saved.group as DeckGroup)) setGroup(saved.group as DeckGroup);
      setCrateId(typeof saved.crateId === 'string' && saved.crateId ? saved.crateId : 'all');
    } catch {
      setViewMode('browse');
      setSort('release');
      setGroup('kind');
      setCrateId('all');
    } finally {
      setPreferencesOwner(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (preferencesOwner !== userId) return;
    try {
      localStorage.setItem(
        `${LIBRARY_PREFERENCES_KEY}:${userId}`,
        JSON.stringify({ viewMode, sort, group, crateId }),
      );
    } catch {
      /* Device preference storage is best-effort. */
    }
  }, [crateId, group, preferencesOwner, sort, userId, viewMode]);

  useEffect(() => {
    if (!cratesLoaded || crateId === 'all') return;
    if (!crates.some((crate) => crate.id === crateId)) setCrateId('all');
  }, [crateId, crates, cratesLoaded]);

  const activeCrate = crateId === 'all' ? null : crates.find((c) => c.id === crateId) ?? null;
  const currentSortLabel = DECK_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Tracklist order';
  const currentGroupLabel = DECK_GROUP_OPTIONS.find((option) => option.value === group)?.label ?? 'Release type';

  const playables = useMemo(() => {
    const visibleItems = items.filter((item) => !hiddenReleaseIds.has(item.shareId));
    const scoped = activeCrate
      ? visibleItems.filter((item) => activeCrate.shareIds.includes(item.shareId))
      : visibleItems;
    const flat = flattenLibraryItems(scoped);
    const found = searchPlayables(flat, query);
    return sortPlayables(found, sort, played);
  }, [items, activeCrate, query, sort, played, hiddenReleaseIds]);

  const buckets = useMemo(() => groupPlayables(playables, group), [playables, group]);
  const browseArtists: DeckBrowseArtist[] = useMemo(() => buildBrowseArtists(playables), [playables]);
  const houseNotice = useMemo(() => {
    return items
      .filter((item) => item.houseRelease && item.houseLibraryNotice)
      .sort((a, b) => (
        b.houseLibraryNoticeAt || b.purchasedAt || ''
      ).localeCompare(a.houseLibraryNoticeAt || a.purchasedAt || ''))[0] ?? null;
  }, [items]);
  const houseNoticeKey = houseNotice
    ? `${houseNotice.shareId}:${houseNotice.houseLibraryNoticeAt || houseNotice.purchasedAt}`
    : '';
  const houseNoticePlayable = useMemo(() => {
    if (!houseNotice) return null;
    return flattenLibraryItems([houseNotice])[0] ?? null;
  }, [houseNotice]);

  useEffect(() => {
    if (!houseNotice) return;
    void fetchActivityFeed('received', 100)
      .then((events) => {
        const unreadHouseIds = events
          .filter((event) => event.type === 'house_release' && !event.readAt)
          .map((event) => event.id);
        if (!unreadHouseIds.length) return;
        return markActivityEventsRead(unreadHouseIds).then(() => refreshActivityAlerts());
      })
      .catch(() => undefined);
  }, [houseNotice]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`b4b:library-house-notices:${userId}`);
      const saved = raw ? JSON.parse(raw) : [];
      setDismissedHouseNotices(new Set(Array.isArray(saved) ? saved.filter((value) => typeof value === 'string') : []));
    } catch {
      setDismissedHouseNotices(new Set());
    }
  }, [userId]);

  const dismissHouseNotice = useCallback(() => {
    if (!houseNoticeKey) return;
    setDismissedHouseNotices((current) => {
      const next = new Set(current).add(houseNoticeKey);
      try {
        localStorage.setItem(`b4b:library-house-notices:${userId}`, JSON.stringify([...next].slice(-100)));
      } catch {
        /* local dismissal is best-effort */
      }
      return next;
    });
  }, [houseNoticeKey, userId]);

  useEffect(() => {
    if (!shuffle) {
      setShuffleKeys(null);
      return;
    }
    setShuffleKeys((prev) => {
      const keys = playables.map((item) => item.key);
      if (prev) {
        const kept = prev.filter((key) => keys.includes(key));
        const extra = keys.filter((key) => !kept.includes(key));
        if (kept.length === keys.length && extra.length === 0) return prev;
        return [...kept, ...extra];
      }
      return shufflePlayables(playables, currentKey || undefined).map((item) => item.key);
    });
    // currentKey only seeds the first shuffle so the playing track stays first.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep crate order while skipping
  }, [shuffle, playables]);

  const queue = useMemo(() => {
    if (!shuffle || !shuffleKeys) return playables;
    const map = new Map(playables.map((item) => [item.key, item]));
    return shuffleKeys.flatMap((key) => {
      const item = map.get(key);
      return item ? [item] : [];
    });
  }, [shuffle, shuffleKeys, playables]);

  useEffect(() => {
    setPlayerQueue(queue);
  }, [queue, setPlayerQueue]);

  useEffect(() => {
    let cancelled = false;
    void listOfflinePressedAudioKeys(userId)
      .then((keys) => { if (!cancelled) setOfflineKeys(keys); })
      .catch(() => { if (!cancelled) setOfflineKeys(new Set()); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!currentKey) return;
    setPlayed((prev) => markPlayed(prev, currentKey));
  }, [currentKey]);

  const playItem = useCallback(
    (item: DeckPlayable) => {
      setPlayed((prev) => markPlayed(prev, item.key));
      void loadAndPlay(item);
    },
    [loadAndPlay]
  );

  const toggleOffline = useCallback(async (item: DeckPlayable) => {
    if (offlineBusyKey) return;
    if (!canDownloadOffline && !offlineKeys.has(item.key)) {
      toast({ title: 'Studio Pro feature', description: 'Upgrade to save owned or purchased songs for offline play.' });
      return;
    }
    setOfflineBusyKey(item.key);
    try {
      if (offlineKeys.has(item.key)) {
        await removePressedAudioOffline(userId, item);
        setOfflineKeys((current) => {
          const next = new Set(current);
          next.delete(item.key);
          return next;
        });
        toast({ title: 'Offline copy removed', description: `${item.title} still stays in your Library.` });
      } else {
        const saved = await downloadPressedAudioOffline(userId, item);
        setOfflineKeys((current) => new Set(current).add(item.key));
        toast({
          title: 'Available offline',
          description: `${item.title} saved on this device · ${(saved.byteSize / 1024 / 1024).toFixed(1)} MB`,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not change offline access',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setOfflineBusyKey(null);
    }
  }, [canDownloadOffline, offlineBusyKey, offlineKeys, toast, userId]);

  const unpressOwnRelease = useCallback(async (item: DeckPlayable) => {
    if (!item.own || !item.albumId || !window.confirm(`Take “${item.title}” offline? Existing buyers keep access, but it leaves public discovery and checkout.`)) return;
    setUnpressBusyKey(item.key);
    try {
      await manageRelease({
        kind: item.scope === 'album' ? 'album' : 'track',
        action: 'unpublish',
        albumId: item.albumId,
        ...(item.scope === 'track' && item.trackId ? { trackId: item.trackId } : {}),
      });
      if (item.scope === 'album') updateAlbum(item.albumId, { releaseStatus: 'unlisted', releaseShareId: item.shareId });
      else if (item.trackId) updateTrack(item.albumId, item.trackId, { releaseStatus: 'unlisted', releaseShareId: item.shareId });
      setHiddenReleaseIds((current) => new Set(current).add(item.shareId));
      toast({ title: 'Release taken offline', description: 'Manage or republish it from Release Catalog in The Vault.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not take release offline', description: error instanceof Error ? error.message : undefined });
    } finally {
      setUnpressBusyKey(null);
    }
  }, [toast, updateAlbum, updateTrack]);

  useEffect(() => {
    setExpandedArtists((prev) => {
      const next: Record<string, boolean> = {};
      for (const artist of browseArtists) {
        next[artist.id] = prev[artist.id] ?? true;
      }
      return next;
    });
    setExpandedAlbums((prev) => {
      const next: Record<string, boolean> = {};
      for (const artist of browseArtists) {
        for (const album of artist.albums) {
          const key = `${artist.id}:${album.id}`;
          next[key] = prev[key] ?? true;
        }
      }
      return next;
    });
  }, [browseArtists]);

  const makeCrate = async (seedShareId?: string) => {
    try {
      const name = crateName.trim() || 'Untitled crate';
      const id = await createDropCrate(userId, name, seedShareId ? [seedShareId] : [], crates.length);
      setCrateName('');
      setCrateId(id);
      toast({ title: 'Crate pressed', description: name });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not make crate',
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const addToCrate = async (crate: DropCrate, shareId: string) => {
    try {
      await toggleShareInCrate(userId, crate, shareId);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Crate full',
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <div
      className="relative flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden"
      style={{
        ...(pressingStyle as React.CSSProperties),
        backgroundColor: pressing ? 'var(--ph-bg)' : '#050914',
      }}
    >
      <LibraryPressingBackground pressing={pressing} analyser={analyser} playing={playing} />

      <header className="relative z-10 shrink-0 border-b border-fuchsia-500/15 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">
                Bar 4 Bar Releases
              </p>
              <h1 className="font-headline text-4xl font-bold uppercase leading-none sm:text-5xl">
                Library
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Songs you released, music you unlocked, and House releases included with your account—search, crate, and test the player here.
              </p>
            </div>
            <p className="font-code text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {playables.length} on platter · {items.length} unlocked
            </p>
          </div>
          {houseNotice && houseNoticeKey && !dismissedHouseNotices.has(houseNoticeKey) ? (
            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.07] px-3 py-2.5 sm:flex-row sm:items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-400/10 text-cyan-200">
                <Gift className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">New in your Library</p>
                <p className="break-words text-xs leading-relaxed text-foreground/85">
                  <strong>{houseNotice.title}</strong>{houseNotice.artistName ? ` by ${houseNotice.artistName}` : ''} is a House release included free. Spin it to try the Library player.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {houseNoticePlayable ? (
                  <Button type="button" size="sm" onClick={() => playItem(houseNoticePlayable)} className="h-8 px-3 text-[9px] font-bold uppercase tracking-wider">
                    <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Play now
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="icon" onClick={dismissHouseNotice} className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Dismiss new Library release notice">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-300/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, artist, release…"
                className="border-fuchsia-500/25 bg-black/30 pl-9 font-code"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-full shrink-0 items-center gap-2 rounded-lg border border-fuchsia-400/35 bg-[linear-gradient(110deg,rgba(217,70,239,0.13),rgba(6,182,212,0.09))] px-3 text-left transition-colors hover:border-cyan-300/50 sm:w-auto sm:min-w-[230px]"
                  aria-label="Organize Library"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-cyan-200" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-code text-[9px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">
                      Organize Library
                    </span>
                    <span className="block truncate text-[11px] text-foreground/75">
                      {viewMode === 'browse' ? 'Artist shelves' : currentGroupLabel} · {currentSortLabel}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[min(22rem,calc(100vw-2rem))] border-fuchsia-400/30 bg-slate-950/98 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.65)]"
              >
                <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-[0.2em] text-cyan-200">
                  Library view
                </DropdownMenuLabel>
                {DECK_VIEW_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = viewMode === option.value;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => setViewMode(option.value)}
                      className={cn('items-start py-2.5', active && 'bg-cyan-500/10 text-cyan-50')}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4', active ? 'text-cyan-200' : 'text-muted-foreground')} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold">{option.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{option.detail}</span>
                      </span>
                      {active ? <Check className="mt-0.5 h-4 w-4 text-cyan-200" /> : null}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-[0.2em] text-fuchsia-200">
                  Play order
                </DropdownMenuLabel>
                {DECK_SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = sort === option.value;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => setSort(option.value)}
                      className={cn('items-start py-2.5', active && 'bg-fuchsia-500/10 text-fuchsia-50')}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4', active ? 'text-fuchsia-200' : 'text-muted-foreground')} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold">{option.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{option.detail}</span>
                      </span>
                      {active ? <Check className="mt-0.5 h-4 w-4 text-fuchsia-200" /> : null}
                    </DropdownMenuItem>
                  );
                })}
                {viewMode === 'list' ? (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-[0.2em] text-amber-200">
                      Stack sections
                    </DropdownMenuLabel>
                    {DECK_GROUP_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = group === option.value;
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() => setGroup(option.value)}
                          className={cn('items-start py-2.5', active && 'bg-amber-500/10 text-amber-50')}
                        >
                          <Icon className={cn('mt-0.5 h-4 w-4', active ? 'text-amber-200' : 'text-muted-foreground')} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold">{option.label}</span>
                            <span className="block text-[10px] text-muted-foreground">{option.detail}</span>
                          </span>
                          {active ? <Check className="mt-0.5 h-4 w-4 text-amber-200" /> : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                ) : null}
                <p className="px-2 pb-1 pt-2 font-code text-[9px] leading-relaxed text-muted-foreground">
                  Saved automatically on this device.
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
        <aside className="flex shrink-0 flex-col gap-2 lg:w-56">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300">
            Crates
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            <button
              type="button"
              onClick={() => setCrateId('all')}
              className={cn(
                'shrink-0 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                crateId === 'all'
                  ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100'
                  : 'border-white/10 bg-black/20 text-muted-foreground hover:border-fuchsia-400/30'
              )}
            >
              <span className="font-headline font-bold uppercase">Full Library</span>
              <span className="mt-0.5 block font-code text-[10px]">{items.length} unlocked</span>
            </button>
            {crates.map((crate) => (
              <button
                key={crate.id}
                type="button"
                onClick={() => setCrateId(crate.id)}
                className={cn(
                  'group flex shrink-0 items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  crateId === crate.id
                    ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100'
                    : 'border-white/10 bg-black/20 text-muted-foreground hover:border-cyan-400/30'
                )}
              >
                <span>
                  <span className="block font-headline font-bold uppercase leading-tight">{crate.name}</span>
                  <span className="font-code text-[10px]">{crate.shareIds.length} in crate</span>
                </span>
                <span className="flex gap-1 opacity-70 group-hover:opacity-100">
                  <span
                    role="button"
                    tabIndex={0}
                    className="rounded p-0.5 hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameId(crate.id);
                      setRenameValue(crate.name);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        setRenameId(crate.id);
                        setRenameValue(crate.name);
                      }
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="rounded p-0.5 hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(crate.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        setDeleteId(crate.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void makeCrate();
            }}
          >
            <Input
              value={crateName}
              onChange={(e) => setCrateName(e.target.value)}
              placeholder="New crate name"
              maxLength={48}
              className="h-9 border-white/10 bg-black/30 font-code text-xs"
            />
            <Button type="submit" size="sm" className="shrink-0 font-bold">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
          <div className="rounded-2xl border border-fuchsia-400/20 bg-black/35 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5">
            <DropVisualizer analyser={analyser} playing={playing}>
              <PressingPlate item={current} playing={playing} />
            </DropVisualizer>
            <div className="mt-4 min-w-0">
              {current ? (
                <Link
                  href={current.detailsHref}
                  className="block truncate font-headline text-2xl font-bold uppercase transition-colors hover:text-fuchsia-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/60"
                  title={`Open ${current.title}`}
                >
                  {current.title}
                </Link>
              ) : (
                <p className="truncate font-headline text-2xl font-bold uppercase">Nothing on the plate</p>
              )}
              <p className="truncate font-code text-xs uppercase tracking-wide text-muted-foreground">
                {current
                  ? `${current.artistName}${current.albumTitle ? ` · ${current.albumTitle}` : ''}`
                  : 'Pick a drop from your crate'}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="w-10 font-code text-[10px] text-muted-foreground">{formatDeckTime(elapsed)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.1}
                value={Math.min(elapsed, duration)}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-fuchsia-400"
              />
              <span className="w-10 text-right font-code text-[10px] text-muted-foreground">
                {formatDeckTime(duration || current?.durationSec || 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                type="button"
                size="icon"
                variant={shuffle ? 'default' : 'ghost'}
                onClick={() => setShuffle((v) => !v)}
                aria-label="Shuffle"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={prev} aria-label="Previous">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                disabled={loading && !current}
              >
                {loading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={skipNext} aria-label="Next">
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={repeat === 'off' ? 'ghost' : 'default'}
                onClick={() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))}
                aria-label="Repeat"
              >
                {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </Button>
              {current && (
                <Button type="button" size="icon" variant="ghost" asChild>
                  <Link href={current.detailsHref} aria-label="Open song page">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            <AudioVolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
              className="mx-auto mt-2 w-full max-w-56"
            />
          </div>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <ScrollArea className="h-auto min-h-[240px] rounded-2xl border border-white/10 bg-black/25 lg:h-full">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <Disc3 className="h-10 w-10 text-fuchsia-400/70" />
                <p className="text-sm text-muted-foreground">
                  Nothing here yet. Open a live DNA Drop with audio and buy or unlock it.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/">Back to The Scene</Link>
                </Button>
              </div>
            ) : playables.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No drops match this crate or search.
              </p>
            ) : viewMode === 'browse' ? (
              <div className="p-2 sm:p-3">
                {browseArtists.map((artist) => {
                  const artistOpen = expandedArtists[artist.id] ?? true;
                  return (
                    <div key={artist.id} className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedArtists((prev) => ({ ...prev, [artist.id]: !artistOpen }))
                        }
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          {artistOpen ? (
                            <ChevronDown className="h-4 w-4 text-cyan-300" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-cyan-300" />
                          )}
                          <span className="truncate font-headline text-sm font-bold uppercase text-cyan-100">
                            {artist.label}
                          </span>
                        </span>
                        <span className="shrink-0 font-code text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {artist.trackCount} tracks
                        </span>
                      </button>
                      {artistOpen ? (
                        <div className="border-t border-white/10 bg-black/20 px-2 py-2">
                          {artist.albums.map((album) => {
                            const albumKey = `${artist.id}:${album.id}`;
                            const albumOpen = expandedAlbums[albumKey] ?? true;
                            return (
                              <div key={album.id} className="mb-2 rounded-lg border border-white/10 bg-black/20">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedAlbums((prev) => ({ ...prev, [albumKey]: !albumOpen }))
                                  }
                                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/5"
                                >
                                  <span className="inline-flex min-w-0 items-center gap-2">
                                    {albumOpen ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-fuchsia-300" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-fuchsia-300" />
                                    )}
                                    <span className="truncate font-code text-[11px] font-bold uppercase tracking-[0.14em] text-fuchsia-100/90">
                                      {album.label}
                                    </span>
                                  </span>
                                  <span className="shrink-0 font-code text-[10px] text-muted-foreground">
                                    {album.items.length}
                                  </span>
                                </button>
                                {albumOpen ? (
                                  <ul className="border-t border-white/10 px-1 py-1">
                                    {album.items.map((item) => {
                                      const active = item.key === currentKey;
                                      return (
                                        <li key={item.key}>
                                          <div
                                            className={cn(
                                              'group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors',
                                              active
                                                ? 'bg-fuchsia-500/15 ring-1 ring-fuchsia-400/35'
                                                : 'hover:bg-white/5'
                                            )}
                                          >
                                            <button
                                              type="button"
                                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                              onClick={() => {
                                                if (active) togglePlay();
                                                else playItem(item);
                                              }}
                                            >
                                              {item.trackNumber ? (
                                                <span className="w-5 shrink-0 text-right font-code text-[10px] font-bold tabular-nums text-cyan-200/70">
                                                  {String(item.trackNumber).padStart(2, '0')}
                                                </span>
                                              ) : null}
                                              <span
                                                className={cn(
                                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                                                  active
                                                    ? 'border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-100'
                                                    : 'border-white/10 bg-black/40 text-muted-foreground'
                                                )}
                                              >
                                                {active && playing ? (
                                                  <Pause className="h-3.5 w-3.5" />
                                                ) : (
                                                  <Play className="h-3.5 w-3.5" />
                                                )}
                                              </span>
                                              <span className="min-w-0 flex-1">
                                                <span className="block truncate font-headline text-sm font-bold uppercase">
                                                  {item.title}
                                                </span>
                                                <span className="block truncate font-code text-[10px] uppercase text-muted-foreground">
                                                  {item.artistName}
                                                  {item.albumTitle ? ` · ${item.albumTitle}` : ` · ${item.scope}`}
                                                  {item.own
                                                    ? ' · Yours'
                                                    : item.houseRelease
                                                      ? ' · House · Free'
                                                    : item.free
                                                      ? ' · Free'
                                                      : ` · ${centsToUsdLabel(item.amountCents)}`}
                                                </span>
                                              </span>
                                              <span className="hidden shrink-0 font-code text-[10px] text-muted-foreground sm:block">
                                                {item.durationSec ? formatDeckTime(item.durationSec) : ''}
                                              </span>
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  type="button"
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
                                                  aria-label={item.own ? 'Manage this song' : 'Add to crate'}
                                                >
                                                  {item.own ? (
                                                    <Settings2 className="h-4 w-4" />
                                                  ) : (
                                                    <ListPlus className="h-4 w-4" />
                                                  )}
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-52">
                                                {item.own && (
                                                  <>
                                                    <DropdownMenuLabel>Manage</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                      onClick={() =>
                                                        openFirstDropLathe({
                                                          trackId: item.trackId,
                                                          albumId: item.albumId,
                                                        })
                                                      }
                                                    >
                                                      <Settings2 className="h-4 w-4" />
                                                      Update release
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                      <Link href={item.detailsHref}>
                                                        <ExternalLink className="h-4 w-4" />
                                                        Open drop
                                                      </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                      className="text-red-300 focus:text-red-200"
                                                      disabled={unpressBusyKey === item.key || !item.albumId}
                                                      onClick={() => void unpressOwnRelease(item)}
                                                    >
                                                      {unpressBusyKey === item.key ? <Loader className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                                      Take release offline
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                  </>
                                                )}
                                                <DropdownMenuLabel>Offline on this device</DropdownMenuLabel>
                                                {!canDownloadOffline && !offlineKeys.has(item.key) ? (
                                                  <DropdownMenuItem asChild className="text-fuchsia-300 focus:text-fuchsia-200">
                                                    <Link href="/pricing"><Lock className="h-4 w-4" /> Studio Pro · offline play</Link>
                                                  </DropdownMenuItem>
                                                ) : (
                                                  <DropdownMenuItem
                                                    disabled={offlineBusyKey === item.key}
                                                    onClick={() => void toggleOffline(item)}
                                                  >
                                                    {offlineBusyKey === item.key ? (
                                                      <Loader className="h-4 w-4 animate-spin" />
                                                    ) : offlineKeys.has(item.key) ? (
                                                      <Trash2 className="h-4 w-4" />
                                                    ) : (
                                                      <Download className="h-4 w-4" />
                                                    )}
                                                    {offlineKeys.has(item.key) ? 'Remove offline copy' : 'Download for offline'}
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>Add to crate</DropdownMenuLabel>
                                                {crates.length === 0 && (
                                                  <DropdownMenuItem onClick={() => void makeCrate(item.shareId)}>
                                                    New crate with this drop
                                                  </DropdownMenuItem>
                                                )}
                                                {crates.map((crate) => {
                                                  const inCrate = crate.shareIds.includes(item.shareId);
                                                  return (
                                                    <DropdownMenuItem
                                                      key={crate.id}
                                                      onClick={() => void addToCrate(crate, item.shareId)}
                                                    >
                                                      {inCrate ? 'Remove from ' : 'Add to '}
                                                      {crate.name}
                                                    </DropdownMenuItem>
                                                  );
                                                })}
                                                {crates.length > 0 && (
                                                  <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => void makeCrate(item.shareId)}>
                                                      New crate with this drop
                                                    </DropdownMenuItem>
                                                  </>
                                                )}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 sm:p-3">
                {buckets.map((bucket) => (
                  <div key={bucket.id} className="mb-3">
                    {group !== 'none' && (
                      <p className="sticky top-0 z-[1] bg-black/70 px-2 py-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.16em] text-fuchsia-300/90 backdrop-blur-sm">
                        {bucket.label}
                        <span className="ml-2 font-code text-[10px] text-muted-foreground">
                          {bucket.items.length}
                        </span>
                      </p>
                    )}
                    <ul>
                      {bucket.items.map((item) => {
                        const active = item.key === currentKey;
                        return (
                          <li key={item.key}>
                            <div
                              className={cn(
                                'group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors',
                                active
                                  ? 'bg-fuchsia-500/15 ring-1 ring-fuchsia-400/35'
                                  : 'hover:bg-white/5'
                              )}
                            >
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                onClick={() => {
                                  if (active) togglePlay();
                                  else playItem(item);
                                }}
                              >
                                {item.trackNumber ? (
                                  <span className="w-5 shrink-0 text-right font-code text-[10px] font-bold tabular-nums text-cyan-200/70">
                                    {String(item.trackNumber).padStart(2, '0')}
                                  </span>
                                ) : null}
                                <span
                                  className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                                    active
                                      ? 'border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-100'
                                      : 'border-white/10 bg-black/40 text-muted-foreground'
                                  )}
                                >
                                  {active && playing ? (
                                    <Pause className="h-3.5 w-3.5" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-headline text-sm font-bold uppercase">
                                    {item.title}
                                  </span>
                                  <span className="block truncate font-code text-[10px] uppercase text-muted-foreground">
                                    {item.artistName}
                                    {item.albumTitle ? ` · ${item.albumTitle}` : ` · ${item.scope}`}
                                    {item.own
                                      ? ' · Yours'
                                      : item.houseRelease
                                        ? ' · House · Free'
                                      : item.free
                                        ? ' · Free'
                                        : ` · ${centsToUsdLabel(item.amountCents)}`}
                                  </span>
                                </span>
                                <span className="hidden shrink-0 font-code text-[10px] text-muted-foreground sm:block">
                                  {item.durationSec ? formatDeckTime(item.durationSec) : ''}
                                </span>
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
                                    aria-label={item.own ? 'Manage this song' : 'Add to crate'}
                                  >
                                    {item.own ? (
                                      <Settings2 className="h-4 w-4" />
                                    ) : (
                                      <ListPlus className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  {item.own && (
                                    <>
                                      <DropdownMenuLabel>Manage</DropdownMenuLabel>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openFirstDropLathe({
                                            trackId: item.trackId,
                                            albumId: item.albumId,
                                          })
                                        }
                                      >
                                        <Settings2 className="h-4 w-4" />
                                        Update release
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link href={item.detailsHref}>
                                          <ExternalLink className="h-4 w-4" />
                                          Open drop
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-300 focus:text-red-200"
                                        disabled={unpressBusyKey === item.key || !item.albumId}
                                        onClick={() => void unpressOwnRelease(item)}
                                      >
                                        {unpressBusyKey === item.key ? <Loader className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                        Take release offline
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuLabel>Offline on this device</DropdownMenuLabel>
                                  {!canDownloadOffline && !offlineKeys.has(item.key) ? (
                                    <DropdownMenuItem asChild className="text-fuchsia-300 focus:text-fuchsia-200">
                                      <Link href="/pricing"><Lock className="h-4 w-4" /> Studio Pro · offline play</Link>
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      disabled={offlineBusyKey === item.key}
                                      onClick={() => void toggleOffline(item)}
                                    >
                                      {offlineBusyKey === item.key ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : offlineKeys.has(item.key) ? (
                                        <Trash2 className="h-4 w-4" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                      {offlineKeys.has(item.key) ? 'Remove offline copy' : 'Download for offline'}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Add to crate</DropdownMenuLabel>
                                  {crates.length === 0 && (
                                    <DropdownMenuItem onClick={() => void makeCrate(item.shareId)}>
                                      New crate with this drop
                                    </DropdownMenuItem>
                                  )}
                                  {crates.map((crate) => {
                                    const inCrate = crate.shareIds.includes(item.shareId);
                                    return (
                                      <DropdownMenuItem
                                        key={crate.id}
                                        onClick={() => void addToCrate(crate, item.shareId)}
                                      >
                                        {inCrate ? 'Remove from ' : 'Add to '}
                                        {crate.name}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                  {crates.length > 0 && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => void makeCrate(item.shareId)}>
                                        New crate with this drop
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          </div>
        </section>
      </div>

      <AlertDialog open={Boolean(renameId)} onOpenChange={(open) => !open && setRenameId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename crate</AlertDialogTitle>
            <AlertDialogDescription>This only changes the name on your Deck.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={48}
            className="font-code"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!renameId) return;
                void renameDropCrate(userId, renameId, renameValue).catch((e: unknown) => {
                  toast({
                    variant: 'destructive',
                    title: 'Could not rename',
                    description: e instanceof Error ? e.message : undefined,
                  });
                });
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Break this crate?</AlertDialogTitle>
            <AlertDialogDescription>
              The drops stay in Library. Only the crate goes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
              onClick={() => {
                if (!deleteId) return;
                if (crateId === deleteId) setCrateId('all');
                void deleteDropCrate(userId, deleteId);
              }}
            >
              Break crate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
