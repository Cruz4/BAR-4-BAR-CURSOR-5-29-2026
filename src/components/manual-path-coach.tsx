'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  applyManualPathStep,
  getManualPath,
  MANUAL_PATH_START_EVENT,
  MANUAL_PATH_STOP_EVENT,
  openStudioManual,
  readManualPathSession,
  stopManualPath,
  writeManualPathSession,
  type ManualPathLane,
  type ManualPathSession,
} from '@/lib/manual-paths';

function sessionFromEvent(event: Event): ManualPathSession | null {
  const detail = (event as CustomEvent<ManualPathSession>).detail;
  if (!detail?.laneId || !detail.stepId) return null;
  return detail;
}

export function ManualPathCoach() {
  const pathname = usePathname();
  const [session, setSession] = useState<ManualPathSession | null>(null);

  useEffect(() => {
    setSession(readManualPathSession());
    const onStart = (event: Event) => setSession(sessionFromEvent(event) || readManualPathSession());
    const onStop = () => setSession(null);
    window.addEventListener(MANUAL_PATH_START_EVENT, onStart);
    window.addEventListener(MANUAL_PATH_STOP_EVENT, onStop);
    return () => {
      window.removeEventListener(MANUAL_PATH_START_EVENT, onStart);
      window.removeEventListener(MANUAL_PATH_STOP_EVENT, onStop);
    };
  }, []);

  const lane = session ? getManualPath(session.laneId) : undefined;
  const stepIndex = lane ? lane.steps.findIndex((step) => step.id === session?.stepId) : -1;
  const step = lane && stepIndex >= 0 ? lane.steps[stepIndex] : undefined;

  useEffect(() => {
    const eventName = step?.doneEvent;
    if (!eventName) return;
    const onDone = () => advance(lane, stepIndex + 1, true);
    window.addEventListener(eventName, onDone as EventListener);
    return () => window.removeEventListener(eventName, onDone as EventListener);
    // lane/stepIndex captured from render when the listener is bound.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.doneEvent, session?.laneId, session?.stepId]);

  useEffect(() => {
    if (!step?.target) return;
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLElement>(step.target!)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [pathname, step?.target, session?.stepId]);

  const advance = useCallback((current: ManualPathLane | undefined, nextIndex: number, finishedEvent = false) => {
    if (!current) return;
    if (nextIndex >= current.steps.length) {
      stopManualPath();
      return;
    }
    const next = current.steps[nextIndex];
    const nextSession = { laneId: current.id, stepId: next.id };
    writeManualPathSession(nextSession);
    setSession(nextSession);
    if (!finishedEvent) applyManualPathStep(next);
  }, []);

  const onNext = () => advance(lane, stepIndex + 1);
  const onTakeMe = () => {
    if (step) applyManualPathStep(step);
  };

  const progress = useMemo(() => {
    if (!lane || stepIndex < 0) return '';
    return `${stepIndex + 1} / ${lane.steps.length}`;
  }, [lane, stepIndex]);

  if (!lane || !step) return null;

  const last = stepIndex === lane.steps.length - 1;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[5.25rem] z-[70] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem]">
      {step.target ? (
        <style>{`${step.target} { outline: 2px solid rgba(125, 211, 252, 0.85); outline-offset: 4px; }`}</style>
      ) : null}
      <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-[#0b0f14]/95 p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-code text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-200/80">
            Path · {lane.title} · {progress}
          </p>
          <button
            type="button"
            className="shrink-0 text-white/45 hover:text-white"
            onClick={() => stopManualPath()}
            aria-label="Close path"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1 font-headline text-sm font-bold uppercase tracking-wide">{step.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/70">{step.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" className="h-8 gap-1 px-2.5 text-[10px] font-bold uppercase" onClick={onTakeMe}>
            Take me there
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 px-2.5 text-[10px] font-bold uppercase"
            onClick={onNext}
          >
            {last ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {last ? 'Done' : 'Next'}
          </Button>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/45 hover:text-cyan-200"
            onClick={() => {
              stopManualPath();
              openStudioManual('paths');
            }}
          >
            <BookOpen className="h-3 w-3" />
            Paths
          </button>
        </div>
      </div>
    </div>
  );
}
