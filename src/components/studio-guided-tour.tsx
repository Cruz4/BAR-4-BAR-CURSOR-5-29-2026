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
/** Ignore sub-pixel drift so scroll listeners do not fight the spotlight. */
const SCROLL_DEADBAND_PX = 16;
/** Mobile tab bar + safe area (quest rail hidden on phone during tour). */
const MOBILE_BOTTOM_CHROME = 88;
/** App header + pinned top tour card on phone. */
const MOBILE_HEADER_RESERVE = 68;
/** Keep highlighted targets below the pinned top tour card on phone. */
const MOBILE_TOP_CLEARANCE = MOBILE_HEADER_RESERVE + TOUR_CARD_HEIGHT_ESTIMATE + 24;
/** Max spotlight height on phone when the target element is taller than the safe band. */
const MOBILE_MAX_SPOTLIGHT_VH = 0.24;
const MOBILE_SPOTLIGHT_VH_BY_STEP: Record<string, number> = {
  sheet: 0.52,
};
/** Sticky/fixed targets — auto-scroll fights the spotlight and causes jitter. */
const NO_AUTO_SCROLL_STEP_IDS = new Set(['vault-progress', 'vault-social-dock']);
/** Tab/panel switches need extra time before the target is visible on phone. */
const PANEL_SWITCH_STEP_IDS = new Set(['generation', 'dna', 'dna-drop', 'save']);

