'use client';

/**
 * Full Discover stream — newest public Scene activity beyond the home strip.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Compass, Hammer, Sparkles, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import { SceneUniversalSearch } from '@/components/scene/scene-universal-search';
import { SectionPager } from '@/components/scene/section-pager';
import { useAuth } from '@/hooks/use-auth';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import { fetchBlockedUsers } from '@/lib/profile/social-client';
import {
  buildDiscoverCards,
  DISCOVER_ALL_MAX_CARDS,
  fetchDiscover,
  type DiscoverCard,
  type DiscoverData,
} from '@/lib/scene/discover-client';
import type { DiscoveryGraphMode } from '@/lib/discovery-graph';
import { DISCOVER_PAGE_SIZE } from '@/lib/scene/scene-section-prefs';

const LIST_SECTION_ID = 'discover-list';

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const [discover, setDiscover] = useState<DiscoverData | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [viewerSlug, setViewerSlug] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<DiscoveryGraphMode | 'fresh'>('fresh');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSearchQuery(new URLSearchParams(window.location.search).get('q')?.slice(0, 80) || '');
  }, []);

  const updateSearchQuery = useCallback((next: string) => {
    setSearchQuery(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (next.trim()) url.searchParams.set('q', next.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [data, blocks] = await Promise.all([
          fetchDiscover(user?.id, { view: 'all' }),
          user?.id ? fetchBlockedUsers().catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setDiscover(data);
        setMode(data.viewerGraph.hasTaste ? 'taste' : data.viewerGraph.hasCreation ? 'creation' : 'fresh');
        setBlockedIds(new Set(blocks.map((b) => b.blockedUserId)));
        setPage(0);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    if (user?.id) {
      void fetchGamificationSummary(user.id).then((s) => {
        if (s?.profileSlug) setViewerSlug(s.profileSlug);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const cards: DiscoverCard[] = useMemo(() => {
    if (!discover) return [];
    return buildDiscoverCards(discover, {
      excludeUserIds: blockedIds,
      maxCards: DISCOVER_ALL_MAX_CARDS,
      mode,
    });
  }, [discover, blockedIds, mode]);

  const pageCount = Math.max(1, Math.ceil(cards.length / DISCOVER_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const pageCards = cards.slice(
    safePage * DISCOVER_PAGE_SIZE,
    safePage * DISCOVER_PAGE_SIZE + DISCOVER_PAGE_SIZE
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const goPage = useCallback((next: number) => {
    setPage(next);
    if (typeof document === 'undefined') return;
    window.requestAnimationFrame(() => {
      document.getElementById(LIST_SECTION_ID)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  if (authLoading || !loaded) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 font-bold uppercase" asChild>
          <Link href="/">
            <ChevronLeft className="h-3.5 w-3.5" /> The Scene
          </Link>
        </Button>
        <div className="flex items-end gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">
              Discover
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Public music people and First Drops, matched from the identity and taste you chose
            </p>
          </div>
        </div>
      </header>

      <SceneUniversalSearch
        variant="page"
        query={searchQuery}
        onQueryChange={updateSearchQuery}
        excludedUserIds={blockedIds}
      />

      {searchQuery.trim().length < 2 ? <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap gap-2">
          {discover?.viewerGraph.hasTaste ? (
            <Button
              size="sm"
              variant={mode === 'taste' ? 'default' : 'outline'}
              className="h-9 gap-1.5 font-bold uppercase"
              onClick={() => { setMode('taste'); setPage(0); }}
            >
              <Sparkles className="h-3.5 w-3.5" /> For your taste
            </Button>
          ) : null}
          {discover?.viewerGraph.hasCreation ? (
            <Button
              size="sm"
              variant={mode === 'creation' ? 'default' : 'outline'}
              className="h-9 gap-1.5 font-bold uppercase"
              onClick={() => { setMode('creation'); setPage(0); }}
            >
              <Hammer className="h-3.5 w-3.5" /> For your craft
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={mode === 'fresh' ? 'default' : 'outline'}
            className="h-9 gap-1.5 font-bold uppercase"
            onClick={() => { setMode('fresh'); setPage(0); }}
          >
            <TimerReset className="h-3.5 w-3.5" /> New & live
          </Button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {mode === 'fresh'
            ? 'Newest public activity first.'
            : 'Matches use only public genres, moods, influences, region, identity, and collaboration choices. Money, Ink, Pro status, and private writing never buy placement.'}
        </p>
        {!discover?.viewerGraph.personalized ? (
          <p className="mt-1 text-[10px] text-sky-300">
            Add your Sound Identity in Edit Public Page to unlock personal matching—including Music Fan profiles.
          </p>
        ) : null}
      </div> : null}

      {searchQuery.trim().length < 2 ? <div id={LIST_SECTION_ID} className="scroll-mt-[5.5rem] space-y-4">
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Quiet out there — check back when more artists go live.
            </p>
          </div>
        ) : (
          <>
            {pageCards.map((card) => (
              <SceneDiscoverCard
                key={card.key}
                card={card}
                viewerSlug={viewerSlug}
                onLockRemoved={(lockId) => {
                  setDiscover((prev) =>
                    prev
                      ? { ...prev, locks: prev.locks.filter((l) => l.id !== lockId) }
                      : prev
                  );
                }}
              />
            ))}
            <SectionPager
              page={safePage}
              pageCount={pageCount}
              total={cards.length}
              unit="cards"
              onPrev={() => goPage(Math.max(0, safePage - 1))}
              onNext={() => goPage(Math.min(pageCount - 1, safePage + 1))}
            />
          </>
        )}
      </div> : null}
    </div>
  );
}
