'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LYRICS_PAGE_TOUR_STEPS, type LyricsTourStep } from '@/lib/studio-onboarding';
import { ChevronRight, X } from 'lucide-react';

type StudioGuidedTourProps = {
  active: boolean;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: (skipped: boolean) => void;
  onBeforeStep?: (step: LyricsTourStep) => void;
  steps?: LyricsTourStep[];
  /** Step ids that should pin the tour card to the top on phone/tablet (targets near bottom chrome). */
  mobileTopCardStepIds?: Set<string>;
};

const PAD = 8;
const MOBILE_BREAKPOINT = 768;
const MOBILE_CARD_HEIGHT = 220;
/** Tab bar + quest progress floating above it on mobile */
const MOBILE_BOTTOM_CHROME = 148;
const MOBILE_TOP_CARD_STEPS = new Set(['bar-workstation', 'generation', 'save', 'dna-drop']);

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
    if (elRect.top < topReserve) {
      parent.scrollBy({ top: elRect.top - topReserve - 8, behavior: 'smooth' });
    } else if (elRect.bottom > maxBottom) {
      parent.scrollBy({ top: elRect.bottom - maxBottom + 8, behavior: 'smooth' });
    }
    return;
  }

  el.scrollIntoView({ block: preferEnd ? 'end' : 'start', behavior: 'smooth' });
  const elRect = el.getBoundingClientRect();
  const maxBottom = window.innerHeight - bottomReserve;
  if (elRect.bottom > maxBottom) {
    window.scrollBy({ top: elRect.bottom - maxBottom + 8, behavior: 'smooth' });
  } else if (elRect.top < topReserve) {
    window.scrollBy({ top: elRect.top - topReserve - 8, behavior: 'smooth' });
  }
}

export function StudioGuidedTour({
  active,
  stepIndex,
  onStepChange,
  onComplete,
  onBeforeStep,
  steps = LYRICS_PAGE_TOUR_STEPS,
  mobileTopCardStepIds = MOBILE_TOP_CARD_STEPS,
}: StudioGuidedTourProps) {
  const step = steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardPlacement, setCardPlacement] = useState<'top' | 'bottom'>('bottom');
  const [mounted, setMounted] = useState(false);
  const isCompact = useCompactViewport();
  const scrollStyledElRef = useRef<HTMLElement | null>(null);
  const measureTimersRef = useRef<number[]>([]);

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

  const measureTarget = useCallback(() => {
    if (!active || !step) {
      clearScrollMargins();
      setRect(null);
      return;
    }

    const selectors = step.target.includes(',')
      ? step.target.split(',').map((s) => s.trim())
      : [step.target];
    let el: Element | null = null;
    for (const selector of selectors) {
      const candidate = document.querySelector(selector);
      if (!candidate) continue;
      const probe = candidate.getBoundingClientRect();
      if (probe.width > 0 && probe.height > 0) {
        el = candidate;
        break;
      }
    }
    if (!el) {
      el = document.querySelector(selectors[0]);
    }
    if (!el) {
      clearScrollMargins();
      setRect(null);
      return;
    }

    clearScrollMargins();

    const compact = window.innerWidth < MOBILE_BREAKPOINT;
    const htmlEl = el as HTMLElement;

    const capture = () => {
      const next = htmlEl.getBoundingClientRect();
      if (next.width === 0 && next.height === 0) return;

      let placement: 'top' | 'bottom' = 'bottom';
      if (compact) {
        const bottomCardReserve = MOBILE_CARD_HEIGHT + MOBILE_BOTTOM_CHROME + 20;
        const targetInLowerHalf = next.top > window.innerHeight * 0.42;
        const forceTop = mobileTopCardStepIds.has(step.id);
        placement = forceTop || targetInLowerHalf ? 'top' : 'bottom';
        setCardPlacement(placement);

        const topReserve = placement === 'top' ? MOBILE_CARD_HEIGHT + 88 : 72;
        const bottomReserve =
          placement === 'bottom' ? bottomCardReserve : MOBILE_BOTTOM_CHROME + 24;

        scrollTargetVisible(htmlEl, topReserve, bottomReserve, placement === 'top');

        window.setTimeout(() => {
          setRect(htmlEl.getBoundingClientRect());
        }, placement === 'top' ? 320 : 280);
      } else {
        setCardPlacement('bottom');
        htmlEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setRect(next);
      }
    };

    if (compact) {
      scrollStyledElRef.current = htmlEl;
    }

    requestAnimationFrame(capture);
    measureTimersRef.current.push(window.setTimeout(capture, 180));
    measureTimersRef.current.push(window.setTimeout(capture, 420));
  }, [active, step, clearScrollMargins]);

  useLayoutEffect(() => {
    clearMeasureTimers();
    if (!active || !step) {
      clearScrollMargins();
      setRect(null);
      return;
    }

    onBeforeStep?.(step);
    measureTarget();

    const onResize = () => measureTarget();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      clearMeasureTimers();
      clearScrollMargins();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, stepIndex, step, onBeforeStep, measureTarget, clearMeasureTimers, clearScrollMargins]);

  if (!mounted || !active || !step) return null;

  const isLast = stepIndex >= steps.length - 1;

  let cardTop: number | undefined;
  let cardLeft: number | undefined;

  if (!isCompact && rect) {
    const cardHeight = 220;
    const cardWidth = Math.min(300, window.innerWidth - 32);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= cardHeight + 24) {
      cardTop = rect.bottom + 16;
    } else if (spaceAbove >= cardHeight + 24) {
      cardTop = rect.top - cardHeight - 16;
    } else {
      cardTop = Math.min(rect.bottom + 16, window.innerHeight - cardHeight - 16);
    }

    cardLeft = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
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
            : 'w-[min(300px,calc(100vw-32px))] slide-in-from-bottom-2'
        )}
        style={isCompact ? undefined : { top: cardTop ?? 80, left: cardLeft ?? 16 }}
      >
        <div className="rounded-xl border border-primary/30 bg-card shadow-[0_0_40px_rgba(59,130,246,0.25)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
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
          <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
          {step.example && (
            <p className="text-[10px] text-muted-foreground/90 italic border-l-2 border-primary/30 pl-2 leading-snug">
              {step.example}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
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
