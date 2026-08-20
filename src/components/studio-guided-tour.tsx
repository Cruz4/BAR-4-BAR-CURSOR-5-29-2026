'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LYRICS_PAGE_TOUR_STEPS, type LyricsTourStep } from '@/lib/studio-onboarding';
import { ChevronRight, X } from 'lucide-react';

export type StudioGuidedTourProps = {
  active: boolean;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: (skipped: boolean) => void;
  onBeforeStep?: (step: LyricsTourStep) => void;
  steps?: LyricsTourStep[];
};

const PAD = 8;
const MOBILE_BREAKPOINT = 768;
const TOUR_CARD_HEIGHT_ESTIMATE = 280;
const TOUR_CARD_HEIGHT_MOBILE = 220;
/** Ignore sub-pixel drift so scroll listeners do not fight the spotlight. */
const SCROLL_DEADBAND_PX = 16;
/** Mobile tab bar + safe area (quest rail hidden on phone during tour). */
const MOBILE_BOTTOM_CHROME = 88;
/** App header fallback when the live header node is missing. */
const MOBILE_HEADER_RESERVE = 68;
/**
 * Sticky/fixed rail targets — skip auto-scroll only when already in view.
 * Scene/Vault rails live under overflow-hidden shells that often break sticky,
 * so off-screen rails must still scroll back into the spotlight.
 */
const STICKY_RAIL_STEP_IDS = new Set([
  'vault-progress',
  'vault-social-dock',
  'scene-progress',
  'scene-nav',
]);
/** Tab/panel switches need extra time before the target is visible on phone. */
const PANEL_SWITCH_STEP_IDS = new Set([
  'generation',
  'dna',
  'dna-drop',
  'save',
  'cowriter',
  'vibe',
  'intents',
  'guardrails',
  'style',
  'creative-effects',
  'sheet-takes',
  'song-structure',
  'press-song',
  'collab-sheet',
  'paste',
  'sheet',
  'bar-workstation',
  'rhyme-pulse',
  'try-cowriter',
  'try-dna',
  'try-vibe',
  'try-intents',
  'try-guardrails',
  'try-style',
  'try-effects',
  'try-takes',
  'try-combine',
  'try-left',
  'try-structure',
  'try-press',
  'try-workstation-locked',
  'try-sheet',
  'try-workstation',
  'try-rhyme',
  'try-ink',
  'first-write',
  'first-context',
  'first-generate',
  'first-manual',
  'ws-modes',
  'ws-draft',
  'ws-remix',
]);
/** Max spotlight height on phone when the target element is taller than the safe band. */
const MOBILE_MAX_SPOTLIGHT_VH = 0.22;
const MOBILE_SPOTLIGHT_VH_BY_STEP: Record<string, number> = {
  sheet: 0.38,
  'try-sheet': 0.38,
  'first-write': 0.32,
  'first-context': 0.38,
  'ws-modes': 0.42,
  'ws-draft': 0.42,
  'ws-remix': 0.42,
  'vault-collection': 0.28,
  'scene-feed': 0.32,
  'try-left': 0.28,
  'bar-workstation': 0.28,
  'try-workstation': 0.28,
  'try-combine': 0.28,
  'first-generate': 0.28,
};
/** Targets that may mount late (gamification loading) or sit off-screen after feed scroll. */
const LATE_MOUNT_STEP_IDS = new Set([
  'scene-progress',
  'scene-nav',
  'vault-progress',
  'vault-social-dock',
]);

function panelSwitchMeasureDelays(stepId: string): number[] {
  if (
    stepId === 'dna-drop' ||
    stepId === 'press-song' ||
    stepId === 'try-press' ||
    stepId === 'song-structure' ||
    stepId === 'try-structure' ||
    stepId === 'creative-effects' ||
    stepId === 'try-effects' ||
    stepId === 'sheet-takes' ||
    stepId === 'try-takes'
  ) {
    return [360, 560, 820, 1080];
  }
  if (stepId === 'save' || stepId === 'collab-sheet') return [320, 520, 760, 1000];
  return [260, 480, 720];
}