function panelSwitchMeasureDelays(stepId: string): number[] {
  if (stepId === 'dna-drop') return [360, 560, 820, 1080];
  if (stepId === 'save') return [320, 520, 760, 1000];
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

function computeMobileCardPlacement(targetRect: DOMRect): 'top' | 'bottom' {
  const vh = window.innerHeight;
  const cardH = TOUR_CARD_HEIGHT_ESTIMATE;
  const topBandBottom = MOBILE_HEADER_RESERVE + cardH + 32;
  const bottomBandTop = vh - MOBILE_BOTTOM_CHROME - cardH - 32;
  const targetCenter = targetRect.top + targetRect.height / 2;

  if (targetRect.top < topBandBottom) return 'bottom';
  if (targetRect.bottom > bottomBandTop) return 'top';
  return targetCenter < (topBandBottom + bottomBandTop) / 2 ? 'bottom' : 'top';
}

function clampMobileSpotlightRect(rect: DOMRect, stepId?: string): DOMRect {
  const maxVh = stepId ? (MOBILE_SPOTLIGHT_VH_BY_STEP[stepId] ?? MOBILE_MAX_SPOTLIGHT_VH) : MOBILE_MAX_SPOTLIGHT_VH;
  const maxH = window.innerHeight * maxVh;
  if (rect.height <= maxH) return rect;
  return new DOMRect(rect.x, rect.y, rect.width, maxH);
}

function scrollTargetIntoMobileSafeBand(el: HTMLElement, placement: 'top' | 'bottom') {
  const vh = window.innerHeight;
  const cardH = TOUR_CARD_HEIGHT_ESTIMATE;
  const topClear = placement === 'top' ? MOBILE_TOP_CLEARANCE : MOBILE_HEADER_RESERVE + 16;
  const bottomClear =
    placement === 'bottom' ? MOBILE_BOTTOM_CHROME + cardH + 24 : MOBILE_BOTTOM_CHROME + 16;
  const idealCenter = (topClear + vh - bottomClear) / 2;
  const rect = el.getBoundingClientRect();
  const elCenter = rect.top + Math.min(rect.height, vh * MOBILE_MAX_SPOTLIGHT_VH) / 2;
  const delta = elCenter - idealCenter;

  if (Math.abs(delta) < SCROLL_DEADBAND_PX) return;

  const parent = getScrollParent(el);
  if (parent) {
    parent.scrollBy({ top: delta, behavior: 'auto' });
    return;
  }
  window.scrollBy({ top: delta, behavior: 'auto' });
}

function scrollTargetVisible(
  el: HTMLElement,
  topReserve: number,
  bottomReserve: number,
  preferEnd: boolean
) {
  const parent = getScrollParent(el);
  if (parent) {
    const elRect = el.getBoundingClientRect();
    const maxBottom = window.innerHeight - bottomReserve;
    if (elRect.top < topReserve - SCROLL_DEADBAND_PX) {
      parent.scrollBy({ top: elRect.top - topReserve - 8, behavior: 'auto' });
    } else if (elRect.bottom > maxBottom + SCROLL_DEADBAND_PX) {
      parent.scrollBy({ top: elRect.bottom - maxBottom + 8, behavior: 'auto' });
    }
    return;
  }

  const elRect = el.getBoundingClientRect();
  const maxBottom = window.innerHeight - bottomReserve;
  const needsScroll =
    elRect.top < topReserve - SCROLL_DEADBAND_PX || elRect.bottom > maxBottom + SCROLL_DEADBAND_PX;
  if (!needsScroll) return;

  el.scrollIntoView({ block: preferEnd ? 'end' : 'start', behavior: 'auto' });
  const after = el.getBoundingClientRect();
  if (after.bottom > maxBottom + SCROLL_DEADBAND_PX) {
    window.scrollBy({ top: after.bottom - maxBottom + 8, behavior: 'auto' });
  } else if (after.top < topReserve - SCROLL_DEADBAND_PX) {
    window.scrollBy({ top: after.top - topReserve - 8, behavior: 'auto' });
  }
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
      for (const selector of list) {
        const candidate = document.querySelector(selector);
        if (!candidate) continue;
        const probe = candidate.getBoundingClientRect();
        if (probe.width > 0 && probe.height > 0) {
          return candidate as HTMLElement;
        }
      }
      const first = list[0] ? document.querySelector(list[0]) : null;
      return first ? (first as HTMLElement) : null;
    };

    return trySelectors(selectors) ?? trySelectors(fallbacks);
  }, [step]);

  const captureRect = useCallback(
    (htmlEl: HTMLElement, shouldScroll: boolean) => {
      const next = htmlEl.getBoundingClientRect();
      if (next.width === 0 && next.height === 0) return;

      const compact = window.innerWidth < MOBILE_BREAKPOINT;
      const bottomCardReserve = compact
        ? TOUR_CARD_HEIGHT_ESTIMATE + MOBILE_BOTTOM_CHROME + 20
        : TOUR_CARD_HEIGHT_ESTIMATE + 32;
      const spaceBelow = window.innerHeight - next.bottom;
      const spaceAbove = next.top;
      const targetInLowerHalf = next.top > window.innerHeight * 0.42;

      const placement: 'top' | 'bottom' = compact
        ? step!.mobileCardPlacement ?? computeMobileCardPlacement(next)
        : spaceBelow < bottomCardReserve + 16 && spaceAbove >= TOUR_CARD_HEIGHT_ESTIMATE + 16
          ? 'top'
          : spaceBelow < TOUR_CARD_HEIGHT_ESTIMATE + 16 || targetInLowerHalf
            ? 'top'
            : 'bottom';
      setCardPlacement(placement);

      const topReserve = compact && placement === 'top' ? MOBILE_TOP_CLEARANCE : placement === 'top' ? TOUR_CARD_HEIGHT_ESTIMATE + 88 : 72;
      const bottomReserve = compact
        ? placement === 'bottom'
          ? bottomCardReserve
          : MOBILE_BOTTOM_CHROME + 16
        : placement === 'bottom'
          ? TOUR_CARD_HEIGHT_ESTIMATE + 24
          : 24;

      const allowAutoScroll = shouldScroll && !hasAutoScrolledRef.current && !NO_AUTO_SCROLL_STEP_IDS.has(step!.id);
      if (allowAutoScroll) {
        if (compact) {
          htmlEl.style.scrollMarginTop = `${placement === 'top' ? MOBILE_TOP_CLEARANCE : MOBILE_HEADER_RESERVE + 16}px`;
          htmlEl.style.scrollMarginBottom = `${placement === 'bottom' ? bottomCardReserve : MOBILE_BOTTOM_CHROME + 16}px`;
          scrollTargetIntoMobileSafeBand(htmlEl, placement);
        } else {
          const preferEndScroll =
            step!.id === 'dna-drop' || (step!.id === 'save' ? false : placement === 'top');
          scrollTargetVisible(htmlEl, topReserve, bottomReserve, preferEndScroll);
        }
        hasAutoScrolledRef.current = true;
      } else if (shouldScroll) {
        hasAutoScrolledRef.current = true;
      }

      const spotlight = htmlEl.getBoundingClientRect();
      setRect(compact ? clampMobileSpotlightRect(spotlight, step!.id) : spotlight);
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
        if (panelSwitchMissing && shouldScroll) {
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
            }, step!.id === 'dna-drop' ? 360 : 280)
          );
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
        const delays = panelSwitch ? panelSwitchMeasureDelays(step!.id) : [180, 420];
        delays.forEach((ms) => {
          measureTimersRef.current.push(window.setTimeout(() => runCapture(false), ms));
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
              ? 'left-4 right-4 top-[max(4.25rem,env(safe-area-inset-top))] slide-in-from-top-2'
              : 'left-4 right-4 bottom-[max(calc(3.75rem+env(safe-area-inset-bottom)),1rem)] slide-in-from-bottom-2'
            : 'w-[min(340px,calc(100vw-32px))] slide-in-from-bottom-2'
        )}
        style={isCompact ? undefined : { top: cardTop ?? 80, left: cardLeft ?? 16 }}
      >
        <div className="rounded-xl border border-primary/30 bg-card shadow-[0_0_40px_rgba(59,130,246,0.25)] flex flex-col max-h-[min(58dvh,calc(100dvh-11rem))] overflow-hidden">
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
