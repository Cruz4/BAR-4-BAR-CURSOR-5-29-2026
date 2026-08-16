'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Disc3,
  ExternalLink,
  ListPlus,
  Loader,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { auth } from '@/lib/firebase/client/firebase';
import { centsToUsdLabel } from '@/lib/drop-commerce';
import {
  createDropCrate,
  deleteDropCrate,
  renameDropCrate,
  toggleShareInCrate,
} from '@/lib/drop-crates';
import {
  deckHue,
  flattenLibraryItems,
  formatDeckTime,
  groupPlayables,
  markPlayed,
  readPlayedMap,
  searchPlayables,
  shufflePlayables,
  sortPlayables,
  type DeckGroup,
  type DeckPlayable,
  type DeckSort,
  type DropCrate,
  type DropLibraryItem,
} from '@/lib/drop-library';
import { cn } from '@/lib/utils';
import { DeckNeonBackground } from '@/components/studio-page-background';
import { DropVisualizer } from '@/components/library/drop-visualizer';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (!user) return headers;
  const token = await user.getIdToken();
  return { ...headers, Authorization: `Bearer ${token}` };
}

type RepeatMode = 'off' | 'all' | 'one';

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

export function DropDeck({ userId, items }: { userId: string; items: DropLibraryItem[] }) {
  const { toast } = useToast();
  const { crates } = useDropCrates(userId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DeckSort>('fresh');
  const [group, setGroup] = useState<DeckGroup>('kind');
  const [crateId, setCrateId] = useState<string>('all');
  const [played, setPlayed] = useState(readPlayedMap);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [shuffleKeys, setShuffleKeys] = useState<string[] | null>(null);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [crateName, setCrateName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeCrate = crateId === 'all' ? null : crates.find((c) => c.id === crateId) ?? null;

  const playables = useMemo(() => {
    const scoped = activeCrate
      ? items.filter((item) => activeCrate.shareIds.includes(item.shareId))
      : items;
    const flat = flattenLibraryItems(scoped);
    const found = searchPlayables(flat, query);
    return sortPlayables(found, sort, played);
  }, [items, activeCrate, query, sort, played]);

  const buckets = useMemo(() => groupPlayables(playables, group), [playables, group]);

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
  const current = playables.find((item) => item.key === currentKey) || null;
  const currentIndex = queue.findIndex((item) => item.key === currentKey);

  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctxRef.current) {
      const ctx = new AC();
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.78;
      const source = ctx.createMediaElementSource(audio);
      source.connect(node);
      node.connect(ctx.destination);
      ctxRef.current = ctx;
      setAnalyser(node);
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
  }, []);

  const loadAndPlay = useCallback(
    async (item: DeckPlayable, autoplay = true) => {
      setCurrentKey(item.key);
      setPlayed((prev) => markPlayed(prev, item.key));
      setLoading(true);
      try {
        const headers = await authHeaders();
        const qs = new URLSearchParams({ shareId: item.shareId });
        if (item.trackId) qs.set('trackId', item.trackId);
        const res = await fetch(`/api/drops/audio?${qs.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load this drop.');
        const audio = audioRef.current;
        if (!audio) return;
        ensureGraph();
        audio.src = data.url;
        if (autoplay) {
          await audio.play();
          setPlaying(true);
        }
      } catch (e: unknown) {
        setPlaying(false);
        toast({
          variant: 'destructive',
          title: 'Could not play',
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    },
    [ensureGraph, toast]
  );

  const playIndex = useCallback(
    (index: number) => {
      const item = queue[index];
      if (item) void loadAndPlay(item);
    },
    [queue, loadAndPlay]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!current) {
      if (queue[0]) void loadAndPlay(queue[0]);
      return;
    }
    if (!audio?.src) {
      void loadAndPlay(current);
      return;
    }
    ensureGraph();
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [current, queue, loadAndPlay, ensureGraph]);

  const skipNext = useCallback(() => {
    if (queue.length === 0) return;
    const i = currentIndex < 0 ? 0 : currentIndex + 1;
    if (i >= queue.length) {
      if (repeat !== 'off') playIndex(0);
      else setPlaying(false);
      return;
    }
    playIndex(i);
  }, [queue, currentIndex, repeat, playIndex]);

  const handleEnded = useCallback(() => {
    if (repeat === 'one' && current) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play();
        setPlaying(true);
        return;
      }
    }
    skipNext();
  }, [repeat, current, skipNext]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queue.length === 0) return;
    const i = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    playIndex(i);
  }, [queue, currentIndex, playIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setElapsed(audio.currentTime || 0);
      setDuration(audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onEnded = () => handleEnded();
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [handleEnded]);

  useEffect(() => {
    if (!current) return;
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artistName,
      album: current.albumTitle || 'Bar 4 Bar First Drops',
    });
    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => skipNext());
  }, [current, togglePlay, prev, skipNext]);

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

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = value;
    setElapsed(value);
  };

  return (
    <div className="relative flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <DeckNeonBackground />
      <audio ref={audioRef} preload="none" className="hidden" />

      <header className="relative z-10 shrink-0 border-b border-fuchsia-500/15 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">
                Bar 4 Bar First Drops
              </p>
              <h1 className="font-headline text-4xl font-bold uppercase leading-none sm:text-5xl">
                The Deck
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Your unlocked drops on a pressing plate — search, crate, and play without leaving the studio.
              </p>
            </div>
            <p className="font-code text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {playables.length} on platter · {items.length} unlocked
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-300/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, artist, pressing…"
                className="border-fuchsia-500/25 bg-black/30 pl-9 font-code"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as DeckSort)}>
              <SelectTrigger className="w-full border-fuchsia-500/25 bg-black/30 sm:w-[160px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">Fresh ink</SelectItem>
                <SelectItem value="played">Last spun</SelectItem>
                <SelectItem value="az">Title A–Z</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="paid">Paid first</SelectItem>
              </SelectContent>
            </Select>
            <Select value={group} onValueChange={(v) => setGroup(v as DeckGroup)}>
              <SelectTrigger className="w-full border-fuchsia-500/25 bg-black/30 sm:w-[160px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kind">Singles / pressings</SelectItem>
                <SelectItem value="artist">By artist</SelectItem>
                <SelectItem value="access">Bought / free</SelectItem>
                <SelectItem value="month">By month</SelectItem>
                <SelectItem value="none">Flat platter</SelectItem>
              </SelectContent>
            </Select>
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
              <span className="font-headline font-bold uppercase">All drops</span>
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
              <p className="truncate font-headline text-2xl font-bold uppercase">
                {current?.title || 'Nothing on the plate'}
              </p>
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
                  <Link href={`/share/${current.shareId}`} aria-label="Open drop page">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
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
                                  else void loadAndPlay(item);
                                }}
                              >
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
                                    {item.free ? ' · Free' : ` · ${centsToUsdLabel(item.amountCents)}`}
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
                                    aria-label="Add to crate"
                                  >
                                    <ListPlus className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
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
              The drops stay in your library. Only the crate goes.
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
