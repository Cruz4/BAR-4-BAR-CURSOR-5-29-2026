'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Archive, ChevronDown, ChevronUp, Compass, ExternalLink, Radio, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { StudioLoader } from '@/components/studio-loader';
import { PostCard } from '@/components/profile/post-card';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import type { ProfilePost } from '@/lib/profile/social-client';
import type { DiscoverCard } from '@/lib/scene/discover-client';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';
import {
  apertureMask,
  pressPlate,
  type PressingConfig,
} from '@/lib/profile/pressing';
import { parseStudioBadge, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import { useAuth } from '@/hooks/use-auth';
import { resolveDnaDropHref } from '@/lib/dna-drop-access';
import {
  isLeavingSceneHome,
  rememberScenePortalSlide,
  type ScenePortalFeed,
} from '@/lib/scene/portal-feed';

type FeedMode = ScenePortalFeed;

const SLIDE_PAINT_WINDOW = 1;

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
  /** Friend Lyrics DNA / pressed songs merged into Your Block (not Discover). */
  blockDropCards?: DiscoverCard[];
  discoverCards: DiscoverCard[];
  viewerSlug?: string;
  onPostDeleted?: (postId: string) => void;
  onPostUpserted?: (post: ProfilePost) => void;
  onLockRemoved?: (lockId: string) => void;
  blockLoading?: boolean;
  discoverLoading?: boolean;
  onRememberFeed?: () => void;
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

/** Integer snap page — stable because every slide is exactly one scroller-tall. */
function feedSnapIndex(scroller: HTMLDivElement, count: number): number {
  const height = scroller.clientHeight || 1;
  return Math.max(0, Math.min(count - 1, Math.round(scroller.scrollTop / height)));
}

function slideScrollEdges(el: HTMLDivElement) {
  const atTop = el.scrollTop <= 2;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 3;
  return { atTop, atBottom };
}

/** Snap feed scroller after a chained touch so the next slide does not feel stuck. */
function snapFeedScroller(feed: HTMLDivElement, count: number) {
  const height = feed.clientHeight || 1;
  const maxIndex = Math.max(0, count - 1);
  const index = Math.max(0, Math.min(maxIndex, Math.round(feed.scrollTop / height)));
  feed.scrollTo({ top: index * height, behavior: 'smooth' });
}

/** Post body — nested scroll only when content overflows; chain vertical swipes to the feed at edges. */
function ImmersiveSlideContent({
  maxHeight,
  feedScrollerRef,
  feedItemCount,
  children,
}: {
  maxHeight: string;
  feedScrollerRef: React.RefObject<HTMLDivElement | null>;
  feedItemCount: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const scrollableRef = useRef(scrollable);
  scrollableRef.current = scrollable;
  const chainedPullRef = useRef(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const prevOverflow = el.style.overflow;
    el.style.overflow = 'hidden';
    const needsScroll = el.scrollHeight > el.clientHeight + 2;
    el.style.overflow = prevOverflow;
    setScrollable((prev) => (prev === needsScroll ? prev : needsScroll));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  useEffect(() => {
    const el = ref.current;
    const feed = feedScrollerRef.current;
    if (!el || !feed) return;

    let lastY = 0;
    let chaining = false;

    const onTouchStart = (event: TouchEvent) => {
      chainedPullRef.current = 0;
      chaining = false;
      lastY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!scrollableRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      const y = touch.clientY;
      const delta = lastY - y;
      lastY = y;
      if (Math.abs(delta) < 0.5) return;

      const { atTop, atBottom } = slideScrollEdges(el);
      const feedEl = feedScrollerRef.current;
      if (!feedEl) return;

      const pullNext = delta > 0 && atBottom;
      const pullPrev = delta < 0 && atTop;
      if (!pullNext && !pullPrev) {
        chaining = false;
        return;
      }

      chaining = true;
      chainedPullRef.current += Math.abs(delta);
      const before = feedEl.scrollTop;
      feedEl.scrollTop += delta;
      if (feedEl.scrollTop !== before) {
        event.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!chaining) return;
      const feedEl = feedScrollerRef.current;
      if (!feedEl) return;
      const { atBottom } = slideScrollEdges(el);
      if (atBottom && chainedPullRef.current > 28) {
        const height = feedEl.clientHeight || 1;
        const idx = feedSnapIndex(feedEl, feedItemCount);
        if (idx < feedItemCount - 1) {
          feedEl.scrollTo({ top: (idx + 1) * height, behavior: 'smooth' });
          return;
        }
      }
      if (chainedPullRef.current > 8) {
        snapFeedScroller(feedEl, feedItemCount);
      }
      chainedPullRef.current = 0;
      chaining = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [feedItemCount, feedScrollerRef]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollable) return;
    const el = ref.current;
    if (!el) return;
    const { atTop, atBottom } = slideScrollEdges(el);
    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) return;
    event.stopPropagation();
  };

  return (
    <div
      ref={ref}
      onWheel={handleWheel}
      className={cn(
        'relative z-10 h-fit w-full max-w-[44rem]',
        scrollable
          ? 'touch-pan-y overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]'
          : 'overflow-visible'
      )}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}

function FeedBackdrop({
  meta,
  mode,
}: {
  meta: SlideMeta | undefined;
  mode: FeedMode;
}) {
  const plate = useMemo(
    () => (meta?.pressing ? pressPlate(meta.pressing) : null),
    [meta?.pressing]
  );

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: plate
          ? `radial-gradient(ellipse 90% 70% at 50% 38%, hsl(${plate.hue} ${Math.round(plate.saturation * 0.32)}% ${plate.bgL + 2}%), hsl(${plate.hue} ${Math.round(plate.saturation * 0.28)}% ${plate.bgL}%))`
          : undefined,
      }}
      aria-hidden
    >
      {plate ? (
        <div className="absolute inset-0" style={{ background: apertureMask(plate.aperture, plate.hue) }} />
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
  blockDropCards = [],
  discoverCards,
  viewerSlug,
  onPostDeleted,
  onPostUpserted,
  onLockRemoved,
  blockLoading = false,
  discoverLoading = false,
  onRememberFeed,
}: SceneImmersiveFeedDialogProps) {
  const { user } = useAuth();
  const open = mode !== null;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRowRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const bubbleSettleRef = useRef<number | null>(null);
  const pendingIndexRef = useRef(0);
  const activeIndexRef = useRef(0);
  const itemsLengthRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [headerPx, setHeaderPx] = useState(118);

  type FeedSlideItem =
    | { meta: SlideMeta; post: ProfilePost }
    | { meta: SlideMeta; card: DiscoverCard };

  const items = useMemo((): FeedSlideItem[] => {
    if (mode === 'block') {
      type BlockItem =
        | { kind: 'post'; meta: SlideMeta; post: ProfilePost; at: string }
        | { kind: 'drop'; meta: SlideMeta; card: DiscoverCard; at: string };
      const merged: BlockItem[] = posts.map((post) => ({
        kind: 'post',
        meta: blockMeta(post),
        post,
        at: post.createdAt || '',
      }));
      for (const card of blockDropCards) {
        if (card.kind !== 'drop') continue;
        merged.push({
          kind: 'drop',
          meta: discoverMeta(card, Boolean(user)),
          card,
          at: card.drop.updatedAt || '',
        });
      }
      merged.sort((a, b) => b.at.localeCompare(a.at));
      return merged.map((item) =>
        item.kind === 'post'
          ? { meta: item.meta, post: item.post }
          : { meta: item.meta, card: item.card }
      );
    }
    if (mode === 'discover') {
      return discoverCards.map((card) => ({ meta: discoverMeta(card, Boolean(user)), card }));
    }
    return [];
  }, [blockDropCards, discoverCards, mode, posts, user]);

  itemsLengthRef.current = items.length;

  const closeToScene = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const leaveForNavigation = useCallback(() => {
    if (!mode) return;
    rememberScenePortalSlide(mode, items[activeIndexRef.current]?.meta.key);
    onRememberFeed?.();
  }, [items, mode, onRememberFeed]);

  const leaveForNavigationIfHref = useCallback(
    (href: string | null) => {
      if (!isLeavingSceneHome(href)) return;
      leaveForNavigation();
    },
    [leaveForNavigation]
  );

  useEffect(() => {
    if (!open) return;
    if (initialItemKey) return;
    activeIndexRef.current = 0;
    setActiveIndex(0);
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ top: 0 });
      bubbleRowRef.current?.scrollTo({ left: 0 });
    });
  }, [initialItemKey, mode, open]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    if (bubbleSettleRef.current !== null) window.clearTimeout(bubbleSettleRef.current);
  }, []);

  useEffect(() => {
    if (activeIndex < items.length) return;
    const next = Math.max(0, items.length - 1);
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [activeIndex, items.length]);

  const centerBubble = (index: number) => {
    const row = bubbleRowRef.current;
    const el = bubbleRefs.current[index];
    if (!row || !el) return;
    const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    const target = Math.max(0, left);
    if (Math.abs(row.scrollLeft - target) < 6) return;
    row.scrollTo({ left: target, behavior: 'smooth' });
  };

  const applyActiveIndex = (next: number) => {
    if (activeIndexRef.current === next) return;
    activeIndexRef.current = next;
    setActiveIndex(next);
  };

  const scheduleBubbleCenter = () => {
    if (bubbleSettleRef.current !== null) window.clearTimeout(bubbleSettleRef.current);
    bubbleSettleRef.current = window.setTimeout(() => {
      bubbleSettleRef.current = null;
      centerBubble(activeIndexRef.current);
    }, 90);
  };

  const scrollTo = (index: number) => {
    const next = Math.max(0, Math.min(items.length - 1, index));
    const scroller = scrollerRef.current;
    if (!scroller) return;
    applyActiveIndex(next);
    scroller.scrollTo({ top: next * scroller.clientHeight, behavior: 'smooth' });
    scheduleBubbleCenter();
  };

  const syncScrollPosition = (scroller: HTMLDivElement) => {
    pendingIndexRef.current = feedSnapIndex(scroller, itemsLengthRef.current);
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      const next = Math.max(0, Math.min(itemsLengthRef.current - 1, pendingIndexRef.current));
      applyActiveIndex(next);
      scrollFrameRef.current = null;
    });
    scheduleBubbleCenter();
  };

  useEffect(() => {
    if (!open || !initialItemKey || !items.length) return;
    const delays = [60, 180, 420, 900];
    const timers = delays.map((delay) =>
      window.setTimeout(() => {
        const index = items.findIndex((item) => item.meta.key === initialItemKey);
        if (index >= 0) scrollTo(index);
      }, delay)
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
    // `scrollTo` is intentionally derived from the current item list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItemKey, items, open]);

  useEffect(() => {
    if (!open) return;
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderPx(Math.ceil(el.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, items.length]);

  const current = items[activeIndex]?.meta;
  const title = mode === 'block' ? 'Your Block' : 'Discover the Scene';
  const feedLoading = mode === 'block' ? blockLoading : mode === 'discover' ? discoverLoading : false;
  const paintedSlides = useMemo(() => {
    const keep = new Set<number>();
    for (let i = activeIndex - SLIDE_PAINT_WINDOW; i <= activeIndex + SLIDE_PAINT_WINDOW; i += 1) {
      if (i >= 0 && i < items.length) keep.add(i);
    }
    return keep;
  }, [activeIndex, items.length]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) closeToScene();
    }}>
      <DialogContent
        hideClose
        overlayClassName="bg-black"
        className="!left-0 !top-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !gap-0 !overflow-hidden !rounded-none !border-0 !bg-[#030812] !p-0 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0"
        onClickCapture={(event) => {
          const href = (event.target as HTMLElement | null)?.closest('a[href]')?.getAttribute('href');
          leaveForNavigationIfHref(href ?? null);
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Scroll one full-screen post or profile at a time.</DialogDescription>

        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#030812]">
          {mode ? <FeedBackdrop meta={current} mode={mode} /> : null}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.28)_100%)]" />
        </div>

        <div
          ref={headerRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black via-black/85 to-transparent pb-4 pt-[max(0.65rem,env(safe-area-inset-top))]"
        >
          <div className="pointer-events-auto flex items-center gap-1 px-2 sm:gap-2 sm:px-5">
            <button type="button" onClick={closeToScene} className="flex h-9 w-9 shrink-0 items-center justify-center" aria-label="AKAsheet home">
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
                {feedLoading && !items.length
                  ? 'Loading…'
                  : items.length
                    ? `${activeIndex + 1} of ${items.length} · swipe or scroll`
                    : 'Waiting for the Scene'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeToScene}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary hover:bg-primary/10"
              aria-label="The Scene"
              title="The Scene"
            >
              <Radio className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <Link
              href="/vault"
              onClick={leaveForNavigation}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sky-400 hover:bg-sky-500/10"
              aria-label="The Vault"
              title="The Vault"
            >
              <Archive className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
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
            <div
              ref={bubbleRowRef}
              className="pointer-events-auto relative mt-2 flex gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5"
            >
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
          {items.length ? items.map((item, index) => {
            const paint = paintedSlides.has(index);
            return (
            <section
              key={item.meta.key}
              data-feed-index={index}
              className="relative flex h-[100dvh] shrink-0 snap-start snap-always items-center justify-center overflow-hidden pb-[max(7.4rem,calc(env(safe-area-inset-bottom)+6rem))] pl-3 pr-14 sm:px-16 sm:pb-[max(8.25rem,calc(env(safe-area-inset-bottom)+6rem))]"
              style={{ paddingTop: headerPx }}
              aria-label={`${title}: ${item.meta.name}`}
            >
              {paint ? (
              <>
              <ImmersiveSlideContent
                maxHeight={`calc(100dvh - ${headerPx}px - max(7.4rem, calc(env(safe-area-inset-bottom) + 6rem)))`}
                feedScrollerRef={scrollerRef}
                feedItemCount={items.length}
              >
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
                        <span className="block break-words text-sm font-bold leading-snug text-white line-clamp-2 hover:text-sky-200">{item.meta.name}</span>
                      </span>
                    </Link>
                  ) : (
                    <>
                      <LiveArtistStarAvatar name={item.meta.name} userId={item.meta.userId} slug={item.meta.slug} avatarUrl={item.meta.avatarUrl} useStarMark={item.meta.useStarMark} starMarkSeed={item.meta.starMarkSeed} studioChrome={item.meta.studioChrome} size={42} link={false} />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-bold leading-snug text-white line-clamp-2">{item.meta.name}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-[hsl(216_38%_7%)]/95 p-0.5 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
                  {'post' in item && item.post ? (
                    <PostCard
                      post={item.post}
                      showAuthor
                      viewerSlug={viewerSlug}
                      onDeleted={onPostDeleted}
                      onReverbed={onPostUpserted}
                      immersive
                      mediaActive={index === activeIndex}
                    />
                  ) : 'card' in item && item.card ? (
                    <SceneDiscoverCard
                      card={item.card}
                      viewerSlug={viewerSlug}
                      onLockRemoved={onLockRemoved}
                      immersive
                      mediaActive={index === activeIndex}
                    />
                  ) : null}
                </div>
              </ImmersiveSlideContent>

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
              </>
              ) : null}
            </section>
            );
          }) : feedLoading ? (
            <section
              className="flex h-[100dvh] snap-start flex-col items-center justify-center gap-4 px-6 pt-24 text-center"
              style={{ paddingTop: headerPx }}
            >
              <StudioLoader
                size="md"
                message={mode === 'block' ? 'Opening Your Block…' : 'Opening Discover…'}
              />
              <p className="max-w-xs text-sm leading-relaxed text-white/45">
                {mode === 'block'
                  ? 'Pulling posts from your circle.'
                  : 'Finding artists, songs, and posts on the Scene.'}
              </p>
            </section>
          ) : (
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
