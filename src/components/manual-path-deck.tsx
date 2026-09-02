'use client';

/**
 * Paths: pick one job, see that screen, then start the coach.
 * Write lyrics and Press a song are separate jobs — never nested.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, MapPin, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startManualPath, type ManualPathLane } from '@/lib/manual-paths';
import {
  MANUAL_PATH_GUIDES,
  PATH_FAMILY_META,
  PATH_GUIDE_FAMILIES,
  getPathGuide,
  guideLane,
  type PathGuide,
} from '@/lib/manual-path-guide';
import { ManualPathScreen } from '@/components/manual-path-screen';

function tierLabel(tier: ManualPathLane['tier']): string {
  if (tier === 'pro') return 'Pro';
  if (tier === 'ink') return 'Ink';
  return 'Free';
}

function tierClass(tier: ManualPathLane['tier']): string {
  if (tier === 'pro') return 'border-fuchsia-300/40 text-fuchsia-100 bg-fuchsia-400/15';
  if (tier === 'ink') return 'border-amber-200/40 text-amber-100 bg-amber-300/15';
  return 'border-cyan-300/40 text-cyan-100 bg-cyan-400/15';
}

function WhereTrail({ where }: { where: string }) {
  const parts = where.split('→').map((part) => part.trim()).filter(Boolean);
  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] leading-snug text-foreground/90">
      <MapPin className="mr-0.5 h-3 w-3 shrink-0 text-cyan-300" />
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          {index > 0 ? <ArrowRight className="h-3 w-3 shrink-0 text-white/30" /> : null}
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-code text-[10px] font-bold uppercase tracking-wide">
            {part}
          </span>
        </React.Fragment>
      ))}
    </p>
  );
}

function JobChip({
  guide,
  selected,
  onSelect,
}: {
  guide: PathGuide;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'rounded-full border px-2.5 py-1 text-left font-code text-[10px] font-bold uppercase tracking-wider transition-colors',
        selected
          ? PATH_FAMILY_META[guide.family].accent
          : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/25 hover:text-foreground'
      )}
    >
      {guide.want}
    </button>
  );
}

function PathPhoto({ guide }: { guide: PathGuide }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
      {guide.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guide.image.src}
          alt={guide.image.alt}
          className="aspect-[16/10] w-full object-cover object-top"
        />
      ) : (
        <div className="p-3">
          <ManualPathScreen kind={guide.screen} />
        </div>
      )}
      <figcaption className="border-t border-white/10 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        {guide.photoCaption}
      </figcaption>
    </figure>
  );
}

function StepRail({
  lane,
  onStart,
}: {
  lane: ManualPathLane;
  onStart: (laneId: string, stepId?: string) => void;
}) {
  return (
    <ol className="space-y-0">
      {lane.steps.map((step, index) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex w-6 shrink-0 flex-col items-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/15 font-code text-[10px] font-bold text-cyan-100">
              {index + 1}
            </span>
            {index < lane.steps.length - 1 ? (
              <span className="w-px flex-1 bg-cyan-300/25" aria-hidden />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onStart(lane.id, step.id)}
            className={cn(
              '-mt-0.5 mb-2 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left hover:border-cyan-300/35 hover:bg-cyan-400/[0.06]',
              index === lane.steps.length - 1 && 'mb-0'
            )}
          >
            <span className="block text-[12px] font-semibold text-foreground">{step.title}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{step.body}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ManualPathDeck({ onLeave }: { onLeave: () => void }) {
  const [laneId, setLaneId] = useState(MANUAL_PATH_GUIDES[0]?.laneId || 'write-lyrics');
  const detailRef = useRef<HTMLElement>(null);

  const select = useCallback((nextId: string) => {
    setLaneId(nextId);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const start = useCallback(
    (nextLaneId: string, stepId?: string) => {
      onLeave();
      startManualPath(nextLaneId, stepId);
    },
    [onLeave]
  );

  const guide = getPathGuide(laneId) || MANUAL_PATH_GUIDES[0];
  const lane = guide ? guideLane(guide.laneId) : undefined;

  const families = useMemo(
    () =>
      PATH_GUIDE_FAMILIES.map((family) => ({
        family,
        meta: PATH_FAMILY_META[family],
        guides: MANUAL_PATH_GUIDES.filter((item) => item.family === family),
      })).filter((row) => row.guides.length > 0),
    []
  );

  if (!guide || !lane) return null;

  return (
    <div id="manual-paths" className="space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="font-headline text-xl font-bold uppercase tracking-wide">Paths</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick one job. You get that screen, where it lives, and the real steps. Start — or tap a
            step — and a coach stays until that path is done.
          </p>
        </div>
        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-3 sm:grid-cols-3">
          <div className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-2.5">
            <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-sky-200">Write</p>
            <p className="mt-1 text-[11px] leading-snug text-foreground/90">The Vault → a sheet. Lyrics only.</p>
          </div>
          <div className="rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10 p-2.5">
            <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">Press live</p>
            <p className="mt-1 text-[11px] leading-snug text-foreground/90">Scene → New release. Audio + price.</p>
          </div>
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2.5">
            <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-200">DNA Drop</p>
            <p className="mt-1 text-[11px] leading-snug text-foreground/90">Sheet → Pro lyric link. Not a sale.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {families.map((row) => (
          <div key={row.family} className="space-y-1.5">
            <p className="flex items-baseline gap-2 font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              <span>{row.meta.label}</span>
              <span className="font-normal tracking-normal text-[10px] normal-case opacity-70">{row.meta.hint}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {row.guides.map((item) => (
                <JobChip
                  key={item.laneId}
                  guide={item}
                  selected={item.laneId === guide.laneId}
                  onSelect={() => select(item.laneId)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <section
        ref={detailRef}
        className="scroll-mt-4 overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/[0.07] via-card to-fuchsia-500/[0.05]"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-200/80">
              {PATH_FAMILY_META[guide.family].label}
            </p>
            <h3 className="mt-1 font-headline text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              {guide.want}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-sm border px-1.5 py-0.5 font-code text-[8px] font-bold uppercase tracking-[0.16em]',
                tierClass(lane.tier)
              )}
            >
              {tierLabel(lane.tier)}
            </span>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 font-code text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
              onClick={() => start(lane.id)}
            >
              <Play className="h-3 w-3 fill-current" />
              Start
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] sm:p-5">
          <PathPhoto guide={guide} />
          <div className="min-w-0 space-y-3">
            <div>
              <p className="font-code text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">What</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{guide.what}</p>
            </div>
            <div>
              <p className="font-code text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Where</p>
              <div className="mt-1.5">
                <WhereTrail where={guide.where} />
              </div>
            </div>
            <div>
              <p className="mb-2 font-code text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                How · tap a step
              </p>
              <StepRail lane={lane} onStart={start} />
            </div>
            {guide.related.length > 0 ? (
              <div className="border-t border-white/10 pt-3">
                <p className="mb-1.5 font-code text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Different job
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {guide.related.map((item) => {
                    const other = getPathGuide(item.laneId);
                    if (!other) return null;
                    return (
                      <button
                        key={item.laneId}
                        type="button"
                        onClick={() => select(item.laneId)}
                        className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-left hover:border-white/25"
                      >
                        <span className="block font-code text-[10px] font-bold uppercase tracking-wide text-foreground">
                          {other.want}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">{item.why}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
