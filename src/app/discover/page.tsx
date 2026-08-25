'use client';

/**
 * Full Discover stream — newest public Scene activity beyond the home strip.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Compass, Hammer, Sparkles, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import { GuestScenePortalHub } from '@/components/scene/scene-portal-hub';
import { SceneUniversalSearch } from '@/components/scene/scene-universal-search';
import { SectionPager } from '@/components/scene/section-pager';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSceneLayout } from '@/hooks/use-scene-layout';
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
import { LivingPressField } from '@/components/profile/living-press-field';
import { pressTokens, pressingCssVars } from '@/lib/profile/pressing';
import { cn } from '@/lib/utils';

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
  const [guestFeedOpen, setGuestFeedOpen] = useState(false);
  const profileEntryTopRef = useRef(false);
  const isMobile = useIsMobile();
  const { portalHubEnabled } = useSceneLayout();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    setSearchQuery(url.searchParams.get('q')?.slice(0, 80) || '');
    profileEntryTopRef.current = url.searchParams.get('entry') === 'profile';
    if (profileEntryTopRef.current) {
      url.searchParams.delete('entry');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    if (authLoading || !loaded || !profileEntryTopRef.current) return;
    const resetToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    resetToTop();
    const frame = window.requestAnimationFrame(resetToTop);
    const settle = window.setTimeout(() => {
      resetToTop();
      profileEntryTopRef.current = false;
    }, 180);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [authLoading, loaded]);

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
  const showGuestPortal = !user && isMobile && portalHubEnabled;
  const guestPortalPreviews = useMemo(
    () => cards.filter((card) => card.kind !== 'drop' || !card.drop.hasDropAudio).slice(0, 3),
    [cards]
  );
  const newestPressed = useMemo(
    () => (discover?.drops || []).filter((drop) => drop.type === 'track' && drop.hasDropAudio).slice(0, 5),
    [discover?.drops]
  );
  const guestPressing = !user
    ? discover?.artists.find((artist) => artist.pressing)?.pressing || discover?.drops.find((drop) => drop.pressing)?.pressing
    : undefined;
  const guestPressingStyle = useMemo(
    () => guestPressing ? pressingCssVars(pressTokens(guestPressing)) : undefined,
    [guestPressing]
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

  const openGuestFeed = useCallback(() => {
    setGuestFeedOpen(true);
    window.setTimeout(() => {
      document.getElementById(LIST_SECTION_ID)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, []);

  if (authLoading || !loaded) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background" style={guestPressingStyle as React.CSSProperties}>
      {!user && guestPressing ? <LivingPressField config={guestPressing} /> : null}
      <div className={cn('relative z-10 mx-auto w-full min-w-0 px-3 py-6 sm:px-4 sm:py-8', user ? 'max-w-2xl' : 'grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]')}>
      <main className="min-w-0 space-y-6">
      <header className="space-y-3">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 font-bold uppercase" asChild>
          <Link href="/">
            <ChevronLeft className="h-3.5 w-3.5" /> The Scene
          </Link>
        </Button>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">
              Discover
            </h1>
            <p className="mt-0.5 break-words text-sm leading-relaxed text-muted-foreground">
              Public music people and First Drops, matched from the identity and taste you chose
            </p>
          </div>
        </div>
      </header>

      <SceneUniversalSearch
        className="w-full min-w-0"
        variant="page"
        query={searchQuery}
        onQueryChange={updateSearchQuery}
        excludedUserIds={blockedIds}
      />

      {user && searchQuery.trim().length < 2 ? <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
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

      {showGuestPortal && searchQuery.trim().length < 2 ? (
        <GuestScenePortalHub
          publicPulse={discover?.publicPulse || { profiles: 0, posts: 0, pressedSongs: 0 }}
          newestPressed={newestPressed}
          discoverPreviews={guestPortalPreviews}
          onOpenDiscover={openGuestFeed}
        />
      ) : null}

      {searchQuery.trim().length < 2 && (!showGuestPortal || guestFeedOpen) ? <div id={LIST_SECTION_ID} className="scroll-mt-[5.5rem] space-y-4">
        {showGuestPortal ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-black/45 px-3 py-2">
            <div className="min-w-0">
              <p className="font-headline text-base font-bold uppercase text-cyan-100">Public Scene feed</p>
              <p className="text-[9px] text-muted-foreground">Newest public activity</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 font-bold uppercase"
              onClick={() => {
                setGuestFeedOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Back to Portal
            </Button>
          </div>
        ) : null}
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
                compactSalePlayer={!user}
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
      </main>
      {!user && !showGuestPortal ? (
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-cyan-400/25 bg-black/60 p-4 backdrop-blur-md">
            <p className="font-headline text-lg font-bold uppercase text-cyan-200">Scene pulse</p>
            <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1">
              {[
                ['Live profiles', discover?.publicPulse.profiles || 0],
                ['Recent posts', discover?.publicPulse.posts || 0],
                ['Pressed songs', discover?.publicPulse.pressedSongs || 0],
              ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/10 bg-black/35 p-2"><p className="font-headline text-xl font-bold">{Number(value).toLocaleString()}</p><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p></div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-fuchsia-400/25 bg-black/60 p-4 backdrop-blur-md">
            <p className="font-headline text-lg font-bold uppercase text-fuchsia-200">Newest pressed</p>
            <div className="mt-3 space-y-2">
              {newestPressed.map((drop) => (
                <Link key={drop.shareId} href={`/song/${drop.shareId}`} className="block rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:border-fuchsia-300/40">
                  <span className="block truncate text-xs font-bold">{drop.title}</span><span className="block truncate font-code text-[9px] text-muted-foreground">{drop.ownerName}</span>
                </Link>
              ))}
            </div>
          </section>
          <Button asChild className="w-full font-bold uppercase"><Link href="/login?mode=signup&next=%2Fdiscover">Join the Scene</Link></Button>
        </aside>
      ) : null}
      </div>
    </div>
  );
}