function useCompactViewport() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return compact;
}

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function getMobileTopChrome(): number {
  const safe = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0'
  );
  let bottom = Math.max(MOBILE_HEADER_RESERVE, safe + 48);
  document.querySelectorAll('[data-app-header], [data-app-chrome]').forEach((node) => {
    const r = (node as HTMLElement).getBoundingClientRect();
    if (r.height > 4 && r.width > 4 && r.top < 280 && r.bottom > 0) {
      bottom = Math.max(bottom, r.bottom);
    }
  });
  return Math.ceil(bottom) + 8;
}

function mobileCardHeight(): number {
  return TOUR_CARD_HEIGHT_MOBILE;
}

function computeMobileCardPlacement(
  targetRect: DOMRect,
  preferred?: 'top' | 'bottom'
): 'top' | 'bottom' {
  const vh = window.innerHeight;
  const cardH = mobileCardHeight();
  const topChrome = getMobileTopChrome();
  const topCardBottom = topChrome + cardH + 20;
  const bottomCardTop = vh - MOBILE_BOTTOM_CHROME - cardH - 20;
  const targetCenter = targetRect.top + targetRect.height / 2;

  let placement = preferred ?? (targetCenter < vh / 2 ? 'bottom' : 'top');
  // Never park the card on top of the thing this step is pointing at.
  if (targetRect.top < topCardBottom) placement = 'bottom';
  if (targetRect.bottom > bottomCardTop) placement = 'top';
  if (targetRect.top < topCardBottom && targetRect.bottom > bottomCardTop) {
    placement = targetCenter < vh / 2 ? 'bottom' : 'top';
  }
  return placement;
}

function clampMobileSpotlightRect(
  rect: DOMRect,
  stepId: string | undefined,
  placement: 'top' | 'bottom'
): DOMRect {
  const maxVh = stepId ? (MOBILE_SPOTLIGHT_VH_BY_STEP[stepId] ?? MOBILE_MAX_SPOTLIGHT_VH) : MOBILE_MAX_SPOTLIGHT_VH;
  const maxH = window.innerHeight * maxVh;
  const topChrome = getMobileTopChrome();
  const cardH = mobileCardHeight();
  const topSafe = topChrome + (placement === 'top' ? cardH + 12 : 8);
  const bottomSafe =
    window.innerHeight - MOBILE_BOTTOM_CHROME - (placement === 'bottom' ? cardH + 12 : 8);
  const band = Math.max(64, bottomSafe - topSafe);

  let y = rect.y;
  let h = Math.min(rect.height, maxH, band);
  const clippedTop = Math.max(rect.y, topSafe);
  const clippedBottom = Math.min(rect.y + Math.min(rect.height, maxH), bottomSafe);
  if (clippedBottom - clippedTop >= 48) {
    y = clippedTop;
    h = clippedBottom - clippedTop;
  } else {
    y = topSafe;
    h = Math.min(h, band);
  }
  return new DOMRect(rect.x, y, rect.width, h);
}

function elementHasLayoutSize(el: Element): boolean {
  const probe = el.getBoundingClientRect();
  return probe.width > 0 && probe.height > 0;
}

/** Visible intersection area with the viewport (0 when fully off-screen). */
function elementVisibleArea(el: Element): number {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const visibleH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  const visibleW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  return visibleH * visibleW;
}

function stickyRailInView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  // Must be substantially on-screen — partial peek at the top edge is not enough.
  if (r.bottom <= 88 || r.top >= vh - 48) return false;
  const visible = Math.min(r.bottom, vh - 24) - Math.max(r.top, 72);
  const need = Math.min(120, Math.max(64, r.height * 0.45));
  return visible >= need;
}

function pageScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function setPageScrollY(top: number) {
  const y = Math.max(0, top);
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;
}

/**
 * Bring a tour target into the viewport. Prefer manual page scroll — overflow:hidden
 * ancestors (app shell) often make scrollIntoView a no-op.
 */
function forceBringIntoView(el: HTMLElement, topReserve: number, bottomReserve: number) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const maxBottom = vh - bottomReserve;
  const needsUp = rect.top < topReserve - SCROLL_DEADBAND_PX;
  const needsDown = rect.bottom > maxBottom + SCROLL_DEADBAND_PX;
  if (!needsUp && !needsDown) return;

  const parent = getScrollParent(el);
  if (parent) {
    if (needsUp) parent.scrollBy({ top: rect.top - topReserve - 8, behavior: 'auto' });
    else parent.scrollBy({ top: rect.bottom - maxBottom + 8, behavior: 'auto' });
  }

  const afterParent = el.getBoundingClientRect();
  const stillNeedsUp = afterParent.top < topReserve - SCROLL_DEADBAND_PX;
  const stillNeedsDown = afterParent.bottom > maxBottom + SCROLL_DEADBAND_PX;
  if (!stillNeedsUp && !stillNeedsDown) return;

  const absoluteTop = afterParent.top + pageScrollY();
  if (stillNeedsUp) {
    setPageScrollY(absoluteTop - topReserve - 8);
  } else {
    const absoluteBottom = afterParent.bottom + pageScrollY();
    setPageScrollY(absoluteBottom - maxBottom + 8);
  }
}

