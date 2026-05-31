'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
};

const PAD = 8;

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const measureTarget = useCallback(() => {
    if (!active || !step) {
      setRect(null);
      return;
    }
    onBeforeStep?.(step);
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    requestAnimationFrame(() => {
      setRect(el.getBoundingClientRect());
    });
  }, [active, step, onBeforeStep]);

  useLayoutEffect(() => {
    measureTarget();
    if (!active) return;
    const onResize = () => measureTarget();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, stepIndex, measureTarget]);

  if (!mounted || !active || !step) return null;

  const isLast = stepIndex >= steps.length - 1;
  const cardTop = rect ? Math.min(rect.bottom + 16, window.innerHeight - 220) : 80;
  const cardLeft = rect
    ? Math.max(16, Math.min(rect.left, window.innerWidth - 320))
    : 16;

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
        className="fixed z-[6001] w-[min(300px,calc(100vw-32px))] pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ top: cardTop, left: cardLeft }}
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
