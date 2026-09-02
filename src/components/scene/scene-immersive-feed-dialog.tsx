'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Compass, ExternalLink, Radio, Vault, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PostCard } from '@/components/profile/post-card';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import type { ProfilePost } from '@/lib/profile/social-client';
import type { DiscoverCard } from '@/lib/scene/discover-client';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';
import {
  pressTokens,
  pressingCssVars,
  type PressingConfig,
} from '@/lib/profile/pressing';
import { parseStudioBadge, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import { LivingPressField } from '@/components/profile/living-press-field';
import { useAuth } from '@/hooks/use-auth';
import { resolveDnaDropHref } from '@/lib/dna-drop-access';

type FeedMode = 'block' | 'discover';

const MemoizedLivingPressField = React.memo(LivingPressField);

type SlideMeta = {
  key: string;
  name: string;
  label: string;
  href?: string;
  userId?: string;
  slug?: string;
  avatarUrl?: string;
  useStarMark?: boolean;
  starMarkSeed?: number;
  studioChrome?: StudioNameChrome | null;
  pressing?: PressingConfig;
};

type SceneImmersiveFeedDialogProps = {
  mode: FeedMode | null;
  initialItemKey?: string;
  onOpenChange: (open: boolean) => void;
  posts: ProfilePost[];
  discoverCards: DiscoverCard[];
  viewerSlug?: string;
  onPostDeleted?: (postId: string) => void;
  onLockRemoved?: (lockId: string) => void;
};

function blockMeta(post: ProfilePost): SlideMeta {
  return {
    key: `post-${post.id}`,
    name: post.ownerName,
    label: post.text || (post.video ? 'Clip' : post.imageUrl ? 'Photo post' : post.voice ? 'Voice post' : 'Your Block'),
    userId: post.ownerId,
    slug: post.ownerSlug,
    href: post.ownerSlug ? profileHref(post.ownerSlug) : undefined,
    avatarUrl: post.ownerAvatarUrl,
    useStarMark: post.ownerStarMarkUseStar,
    starMarkSeed: post.ownerStarMarkSeed,
    studioChrome: parseStudioBadge(post.ownerStudioBadge),
    pressing: post.pressing,
  };
}

function discoverMeta(card: DiscoverCard, signedIn: boolean): SlideMeta {
  if (card.kind === 'post') return blockMeta(card.post);
  if (card.kind === 'artist') {
    return {
      key: card.key,
      name: card.artist.displayName,
      label: card.match?.reasons?.join(' · ') || 'Artist Home',
      userId: card.artist.userId,
      slug: card.artist.slug,
      avatarUrl: card.artist.avatarUrl,
      useStarMark: card.artist.starMarkUseStar,
      starMarkSeed: card.artist.starMarkSeed,
      href: profileHref(card.artist.slug),
      studioChrome: parseStudioBadge(card.artist.studioBadge),
      pressing: card.artist.pressing,
    };
  }
  if (card.kind === 'drop') {
    return {
      key: card.key,
      name: card.drop.ownerName,
      label: card.drop.title,
      userId: card.drop.ownerId,
      slug: card.drop.ownerSlug,
      avatarUrl: card.drop.avatarUrl,
      useStarMark: card.drop.starMarkUseStar,
      starMarkSeed: card.drop.starMarkSeed,
      href: card.drop.hasDropAudio
        ? `/song/${card.drop.shareId}`
        : resolveDnaDropHref(card.drop.shareId, signedIn),
      studioChrome: parseStudioBadge(card.drop.studioBadge),
      pressing: card.drop.pressing,
    };
  }
  if (card.kind === 'lock') {
    return {
      key: card.key,
      name: card.lock.ownerName,
      label: 'Finish this bar',
      userId: card.lock.ownerId,
      slug: card.lock.ownerSlug,
      href: `/lock/${card.lock.id}`,
      pressing: card.lock.pressing,
    };
  }
  const first = card.risers[0];
  return {
    key: card.key,
    name: first?.displayName || 'Rising this week',
    label: 'Music moving now',
    userId: first?.userId,
    slug: first?.profileSlug,
    avatarUrl: first?.avatarUrl,
    useStarMark: first?.starMarkUseStar,
    starMarkSeed: first?.starMarkSeed,
    href: '/leaderboard',
    studioChrome: parseStudioBadge(first?.studioBadge),
    pressing: first?.pressing,
  };
}

function FeedBubble({ meta, active, onClick }: { meta: SlideMeta; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-1 focus-visible:outline-none"
      aria-label={`Jump to ${meta.name}`}
      aria-current={active ? 'true' : undefined}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        <LiveArtistStarAvatar
          name={meta.name}
          userId={meta.userId}
          slug={meta.slug}
          avatarUrl={meta.avatarUrl}
          useStarMark={meta.useStarMark}
          starMarkSeed={meta.starMarkSeed}
          studioChrome={meta.studioChrome}
          size={44}
          link={false}
          className={cn(
            active
              ? '!border-sky-300 brightness-110 drop-shadow-[0_0_9px_rgba(56,189,248,0.9)]'
              : 'opacity-70 group-hover:opacity-100'
          )}
        />
      </span>
      <span className={cn('w-full truncate text-center font-code text-[8px] font-bold uppercase leading-4 tracking-wide', active ? 'text-white' : 'text-white/45')}>
        {meta.name}
      </span>
    </button>
  );
}

/** Card whose top is at the scroller top — the one being shown. */
function feedTopIndex(scroller: HTMLDivElement): number {
  const slides = Array.from(scroller.children) as HTMLElement[];
  if (!slides.length) return 0;
  const top = scroller.scrollTop + 8;
  let index = 0;
  while (index < slides.length - 1 && slides[index + 1]!.offsetTop <= top) index += 1;
  return index;
}

function backdropId(meta: SlideMeta): string {
  return meta.userId || meta.key;
}

function FeedBackdrop({
  meta,
  mode,
  opacity,
}: {
  meta: SlideMeta;
  mode: FeedMode;
  opacity: number;
}) {
  const pressingStyle = useMemo(
    () => (meta.pressing ? pressingCssVars(pressTokens(meta.pressing)) : undefined),
    [meta.pressing]
  );

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ ...pressingStyle, opacity }}
      aria-hidden
    >
      {meta.pressing ? (
        <MemoizedLivingPressField
          config={meta.pressing}
          className="!absolute"
          followWindowScroll={false}
          staticField
        />
      ) : (
        <div className={cn(
          'absolute inset-0',
          mode === 'block'
            ? 'bg-[radial-gradient(circle_at_25%_35%,rgba(236,72,153,0.16),transparent_38%),radial-gradient(circle_at_75%_70%,rgba(37,99,235,0.16),transparent_44%),#030812]'
            : 'bg-[radial-gradient(circle_at_25%_35%,rgba(34,211,238,0.15),transparent_38%),radial-gradient(circle_at_75%_70%,rgba(168,85,247,0.16),transparent_44%),#030812]'
        )} />
      )}
    </div>
  );
}