function scrollTargetIntoMobileSafeBand(el: HTMLElement, placement: 'top' | 'bottom') {
  const vh = window.innerHeight;
  const cardH = mobileCardHeight();
  const topChrome = getMobileTopChrome();
  const topClear = placement === 'top' ? topChrome + cardH + 16 : topChrome + 8;
  const bottomClear =
    placement === 'bottom' ? MOBILE_BOTTOM_CHROME + cardH + 20 : MOBILE_BOTTOM_CHROME + 16;
  forceBringIntoView(el, topClear, bottomClear);

  const rect = el.getBoundingClientRect();
  const idealCenter = (topClear + vh - bottomClear) / 2;
  const elCenter = rect.top + Math.min(rect.height, vh * MOBILE_MAX_SPOTLIGHT_VH) / 2;
  const delta = elCenter - idealCenter;
  if (Math.abs(delta) < SCROLL_DEADBAND_PX) return;

  const parent = getScrollParent(el);
  if (parent) {
    parent.scrollBy({ top: delta, behavior: 'auto' });
    return;
  }
  setPageScrollY(pageScrollY() + delta);
}

function scrollTargetVisible(
  el: HTMLElement,
  topReserve: number,
  bottomReserve: number,
  _preferEnd: boolean
) {
  forceBringIntoView(el, topReserve, bottomReserve);
}

function tourCardOverlapsTarget(
  cardTop: number,
  cardLeft: number,
  cardWidth: number,
  cardHeight: number,
  targetRect: DOMRect
) {
  const gap = PAD + 8;
  return !(
    cardLeft + cardWidth + gap < targetRect.left ||
    cardLeft > targetRect.right + gap ||
    cardTop + cardHeight + gap < targetRect.top ||
    cardTop > targetRect.bottom + gap
  );
}

function computeDesktopTourCardPosition(
  targetRect: DOMRect,
  placement: 'top' | 'bottom',
  cardWidth: number,
  cardHeight: number
): { top: number; left: number } {
  const margin = 16;
  const headerReserve = 72;
  const maxTop = window.innerHeight - cardHeight - margin;
  const maxLeft = window.innerWidth - cardWidth - margin;

  const targetOnLeftRail = targetRect.right < window.innerWidth * 0.38;
  const targetOnRightRail = targetRect.left > window.innerWidth * 0.62;

  const candidates: { top: number; left: number }[] = [];

  if (targetOnLeftRail) {
    candidates.push({
      left: Math.min(Math.max(margin, targetRect.right + margin + PAD), maxLeft),
      top: Math.max(headerReserve, Math.min(targetRect.top, maxTop)),
    });
    candidates.push({
      left: Math.max(margin, Math.min(targetRect.left, maxLeft)),
      top: Math.min(targetRect.bottom + margin + PAD, maxTop),
    });
  }

  if (targetOnRightRail) {
    candidates.push({
      left: Math.max(margin, targetRect.left - cardWidth - margin - PAD),
      top: Math.max(headerReserve, Math.min(targetRect.top, maxTop)),
    });
  }

  if (placement === 'bottom') {
    candidates.push({
      left: Math.max(margin, Math.min(targetRect.left, maxLeft)),
      top: Math.min(targetRect.bottom + margin + PAD, maxTop),
    });
  }

  if (placement === 'top') {
    candidates.push({
      left: Math.max(margin, Math.min(targetRect.left, maxLeft)),
      top: Math.max(headerReserve, targetRect.top - cardHeight - margin - PAD),
    });
  }

  candidates.push({
    left: Math.max(margin, window.innerWidth - cardWidth - margin),
    top: headerReserve,
  });

  for (const candidate of candidates) {
    if (
      !tourCardOverlapsTarget(candidate.top, candidate.left, cardWidth, cardHeight, targetRect)
    ) {
      return candidate;
    }
  }

  return candidates[0] ?? { top: headerReserve, left: margin };
}

