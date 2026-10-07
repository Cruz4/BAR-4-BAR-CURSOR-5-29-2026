'use client';

/**
 * Artist Home section shortcuts — in-flow CSS sticky (same pattern as Scene nav dock).
 * Sits in the gutter to the right of the 1200px deck, starts at The Wall, sticks under the header.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { artistHomeRailTone } from '@/lib/profile/artist-home-section-rail-tones';

const RAIL_FOCUS_ATTR = 'data-artist-home-rail-focus';
const FLASH_MS = 2200;

export type ArtistHomeSectionJump = {
  id: string;
  label: string;
};

const RAIL_WIDTH_PX = 162;
const MIN_GUTTER_PX = RAIL_WIDTH_PX + 28;
const RAIL_SCOPE_SELECTOR = '[data-artist-home-rail-scope]';
/** Match Scene nav dock (`scene-home.tsx`) under sticky app header. */
const RAIL_STICK_CLASS = 'top-[5.25rem]';

function headerBottomPx(): number {
  const header = document.querySelector<HTMLElement>('[data-app-header]');
  return Math.max(72, Math.round(header?.getBoundingClientRect().bottom ?? 84));
}

/** True when this section is the main block in the viewport (not just barely intersecting). */
function isSectionPrimaryInView(el: HTMLElement): boolean {
  const top = headerBottomPx();
  const rect = el.getBoundingClientRect();
  const focusLine = top + (window.innerHeight - top) * 0.38;
  return rect.top <= focusLine && rect.bottom > top + 32;
}

function flashArtistHomeSection(el: HTMLElement, flashRgb: string) {
  el.removeAttribute(RAIL_FOCUS_ATTR);
  el.style.setProperty('--ph-rail-flash-rgb', flashRgb.replace(/,\s*/g, ' '));
  // Force reflow so re-adding the attribute replays the flash animation.
  void el.offsetWidth;
  el.setAttribute(RAIL_FOCUS_ATTR, '1');
  window.setTimeout(() => {
    el.removeAttribute(RAIL_FOCUS_ATTR);
    el.style.removeProperty('--ph-rail-flash-rgb');
  }, FLASH_MS);
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function ArtistHomeSectionRail({
  sections,
  anchorId,
  deckId,
}: {
  sections: ArtistHomeSectionJump[];
  anchorId: string;
  deckId: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinnedIdRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [themeReady, setThemeReady] = useState(false);
  const themeStyleRef = useRef<React.CSSProperties>({});

  const jumpToSection = useCallback((id: string) => {
    pinnedIdRef.current = id;
    setActiveId(id);
    const el = document.getElementById(id);
    if (!el) return;
    const { flashRgb } = artistHomeRailTone(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToSection(id);
    if (reduce) {
      flashArtistHomeSection(el, flashRgb);
      return;
    }
    window.setTimeout(() => flashArtistHomeSection(el, flashRgb), 480);
  }, []);

  useLayoutEffect(() => {
    const sheet = document.querySelector<HTMLElement>('[data-artist-home-sheet]');
    if (!sheet) return;
    const theme = getComputedStyle(sheet);
    themeStyleRef.current = {
      ['--ph-accent' as string]: theme.getPropertyValue('--ph-accent'),
      ['--ph-border' as string]: theme.getPropertyValue('--ph-border'),
      ['--ph-text' as string]: theme.getPropertyValue('--ph-text'),
    };
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (sections.length < 2) return;

    const measureTrack = () => {
      const scope = document.querySelector<HTMLElement>(RAIL_SCOPE_SELECTOR);
      const anchor = document.getElementById(anchorId);
      const track = trackRef.current;
      if (!scope || !anchor || !track) return;

      const gutter = (window.innerWidth - Math.min(window.innerWidth, 1200)) / 2;
      if (gutter < MIN_GUTTER_PX) {
        track.style.display = 'none';
        return;
      }
      track.style.display = '';

      const top = anchor.getBoundingClientRect().top - scope.getBoundingClientRect().top;
      track.style.top = `${Math.max(0, Math.round(top))}px`;
    };

    measureTrack();
    window.addEventListener('resize', measureTrack);

    const ro = new ResizeObserver(measureTrack);
    const deck = document.getElementById(deckId);
    const anchor = document.getElementById(anchorId);
    if (deck) ro.observe(deck);
    if (anchor) ro.observe(anchor);
    if (document.querySelector(RAIL_SCOPE_SELECTOR)) {
      ro.observe(document.querySelector(RAIL_SCOPE_SELECTOR)!);
    }

    return () => {
      window.removeEventListener('resize', measureTrack);
      ro.disconnect();
    };
  }, [anchorId, deckId, sections.length]);

  useEffect(() => {
    if (sections.length < 2) return;
    const releasePinIfScrolledAway = () => {
      const pin = pinnedIdRef.current;
      if (!pin) return;
      const pinnedEl = document.getElementById(pin);
      if (pinnedEl && isSectionPrimaryInView(pinnedEl)) return;
      for (const section of sections) {
        if (section.id === pin) continue;
        const el = document.getElementById(section.id);
        if (el && isSectionPrimaryInView(el)) {
          pinnedIdRef.current = null;
          return;
        }
      }
    };
    window.addEventListener('scroll', releasePinIfScrolledAway, { passive: true });
    return () => window.removeEventListener('scroll', releasePinIfScrolledAway);
  }, [sections]);

  useEffect(() => {
    if (sections.length < 2 || typeof IntersectionObserver === 'undefined') return;
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const pin = pinnedIdRef.current;
        if (pin) {
          setActiveId(pin);
          return;
        }
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit?.target.id) setActiveId(hit.target.id);
      },
      { rootMargin: '-18% 0px -60% 0px', threshold: [0.05, 0.2] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    setActiveId((prev) => {
      if (prev && sections.some((s) => s.id === prev)) return prev;
      return sections[0]?.id ?? null;
    });
  }, [sections]);

  if (sections.length < 2 || !themeReady) return null;

  return (
    <div
      ref={trackRef}
      className="pointer-events-none absolute bottom-0 left-full z-30 ml-4 w-[162px] max-[1551px]:hidden"
      style={themeStyleRef.current}
    >
      <nav
        aria-label="On this page"
        className={cn(
          'pointer-events-auto sticky flex max-h-[calc(100vh-6rem)] flex-col gap-2 overflow-y-auto overscroll-contain pb-3',
          RAIL_STICK_CLASS
        )}
      >
        {sections.map((section) => {
          const active = section.id === activeId;
          const tone = artistHomeRailTone(section.id);
          const Icon = tone.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpToSection(section.id)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex min-h-10 w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left font-code text-[9px] font-bold uppercase leading-tight tracking-[0.1em] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200',
                active ? tone.active : tone.idle
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/35',
                  active && 'border-white/20 bg-black/45'
                )}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 text-center leading-snug">{section.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