export function SceneImmersiveFeedDialog({
  mode,
  initialItemKey,
  onOpenChange,
  posts,
  discoverCards,
  viewerSlug,
  onPostDeleted,
  onLockRemoved,
}: SceneImmersiveFeedDialogProps) {
  const { user } = useAuth();
  const open = mode !== null;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const pendingIndexRef = useRef(0);
  const activeIndexRef = useRef(0);
  const itemsLengthRef = useRef(0);
  const historyEntryActiveRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    const handlePopState = () => {
      if (!historyEntryActiveRef.current) return;
      historyEntryActiveRef.current = false;
      onOpenChangeRef.current(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!open || historyEntryActiveRef.current) return;

    const currentState = window.history.state;
    window.history.pushState(
      {
        ...(currentState && typeof currentState === 'object' ? currentState : {}),
        bar4barSceneImmersive: true,
      },
      '',
      window.location.href
    );
    historyEntryActiveRef.current = true;
  }, [open]);

  const closeToScene = useCallback(() => {
    if (historyEntryActiveRef.current) {
      window.history.back();
      return;
    }
    onOpenChange(false);
  }, [onOpenChange]);

  const leaveForNavigation = useCallback(() => {
    historyEntryActiveRef.current = false;
    onOpenChange(false);
  }, [onOpenChange]);

  const items = useMemo(() => {
    if (mode === 'block') {
      return posts.map((post) => ({ meta: blockMeta(post), post }));
    }
    if (mode === 'discover') {
      return discoverCards.map((card) => ({ meta: discoverMeta(card, Boolean(user)), card }));
    }
    return [];
  }, [discoverCards, mode, posts, user]);

  itemsLengthRef.current = items.length;

  useEffect(() => {
    if (!open) return;
    activeIndexRef.current = 0;
    setActiveIndex(0);
    requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 0 }));
  }, [mode, open]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  useEffect(() => {
    if (activeIndex < items.length) return;
    const next = Math.max(0, items.length - 1);
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [activeIndex, items.length]);

  const applyActiveIndex = (next: number) => {
    if (activeIndexRef.current === next) return;
    activeIndexRef.current = next;
    setActiveIndex(next);
    bubbleRefs.current[next]?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  };

  const scrollTo = (index: number) => {
    const next = Math.max(0, Math.min(items.length - 1, index));
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.children.item(next)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    applyActiveIndex(next);
  };

  const syncScrollPosition = (scroller: HTMLDivElement) => {
    pendingIndexRef.current = feedTopIndex(scroller);
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      const next = Math.max(0, Math.min(itemsLengthRef.current - 1, pendingIndexRef.current));
      applyActiveIndex(next);
      scrollFrameRef.current = null;
    });
  };

  useEffect(() => {
    if (!open || !initialItemKey || !items.length) return;
    const index = items.findIndex((item) => item.meta.key === initialItemKey);
    if (index < 0) return;
    const timer = window.setTimeout(() => scrollTo(index), 60);
    return () => window.clearTimeout(timer);
    // `scrollTo` is intentionally derived from the current item list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItemKey, items, open]);

  const current = items[activeIndex]?.meta;
  const title = mode === 'block' ? 'Your Block' : 'Discover the Scene';
  const nearbyBackdrops = useMemo(() => {
    if (!items.length) return [];
    const start = Math.max(0, activeIndex - 1);
    const end = Math.min(items.length - 1, activeIndex + 1);
    const currentId = items[activeIndex] ? backdropId(items[activeIndex]!.meta) : '';
    const seen = new Set<string>();
    const out: Array<{ id: string; meta: SlideMeta; opacity: number }> = [];
    for (let i = start; i <= end; i += 1) {
      const meta = items[i]!.meta;
      const id = backdropId(meta);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, meta, opacity: id === currentId ? 1 : 0 });
    }
    return out;
  }, [activeIndex, items]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) closeToScene();
    }}>
      <DialogContent
        hideClose
        overlayClassName="bg-black/90 backdrop-blur-md"
        className="!left-0 !top-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !gap-0 !overflow-hidden !rounded-none !border-0 !bg-[#030812] !p-0 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Scroll one full-screen post or profile at a time.</DialogDescription>

        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#030812]">
          {mode ? nearbyBackdrops.map((backdrop) => (
            <FeedBackdrop
              key={`backdrop-${backdrop.id}`}
              meta={backdrop.meta}
              mode={mode}
              opacity={backdrop.opacity}
            />
          )) : null}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.28)_100%)]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black via-black/85 to-transparent pb-6 pt-[max(0.65rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-1 px-2 sm:gap-2 sm:px-5">
            <button type="button" onClick={closeToScene} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white p-1" aria-label="Bar4Bar home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo.png" alt="" className="h-full w-full object-contain" />
            </button>
            <span className={cn(
              'hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border sm:flex',
              mode === 'block' ? 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200' : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
            )}>
              {mode === 'block' ? <Radio className="h-4 w-4" /> : <Compass className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="whitespace-nowrap font-headline text-[0.85rem] font-bold uppercase leading-none tracking-tight text-white sm:text-lg">{title}</p>
              <p className="mt-1 font-code text-[8px] font-bold uppercase tracking-[0.18em] text-white/40">
                {items.length ? `${activeIndex + 1} of ${items.length} · swipe or scroll` : 'Waiting for the Scene'}
              </p>
            </div>
            <button type="button" onClick={closeToScene} className="flex h-9 items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200 hover:border-cyan-300/60 sm:px-2.5" aria-label="The Scene"><Radio className="h-3.5 w-3.5" /><span className="hidden sm:inline">Scene</span></button>
            <Link href="/vault" onClick={leaveForNavigation} className="flex h-9 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 text-[9px] font-bold uppercase tracking-wider text-amber-200 hover:border-amber-300/60 sm:px-2.5" aria-label="The Vault"><Vault className="h-3.5 w-3.5" /><span className="hidden sm:inline">Vault</span></Link>
            <button
              type="button"
              onClick={closeToScene}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/70 transition hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:w-10"
              aria-label={`Close ${title}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {items.length > 0 ? (
            <div className="pointer-events-auto mt-2 flex gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
              {items.map((item, index) => (
                <span className="block shrink-0" key={item.meta.key} ref={(node) => { bubbleRefs.current[index] = node; }}>
                  <FeedBubble meta={item.meta} active={activeIndex === index} onClick={() => scrollTo(index)} />
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div
          ref={scrollerRef}
          className="relative z-10 h-[100dvh] touch-pan-y snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
          onScroll={(event) => syncScrollPosition(event.currentTarget)}
        >
          {items.length ? items.map((item, index) => (
            <section
              key={item.meta.key}
              className="relative flex min-h-[100dvh] touch-pan-y snap-start items-center justify-center pb-[max(7.4rem,calc(env(safe-area-inset-bottom)+6rem))] pl-3 pr-14 pt-[7.4rem] sm:px-16 sm:pb-[max(8.25rem,calc(env(safe-area-inset-bottom)+6rem))] sm:pt-[8.25rem]"
              aria-label={`${title}: ${item.meta.name}`}
            >
              <div className="relative z-10 w-full max-w-[44rem]">
                <div className="mb-2 flex min-w-0 items-center gap-2 px-1 pr-14 sm:pr-1">
                  {item.meta.href ? (
                    <Link href={item.meta.href} onClick={leaveForNavigation} className="contents">
                      <LiveArtistStarAvatar
                        name={item.meta.name}
                        userId={item.meta.userId}
                        slug={item.meta.slug}
                        avatarUrl={item.meta.avatarUrl}
                        useStarMark={item.meta.useStarMark}
                        starMarkSeed={item.meta.starMarkSeed}
                        studioChrome={item.meta.studioChrome}
                        size={42}
                        link={false}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white hover:text-sky-200">{item.meta.name}</span>
                        <span className="block truncate font-code text-[8px] uppercase tracking-[0.16em] text-white/40">{item.meta.label}</span>
                      </span>
                    </Link>
                  ) : (
                    <>
                      <LiveArtistStarAvatar name={item.meta.name} userId={item.meta.userId} slug={item.meta.slug} avatarUrl={item.meta.avatarUrl} useStarMark={item.meta.useStarMark} starMarkSeed={item.meta.starMarkSeed} studioChrome={item.meta.studioChrome} size={42} link={false} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{item.meta.name}</span>
                        <span className="block truncate font-code text-[8px] uppercase tracking-[0.16em] text-white/40">{item.meta.label}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="touch-pan-y rounded-2xl border border-white/10 bg-[hsl(216_38%_7%)]/95 p-0.5 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
                  {'post' in item ? (
                    <PostCard
                      post={item.post}
                      showAuthor
                      viewerSlug={viewerSlug}
                      onDeleted={onPostDeleted}
                      immersive
                      mediaActive={index === activeIndex}
                    />
                  ) : 'card' in item ? (
                    <SceneDiscoverCard
                      card={item.card}
                      viewerSlug={viewerSlug}
                      onLockRemoved={onLockRemoved}
                      immersive
                      mediaActive={index === activeIndex}
                    />
                  ) : null}
                </div>
              </div>

              <div className="absolute right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 sm:right-5">
                <button
                  type="button"
                  onClick={() => scrollTo(index - 1)}
                  disabled={index === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/70 backdrop-blur transition hover:border-white/35 hover:text-white disabled:opacity-25"
                  aria-label="Previous post"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo(index + 1)}
                  disabled={index === items.length - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/70 backdrop-blur transition hover:border-white/35 hover:text-white disabled:opacity-25"
                  aria-label="Next post"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
                {item.meta.href ? (
                  <Link
                    href={item.meta.href}
                    onClick={leaveForNavigation}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/15 text-sky-200 backdrop-blur transition hover:border-sky-300/60 hover:text-white"
                    aria-label={`Open ${item.meta.name}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>

              {index < items.length - 1 ? (
                <button
                  type="button"
                  onClick={() => scrollTo(index + 1)}
                  className="absolute bottom-[max(3.25rem,calc(env(safe-area-inset-bottom)+2.5rem))] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-0.5 font-code text-[8px] font-bold uppercase tracking-[0.18em] text-white/45 hover:text-white/75 sm:bottom-[max(1rem,env(safe-area-inset-bottom))]"
                >
                  Next <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                </button>
              ) : null}
            </section>
          )) : (
            <section className="flex h-[100dvh] snap-start items-center justify-center px-6 pt-24 text-center">
              <div className="max-w-sm rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10">
                <p className="font-headline text-xl font-bold uppercase text-white">Nothing here yet</p>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {mode === 'block' ? 'Add friends or post from your Artist Home to wake up your Block.' : 'Fresh artists, songs, and posts will appear as the Scene moves.'}
                </p>
              </div>
            </section>
          )}
        </div>

        {current?.href ? <span className="sr-only">Current item can be opened at {current.href}</span> : null}
      </DialogContent>
    </Dialog>
  );
}