export function StudioGuidedTour({
  active,
  stepIndex,
  onStepChange,
  onComplete,
  onBeforeStep,
  steps = LYRICS_PAGE_TOUR_STEPS,
}: StudioGuidedTourProps) {
  const step = steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardPlacement, setCardPlacement] = useState<'top' | 'bottom'>('bottom');
  const [mounted, setMounted] = useState(false);
  const [topChrome, setTopChrome] = useState(MOBILE_HEADER_RESERVE);
  const isCompact = useCompactViewport();
  const scrollStyledElRef = useRef<HTMLElement | null>(null);
  const measureTimersRef = useRef<number[]>([]);
  const hasAutoScrolledRef = useRef(false);
  const targetElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearScrollMargins = useCallback(() => {
    if (!scrollStyledElRef.current) return;
    scrollStyledElRef.current.style.scrollMarginTop = '';
    scrollStyledElRef.current.style.scrollMarginBottom = '';
    scrollStyledElRef.current = null;
  }, []);

  const clearMeasureTimers = useCallback(() => {
    measureTimersRef.current.forEach((id) => window.clearTimeout(id));
    measureTimersRef.current = [];
  }, []);

  const resolveTargetEl = useCallback((): HTMLElement | null => {
    if (!step) return null;

    const compact = window.innerWidth < MOBILE_BREAKPOINT;
    const primary =
      compact && step.mobileTarget
        ? step.mobileTarget
        : step.target;
    const selectors = primary.includes(',')
      ? primary.split(',').map((s) => s.trim())
      : [primary];
    const fallbacks =
      compact && step.mobileTarget
        ? step.target.includes(',')
          ? step.target.split(',').map((s) => s.trim())
          : [step.target]
        : [];

    const trySelectors = (list: string[]) => {
      const candidates: HTMLElement[] = [];
      for (const selector of list) {
        document.querySelectorAll(selector).forEach((candidate) => {
          if (!elementHasLayoutSize(candidate)) return;
          candidates.push(candidate as HTMLElement);
        });
      }
      if (candidates.length === 0) return null;
      // Prefer the copy actually on screen (phone strip vs xl rails share the same tour id).
      candidates.sort((a, b) => elementVisibleArea(b) - elementVisibleArea(a));
      return candidates[0] ?? null;
    };

    return trySelectors(selectors) ?? trySelectors(fallbacks);
  }, [step]);

  const captureRect = useCallback(
    (htmlEl: HTMLElement, shouldScroll: boolean) => {
      const next = htmlEl.getBoundingClientRect();
      if (next.width === 0 && next.height === 0) return;

      const compact = window.innerWidth < MOBILE_BREAKPOINT;
      const topChromeNow = compact ? getMobileTopChrome() : MOBILE_HEADER_RESERVE;
      if (compact) setTopChrome(topChromeNow);
      const cardH = compact ? mobileCardHeight() : TOUR_CARD_HEIGHT_ESTIMATE;
      const bottomCardReserve = compact
        ? cardH + MOBILE_BOTTOM_CHROME + 20
        : TOUR_CARD_HEIGHT_ESTIMATE + 32;
      const spaceBelow = window.innerHeight - next.bottom;
      const spaceAbove = next.top;
      const targetInLowerHalf = next.top > window.innerHeight * 0.42;

      const placement: 'top' | 'bottom' = compact
        ? computeMobileCardPlacement(next, step!.mobileCardPlacement)
        : spaceBelow < bottomCardReserve + 16 && spaceAbove >= TOUR_CARD_HEIGHT_ESTIMATE + 16
          ? 'top'
          : spaceBelow < TOUR_CARD_HEIGHT_ESTIMATE + 16 || targetInLowerHalf
            ? 'top'
            : 'bottom';
      setCardPlacement(placement);

      const topReserve = compact
        ? placement === 'top'
          ? topChromeNow + cardH + 16
          : topChromeNow + 8
        : placement === 'top'
          ? TOUR_CARD_HEIGHT_ESTIMATE + 88
          : 72;
      const bottomReserve = compact
        ? placement === 'bottom'
          ? bottomCardReserve
          : MOBILE_BOTTOM_CHROME + 16
        : placement === 'bottom'
          ? TOUR_CARD_HEIGHT_ESTIMATE + 24
          : 24;

      const skipScrollBecauseStickyInView =
        STICKY_RAIL_STEP_IDS.has(step!.id) && stickyRailInView(htmlEl);
      const allowAutoScroll =
        shouldScroll && !hasAutoScrolledRef.current && !skipScrollBecauseStickyInView;
      if (allowAutoScroll) {
        // Stacked Scene/Vault rails live above the feed — jump toward page top first
        // so overflow:hidden shells can't leave the spotlight stranded mid-feed.
        if (STICKY_RAIL_STEP_IDS.has(step!.id) && window.innerWidth < 1280) {
          const y = pageScrollY();
          if (y > 80) setPageScrollY(Math.max(0, y * 0.15));
        }
        if (compact) {
          htmlEl.style.scrollMarginTop = `${placement === 'top' ? topChromeNow + cardH + 16 : topChromeNow + 8}px`;
          htmlEl.style.scrollMarginBottom = `${placement === 'bottom' ? bottomCardReserve : MOBILE_BOTTOM_CHROME + 16}px`;
          scrollTargetIntoMobileSafeBand(htmlEl, placement);
        } else {
          scrollTargetVisible(htmlEl, topReserve, bottomReserve, false);
        }
        // Second pass after layout settles (expand/sticky).
        forceBringIntoView(htmlEl, topReserve, bottomReserve);
        hasAutoScrolledRef.current = true;
      } else if (shouldScroll) {
        hasAutoScrolledRef.current = true;
      }

      const spotlight = htmlEl.getBoundingClientRect();
      // Never paint an off-screen spotlight hole — looks like a full dim overlay.
      if (elementVisibleArea(htmlEl) < 80) {
        if (shouldScroll) {
          forceBringIntoView(htmlEl, topReserve, bottomReserve);
          const retry = htmlEl.getBoundingClientRect();
          if (elementVisibleArea(htmlEl) >= 80) {
            setRect(compact ? clampMobileSpotlightRect(retry, step!.id, placement) : retry);
          }
          // else leave previous/null; delayed measureTarget timers will retry
        }
        return;
      }
      setRect(compact ? clampMobileSpotlightRect(spotlight, step!.id, placement) : spotlight);
    },
    [step]
  );

  const measureTarget = useCallback(
    (shouldScroll: boolean) => {
      if (!active || !step) {
        clearScrollMargins();
        targetElRef.current = null;
        setRect(null);
        return;
      }

      const htmlEl = resolveTargetEl();
      if (!htmlEl) {
        clearScrollMargins();
        targetElRef.current = null;
        setRect(null);
        const panelSwitchMissing = PANEL_SWITCH_STEP_IDS.has(step!.id);
        const lateMountMissing = LATE_MOUNT_STEP_IDS.has(step!.id);
        if ((panelSwitchMissing || lateMountMissing) && shouldScroll) {
          const retryDelays = lateMountMissing && !panelSwitchMissing
            ? [120, 320, 640, 1100]
            : [step!.id === 'dna-drop' ? 360 : 280];
          retryDelays.forEach((ms) => {
            measureTimersRef.current.push(
              window.setTimeout(() => {
                const el = resolveTargetEl();
                if (!el) return;
                clearScrollMargins();
                targetElRef.current = el;
                if (window.innerWidth < MOBILE_BREAKPOINT) {
                  scrollStyledElRef.current = el;
                }
                hasAutoScrolledRef.current = false;
                captureRect(el, true);
                measureTimersRef.current.push(window.setTimeout(() => captureRect(el, false), 420));
              }, ms)
            );
          });
        }
        return;
      }

      clearScrollMargins();
      targetElRef.current = htmlEl;

      const compact = window.innerWidth < MOBILE_BREAKPOINT;
      if (compact) {
        scrollStyledElRef.current = htmlEl;
      }

      const panelSwitch = PANEL_SWITCH_STEP_IDS.has(step!.id);

      const runCapture = (scroll: boolean) => {
        let el = targetElRef.current;
        if (!el || !el.isConnected || (panelSwitch && el.getBoundingClientRect().width === 0)) {
          el = resolveTargetEl();
          if (el) targetElRef.current = el;
        }
        if (!el || !el.isConnected) return;
        captureRect(el, scroll);
      };

      requestAnimationFrame(() => runCapture(shouldScroll && !panelSwitch));
      if (shouldScroll) {
        if (panelSwitch) {
          measureTimersRef.current.push(
            window.setTimeout(() => {
              hasAutoScrolledRef.current = false;
              runCapture(true);
            }, step!.id === 'dna-drop' ? 360 : 260)
          );
        }
        const delays = panelSwitch
          ? panelSwitchMeasureDelays(step!.id)
          : LATE_MOUNT_STEP_IDS.has(step!.id)
            ? [120, 280, 520, 900]
            : [180, 420];
        delays.forEach((ms, i) => {
          measureTimersRef.current.push(
            window.setTimeout(() => {
              // Rail steps often need a second scroll after expand / layout.
              if (LATE_MOUNT_STEP_IDS.has(step!.id) && i < 3) {
                hasAutoScrolledRef.current = false;
                runCapture(true);
              } else {
                runCapture(false);
              }
            }, ms)
          );
        });
      }
    },
    [active, step, clearScrollMargins, resolveTargetEl, captureRect]
  );

  const updateTargetRect = useCallback(() => {
    const el = targetElRef.current;
    if (!el || !el.isConnected) {
      measureTarget(false);
      return;
    }
    captureRect(el, false);
  }, [captureRect, measureTarget]);

  useLayoutEffect(() => {
    clearMeasureTimers();
    hasAutoScrolledRef.current = false;
    if (!active || !step) {
      clearScrollMargins();
      targetElRef.current = null;
      setRect(null);
      return;
    }

    onBeforeStep?.(step);
    measureTarget(true);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    return () => {
      clearMeasureTimers();
      clearScrollMargins();
      targetElRef.current = null;
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [active, stepIndex, step, onBeforeStep, measureTarget, updateTargetRect, clearMeasureTimers, clearScrollMargins]);

  if (!mounted || !active || !step) return null;

  const isLast = stepIndex >= steps.length - 1;

  let cardTop: number | undefined;
  let cardLeft: number | undefined;

  if (!isCompact && rect) {
    const cardHeight = TOUR_CARD_HEIGHT_ESTIMATE;
    const cardWidth = Math.min(340, window.innerWidth - 32);
    const pos = computeDesktopTourCardPosition(rect, cardPlacement, cardWidth, cardHeight);
    cardTop = pos.top;
    cardLeft = pos.left;
  }

  return createPortal(
    <div className="fixed inset-0 z-[6000] pointer-events-none">
      {rect ? (
        <div
          className="fixed rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.82)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/82" />
      )}

      <div
        className={cn(
          'fixed z-[6001] pointer-events-auto animate-in fade-in duration-300 w-auto max-w-none',
          isCompact
            ? cardPlacement === 'top'
              ? 'left-4 right-4 slide-in-from-top-2'
              : 'left-4 right-4 bottom-[max(calc(3.75rem+env(safe-area-inset-bottom)),1rem)] slide-in-from-bottom-2'
            : 'w-[min(340px,calc(100vw-32px))] slide-in-from-bottom-2'
        )}
        style={
          isCompact
            ? cardPlacement === 'top'
              ? { top: topChrome }
              : undefined
            : { top: cardTop ?? 80, left: cardLeft ?? 16 }
        }
      >
        <div className="rounded-xl border border-primary/30 bg-card shadow-[0_0_40px_rgba(59,130,246,0.25)] flex flex-col max-h-[min(42dvh,calc(100dvh-12rem))] overflow-hidden">
          <div className="flex items-start justify-between gap-2 px-4 pt-4 shrink-0">
            <div className="space-y-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary">
                Guided tour · {stepIndex + 1} / {steps.length}
              </p>
              <h3 className="font-headline font-bold text-base text-foreground leading-tight">{step.title}</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onComplete(true)}
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
            {step.example && (
              <p className="text-[10px] text-muted-foreground/90 italic border-l-2 border-primary/30 pl-2 leading-snug">
                {step.example}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 shrink-0 bg-card">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
              onClick={() => onComplete(true)}
            >
              Skip tour
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn('h-8 text-[9px] font-bold uppercase tracking-widest gap-1')}
              onClick={() => {
                if (isLast) onComplete(false);
                else onStepChange(stepIndex + 1);
              }}
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
