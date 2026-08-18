'use client';

/**
 * Ghost jump labels while you are in Your Block or Discover.
 * Top-center = previous landmark. Bottom-center = next landmark.
 * Appear on scroll, fade after a short pause.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BLOCK_SECTION_ID,
  DISCOVER_SECTION_ID,
  FIND_ARTISTS_SECTION_ID,
} from '@/lib/scene-home';
import { cn } from '@/lib/utils';

type FeedLane = 'block' | 'discover';

const FADE_AFTER_MS = 1850;
const EDGE_PX = 3;

function scrollToId(id: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
  if (el) {
    el.scrollIntoView({ behavior, block: 'start' });
    return;
  }
  window.scrollTo({ top: 0, behavior });
}

function scrollToTop() {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
  window.scrollTo({ top: 0, behavior });
}

function JumpLabel({
  placement,
  children,
  onClick,
}: {
  placement: 'top' | 'bottom';
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pointer-events-auto m-0 h-auto min-h-0 appearance-none border-0 bg-transparent p-0 leading-none text-center font-code text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white/80 sm:text-[11px]',
        placement === 'top' && 'drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]',
        placement === 'bottom' && 'drop-shadow-[0_-1px_8px_rgba(0,0,0,0.7)]'
      )}
    >
      {children}
    </button>
  );
}

export function SceneFeedJumpHints({
  blockExpanded,
  discoverExpanded,
  hidden,
  onEnsureBlock,
  onEnsureDiscover,
}: {
  blockExpanded: boolean;
  discoverExpanded: boolean;
  hidden?: boolean;
  onEnsureBlock: () => void;
  onEnsureDiscover: () => void;
}) {
  const [lane, setLane] = useState<FeedLane | null>(null);
  const [findReached, setFindReached] = useState(false);
  const [awake, setAwake] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(56);
  const fadeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measure = () => {
      const header =
        document.querySelector<HTMLElement>('[data-app-header]') ||
        document.querySelector<HTMLElement>('[data-app-header-bar]');
      const bottom = header?.getBoundingClientRect().bottom;
      setHeaderBottom((prev) => {
        const next = Math.max(0, Math.round(bottom ?? 56));
        return prev === next ? prev : next;
      });
    };

    const headerEl = document.querySelector<HTMLElement>('[data-app-header]');
    const headerBarEl = document.querySelector<HTMLElement>('[data-app-header-bar]');

    measure();
    const raf1 = window.requestAnimationFrame(measure);
    const raf2 = window.requestAnimationFrame(() => window.requestAnimationFrame(measure));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    const ro =
      headerEl || headerBarEl
        ? new ResizeObserver(measure)
        : null;
    if (headerEl && ro) ro.observe(headerEl);
    if (headerBarEl && ro) ro.observe(headerBarEl);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readLane = () => {
      const mid = window.innerHeight * 0.42;
      const block = document.getElementById(BLOCK_SECTION_ID);
      const discover = document.getElementById(DISCOVER_SECTION_ID);
      const find = document.getElementById(FIND_ARTISTS_SECTION_ID);
      const inBand = (el: HTMLElement | null, open: boolean) => {
        if (!el || !open) return false;
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      };
      if (inBand(block, blockExpanded)) setLane('block');
      else if (inBand(discover, discoverExpanded)) setLane('discover');
      else setLane(null);

      const findRect = find?.getBoundingClientRect();
      setFindReached(Boolean(findRect && findRect.top < window.innerHeight - 28));
    };

    const poke = () => {
      setAwake(true);
      if (fadeTimer.current != null) window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => setAwake(false), FADE_AFTER_MS);
    };

    const onScroll = () => {
      readLane();
      poke();
    };

    readLane();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', readLane);
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', readLane);
      document.removeEventListener('scroll', onScroll, true);
      if (fadeTimer.current != null) window.clearTimeout(fadeTimer.current);
    };
  }, [blockExpanded, discoverExpanded]);

  const goBooth = useCallback(() => {
    scrollToTop();
  }, []);

  const goBlock = useCallback(() => {
    onEnsureBlock();
    window.requestAnimationFrame(() => scrollToId(BLOCK_SECTION_ID));
  }, [onEnsureBlock]);

  const goDiscover = useCallback(() => {
    onEnsureDiscover();
    window.requestAnimationFrame(() => scrollToId(DISCOVER_SECTION_ID));
  }, [onEnsureDiscover]);

  const goFind = useCallback(() => {
    scrollToId(FIND_ARTISTS_SECTION_ID);
  }, []);

  const show = Boolean(!hidden && lane && awake);
  const showBottom = lane === 'block' || (lane === 'discover' && !findReached);

  return (
    <>
      <div
        className={cn(
          'pointer-events-none fixed left-1/2 z-[35] -translate-x-1/2 transition-opacity duration-500',
          show ? 'opacity-100 [&_button]:pointer-events-auto' : 'opacity-0 [&_button]:pointer-events-none'
        )}
        style={{ top: Math.max(0, headerBottom - 2) }}
        aria-hidden={!show}
      >
        {lane === 'block' ? (
          <JumpLabel placement="top" onClick={goBooth}>
            ↑ Top of Scene
          </JumpLabel>
        ) : (
          <JumpLabel placement="top" onClick={goBlock}>
            ↑ Your Block
          </JumpLabel>
        )}
      </div>
      <div
        className={cn(
          'pointer-events-none fixed left-1/2 z-[25] -translate-x-1/2 transition-opacity duration-500',
          show && showBottom
            ? 'opacity-100 [&_button]:pointer-events-auto'
            : 'opacity-0 [&_button]:pointer-events-none'
        )}
        style={{ bottom: `max(${EDGE_PX}px, env(safe-area-inset-bottom, 0px))` }}
        aria-hidden={!show || !showBottom}
      >
        {lane === 'block' ? (
          <JumpLabel placement="bottom" onClick={goDiscover}>
            ↓ Skip to Discover
          </JumpLabel>
        ) : (
          <JumpLabel placement="bottom" onClick={goFind}>
            ↓ Skip to find a friend
          </JumpLabel>
        )}
      </div>
    </>
  );
}
