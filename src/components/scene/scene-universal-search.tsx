'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Filter, Loader2, MapPin, Music2, Radio, Search, TrendingUp, UserRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  EMPTY_DISCOVERY_SEARCH_FILTERS,
  hasDiscoverySearchFilters,
  normalizeDiscoverySearchFilters,
  writeDiscoverySearchFilters,
  type DiscoverySearchFilters,
  type DiscoverySearchHit,
  type DiscoverySearchKind,
  type DiscoverySearchResponse,
} from '@/lib/discovery-search';
import { fetchDiscoverySearch } from '@/lib/scene/discover-search-client';
import { StudioLoader } from '@/components/studio-loader';
import { studioNameClass } from '@/lib/studio-tier-chrome';
import { fetchMusicCharts } from '@/lib/music-charts-client';
import type { ArtistChartEntry } from '@/lib/music-charts';
import { profileHref } from '@/lib/profile/profile-slug';
import { PUBLIC_IDENTITY_KINDS, type CollaborationStatus, type PublicIdentityKind } from '@/lib/profile/sound-identity';

const EMPTY: DiscoverySearchResponse = { hits: [], total: 0, hasMore: false };

function DiscoveryFilterControls({
  filters,
  onChange,
}: {
  filters: DiscoverySearchFilters;
  onChange: (filters: DiscoverySearchFilters) => void;
}) {
  const set = (patch: Partial<DiscoverySearchFilters>) =>
    onChange(normalizeDiscoverySearchFilters({ ...filters, ...patch }));
  const resultKind = filters.resultKinds[0] || '';
  const identityKind = filters.identityKinds[0] || '';
  const fieldClass = 'h-9 min-w-0 rounded-md border border-white/15 bg-[#07111f] px-2.5 font-code text-[10px] text-white outline-none [color-scheme:dark] focus:border-sky-400/55 [&>option]:bg-[#07111f] [&>option]:text-white';
  return (
    <div className="grid min-w-0 gap-2 border-t border-white/10 p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="min-w-0 space-y-1">
        <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Results</span>
        <select
          className={cn(fieldClass, 'w-full')}
          value={resultKind}
          onChange={(event) => set({ resultKinds: event.target.value ? [event.target.value as DiscoverySearchKind] : [] })}
        >
          <option value="">Everything</option>
          <option value="person">People</option>
          <option value="drop">Songs &amp; Drops</option>
          <option value="post">Scene posts</option>
        </select>
      </label>
      <label className="min-w-0 space-y-1">
        <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Identity</span>
        <select
          className={cn(fieldClass, 'w-full')}
          value={identityKind}
          onChange={(event) => set({ identityKinds: event.target.value ? [event.target.value as PublicIdentityKind] : [] })}
        >
          <option value="">Any identity</option>
          {PUBLIC_IDENTITY_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
        </select>
      </label>
      {([
        ['genre', 'Genre / style', 'Hip-hop, neo-soul…'],
        ['mood', 'Mood', 'Reflective, energetic…'],
        ['influence', 'Influence', 'Artist or movement…'],
        ['region', 'Location / scene', 'New York, Atlanta…'],
      ] as const).map(([key, label, placeholder]) => (
        <label key={key} className="min-w-0 space-y-1">
          <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          <Input
            value={filters[key]}
            onChange={(event) => set({ [key]: event.target.value.slice(0, key === 'influence' || key === 'region' ? 80 : 50) })}
            placeholder={placeholder}
            className="h-9 min-w-0 bg-black/30 font-code text-[10px]"
          />
        </label>
      ))}
      <label className="min-w-0 space-y-1">
        <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Collaboration</span>
        <select
          className={cn(fieldClass, 'w-full')}
          value={filters.collaboration || ''}
          onChange={(event) => set({ collaboration: (event.target.value || undefined) as CollaborationStatus | undefined })}
        >
          <option value="">Any status</option>
          <option value="open">Open to collaborate</option>
          <option value="selective">Selective</option>
          <option value="not_now">Not right now</option>
        </select>
      </label>
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full text-[9px] font-bold uppercase"
          disabled={!hasDiscoverySearchFilters(filters)}
          onClick={() => onChange({ ...EMPTY_DISCOVERY_SEARCH_FILTERS })}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function SearchResultsLoading({ rows }: { rows: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading search results">
      <div className="flex items-center justify-center gap-2.5 border-b border-white/8 px-3 py-4">
        <StudioLoader size="sm" />
        <span className="font-code text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">
          Searching the Scene
        </span>
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex min-w-0 items-start gap-3 border-b border-white/8 px-3 py-3 last:border-b-0"
        >
          <span
            className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-sky-400/20"
            style={{ animationDelay: `${index * 90}ms` }}
          />
          <span className="min-w-0 flex-1 space-y-2">
            <span
              className="block h-3.5 animate-pulse rounded bg-white/15"
              style={{ width: `${58 - index * 7}%`, animationDelay: `${index * 90}ms` }}
            />
            <span
              className="block h-2.5 animate-pulse rounded bg-white/10"
              style={{ width: `${72 - index * 6}%`, animationDelay: `${index * 90 + 40}ms` }}
            />
            <span className="flex gap-1 pt-0.5">
              <span className="h-4 w-14 animate-pulse rounded-full bg-white/8" style={{ animationDelay: `${index * 90 + 80}ms` }} />
              <span className="h-4 w-16 animate-pulse rounded-full bg-white/8" style={{ animationDelay: `${index * 90 + 110}ms` }} />
              {index % 2 === 0 ? (
                <span className="h-4 w-12 animate-pulse rounded-full bg-white/8" style={{ animationDelay: `${index * 90 + 140}ms` }} />
              ) : null}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function SearchHitRow({ hit, onOpen }: { hit: DiscoverySearchHit; onOpen: () => void }) {
  const Icon = hit.kind === 'person' ? UserRound : hit.kind === 'drop' ? Music2 : Radio;
  const tone = hit.kind === 'person' ? 'text-sky-300' : hit.kind === 'drop' ? 'text-fuchsia-300' : 'text-emerald-300';
  return (
    <Link
      href={hit.href}
      onClick={onOpen}
      className="group flex min-w-0 items-start gap-3 border-b border-white/8 px-3 py-3 transition-colors last:border-b-0 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/30 bg-black/30', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(
          'block truncate text-sm font-bold text-foreground group-hover:text-primary',
          hit.kind === 'person' && studioNameClass(hit.studioBadge || 'free')
        )}>
          {hit.title}
        </span>
        <span className="mt-0.5 block truncate font-code text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {hit.subtitle}
        </span>
        {hit.tags.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {hit.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] leading-tight text-muted-foreground">
                {tag}
              </span>
            ))}
          </span>
        ) : null}
        {hit.match?.reasons?.length ? (
          <span className="mt-1 block truncate text-[9px] text-violet-300">
            Match · {hit.match.reasons.join(' · ')}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function SceneUniversalSearch({
  variant = 'dropdown',
  query: controlledQuery,
  onQueryChange,
  filters: controlledFilters,
  onFiltersChange,
  excludedUserIds,
  className,
}: {
  variant?: 'dropdown' | 'page';
  query?: string;
  onQueryChange?: (query: string) => void;
  filters?: DiscoverySearchFilters;
  onFiltersChange?: (filters: DiscoverySearchFilters) => void;
  excludedUserIds?: Set<string>;
  className?: string;
}) {
  const [localQuery, setLocalQuery] = useState('');
  const [localFilters, setLocalFilters] = useState<DiscoverySearchFilters>({ ...EMPTY_DISCOVERY_SEARCH_FILTERS });
  const query = controlledQuery ?? localQuery;
  const setQuery = onQueryChange ?? setLocalQuery;
  const filters = useMemo(
    () => normalizeDiscoverySearchFilters(controlledFilters ?? localFilters),
    [controlledFilters, localFilters]
  );
  const setFilters = onFiltersChange ?? setLocalFilters;
  const [result, setResult] = useState<DiscoverySearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(variant === 'page');
  const [trendingArtists, setTrendingArtists] = useState<ArtistChartEntry[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cleanQuery = query.trim();
  const filtersActive = hasDiscoverySearchFilters(filters);
  const canSearch = cleanQuery.length >= 2 || filtersActive;
  const limit = variant === 'page' ? 60 : 7;

  useEffect(() => {
    if (!canSearch) {
      setResult(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetchDiscoverySearch(cleanQuery, limit, filters)
        .then((next) => {
          if (!cancelled) setResult(next);
        })
        .catch(() => {
          if (!cancelled) setResult(EMPTY);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 240);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, cleanQuery, filters, limit]);

  useEffect(() => {
    if (variant !== 'dropdown') return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [variant]);

  useEffect(() => {
    if (variant !== 'dropdown' || !focused || trendingArtists !== null) return;
    let cancelled = false;
    void fetchMusicCharts({ trackLimit: 1, artistLimit: 6 })
      .then((charts) => {
        if (!cancelled) setTrendingArtists(charts.artists);
      })
      .catch(() => {
        if (!cancelled) setTrendingArtists([]);
      });
    return () => {
      cancelled = true;
    };
  }, [focused, trendingArtists, variant]);

  const visibleHits = useMemo(
    () => result.hits.filter((hit) => !hit.ownerId || !excludedUserIds?.has(hit.ownerId)),
    [excludedUserIds, result.hits]
  );
  const visibleTrendingArtists = useMemo(
    () => (trendingArtists || []).filter((artist) => !excludedUserIds?.has(artist.userId)).slice(0, 3),
    [excludedUserIds, trendingArtists]
  );
  const showPanel = variant === 'page' || (focused && canSearch);
  const showTrendingPanel = variant === 'dropdown' && focused && !canSearch;

  const fullResultsHref = () => {
    const params = new URLSearchParams();
    if (cleanQuery) params.set('q', cleanQuery);
    writeDiscoverySearchFilters(params, filters);
    const queryString = params.toString();
    return `/discover${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)} data-tour="scene-search">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300" />
        <Input
          type="search"
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(event) => setQuery(event.target.value.slice(0, 80))}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFocused(false);
            if (event.key === 'Enter' && variant === 'dropdown' && canSearch) {
              event.preventDefault();
              setFocused(false);
              router.push(fullResultsHref());
            }
          }}
          placeholder="Discover people, taste, cities, songs, Lyrics DNA Drops, posts…"
          aria-label="Search the AKAsheet music network"
          aria-expanded={showTrendingPanel || (showPanel && canSearch)}
          className="h-11 w-full min-w-0 border-sky-400/30 bg-[hsl(216_35%_7%)] pl-10 pr-12 font-code text-xs shadow-[0_12px_32px_rgba(0,0,0,0.25)] placeholder:text-muted-foreground/70 focus-visible:ring-sky-400 sm:pr-20"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-sky-300" /> : null}
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Clear discovery search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {(variant === 'page' || focused) ? (
        <div className={cn(
          'mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/20',
          filtersActive && 'border-sky-400/30'
        )}>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-3 px-3 text-left text-[9px] font-bold uppercase tracking-widest text-sky-200 hover:bg-white/[0.04]"
            onClick={() => setFiltersExpanded((current) => !current)}
            aria-expanded={filtersExpanded}
          >
            <span className="inline-flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filters
              {filtersActive ? <span className="rounded-full bg-sky-400 px-1.5 py-0.5 text-[8px] text-black">On</span> : null}
            </span>
            <span className="text-muted-foreground">{filtersExpanded ? 'Hide' : 'Show'}</span>
          </button>
          {filtersExpanded ? <DiscoveryFilterControls filters={filters} onChange={setFilters} /> : null}
        </div>
      ) : null}

      {showTrendingPanel ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border border-sky-400/25 bg-[hsl(216_38%_7%)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
            <p className="flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-widest text-cyan-300">
              <TrendingUp className="h-3.5 w-3.5" /> Trending artists · 7 days
            </p>
            <span className="font-code text-[8px] uppercase text-muted-foreground">Real listener proof</span>
          </div>
          {trendingArtists === null ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" /></div>
          ) : visibleTrendingArtists.length ? (
            <div>
              {visibleTrendingArtists.map((artist, index) => (
                <Link
                  key={artist.userId}
                  href={profileHref(artist.profileSlug) || `/${artist.profileSlug}`}
                  onClick={() => setFocused(false)}
                  className="group flex min-w-0 items-center gap-3 border-b border-white/8 px-3 py-3 transition-colors last:border-b-0 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 font-code text-[10px] text-fuchsia-200">#{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold uppercase text-white group-hover:text-fuchsia-200">{artist.displayName}</span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate font-code text-[9px] uppercase tracking-wider text-muted-foreground">
                      {artist.regions.length ? <><MapPin className="h-3 w-3 shrink-0" /> {artist.regions.join(' · ')}</> : artist.reasons.join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 font-code text-[10px] font-bold tabular-nums text-cyan-300">{artist.score}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Trending artists will appear as qualified support is earned.</p>
          )}
          <Button variant="ghost" className="h-11 w-full justify-between rounded-none border-t border-white/10 px-4 font-bold uppercase text-sky-300" asChild>
            <Link href="/charts" onClick={() => setFocused(false)}>
              <span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Open music charts</span>
              <span aria-hidden>→</span>
            </Link>
          </Button>
        </div>
      ) : showPanel && canSearch ? (
        <div
          className={cn(
            'z-50 overflow-hidden rounded-xl border border-sky-400/25 bg-[hsl(216_38%_7%)] shadow-2xl',
            variant === 'dropdown' ? 'absolute inset-x-0 top-[calc(100%+0.4rem)]' : 'mt-3'
          )}
          aria-busy={loading}
        >
          {loading ? (
            <SearchResultsLoading rows={variant === 'page' ? 5 : 3} />
          ) : visibleHits.length > 0 ? (
            <div>
              {visibleHits.map((hit) => <SearchHitRow key={`${hit.kind}-${hit.id}`} hit={hit} onOpen={() => setFocused(false)} />)}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No public people, songs, House albums, Lyrics DNA Drops, or posts match {cleanQuery ? `“${cleanQuery}”` : 'these filters'}.
            </p>
          )}
          {!loading && variant === 'dropdown' && (result.hasMore || result.total > visibleHits.length) ? (
            <Button variant="ghost" className="h-11 w-full justify-between rounded-none border-t border-white/10 px-4 font-bold uppercase text-sky-300" asChild>
              <Link href={fullResultsHref()} onClick={() => setFocused(false)}>
                <span className="inline-flex items-center gap-2"><Compass className="h-4 w-4" /> View all results</span>
                <span className="text-[10px] text-muted-foreground">{result.total}</span>
              </Link>
            </Button>
          ) : null}
          {!loading && variant === 'page' && visibleHits.length > 0 ? (
            <p className="border-t border-white/10 px-4 py-3 text-center font-code text-[11px] uppercase tracking-widest text-muted-foreground">
              {result.total} result{result.total === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
      ) : variant === 'page' ? (
        <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
          Type at least two characters. Search public names, Music Fans, genres, moods, influences, regions, songs, Lyrics DNA Drops, and Scene posts.
        </p>
      ) : null}
    </div>
  );
}
