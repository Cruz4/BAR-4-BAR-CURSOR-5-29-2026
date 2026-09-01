'use client';

/**
 * Paths as an intent tree: what you want → that path → more / less / other route.
 * Steps stay the real length of each path. No padded grid.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { startManualPath, type ManualPathLane } from '@/lib/manual-paths';
import {
  MANUAL_PATH_TREE,
  PATH_BRANCH_LABEL,
  treeLane,
  type PathBranchKind,
  type PathTreeIntent,
  type PathTreeLink,
} from '@/lib/manual-path-tree';

function tierLabel(tier: ManualPathLane['tier']): string {
  if (tier === 'pro') return 'Pro';
  if (tier === 'ink') return 'Ink';
  return 'Free';
}

function tierClass(tier: ManualPathLane['tier']): string {
  if (tier === 'pro') return 'border-fuchsia-300/35 text-fuchsia-200 bg-fuchsia-400/10';
  if (tier === 'ink') return 'border-amber-200/35 text-amber-100 bg-amber-300/10';
  return 'border-cyan-300/35 text-cyan-200 bg-cyan-400/10';
}

function branchClass(kind: PathBranchKind): string {
  if (kind === 'more') return 'text-cyan-200/90 border-cyan-300/30';
  if (kind === 'less') return 'text-white/55 border-white/15';
  return 'text-fuchsia-200/90 border-fuchsia-300/30';
}

function Elbow({ last }: { last: boolean }) {
  return (
    <span className="relative w-3.5 shrink-0 self-stretch" aria-hidden>
      <span className="absolute left-[7px] top-0 h-[14px] w-px bg-white/20" />
      <span className="absolute left-[7px] top-[14px] h-px w-[7px] bg-white/20" />
      {last ? null : <span className="absolute bottom-0 left-[7px] top-[14px] w-px bg-white/20" />}
    </span>
  );
}

function StepsList({
  lane,
  onStart,
}: {
  lane: ManualPathLane;
  onStart: (laneId: string, stepId?: string) => void;
}) {
  return (
    <ol className="mt-1.5 space-y-0.5 border-t border-white/[0.06] pt-1.5">
      {lane.steps.map((step, index) => (
        <li key={step.id}>
          <button
            type="button"
            className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left hover:bg-white/[0.04]"
            onClick={() => onStart(lane.id, step.id)}
          >
            <span className="w-4 shrink-0 pt-px font-code text-[10px] text-cyan-300/70">{index + 1}</span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-foreground">{step.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{step.body}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function LaneButton({
  lane,
  open,
  onOpen,
  onStart,
}: {
  lane: ManualPathLane;
  open: boolean;
  onOpen: () => void;
  onStart: (laneId: string, stepId?: string) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2',
        open ? 'border-cyan-300/35 bg-white/[0.04]' : 'border-white/10 bg-black/25 hover:border-white/20'
      )}
    >
      <div className="flex items-start gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <span className="flex items-center gap-2">
            <span className="truncate font-headline text-[13px] font-bold uppercase tracking-wide text-foreground">
              {lane.title}
            </span>
            <span
              className={cn(
                'shrink-0 rounded-sm border px-1 py-px font-code text-[8px] font-bold uppercase tracking-[0.16em]',
                tierClass(lane.tier)
              )}
            >
              {tierLabel(lane.tier)}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{lane.blurb}</span>
        </button>
        <button
          type="button"
          className="h-7 shrink-0 rounded-md bg-primary px-2.5 font-code text-[9px] font-bold uppercase tracking-widest text-primary-foreground"
          onClick={() => onStart(lane.id)}
        >
          Start
        </button>
      </div>
      {open ? <StepsList lane={lane} onStart={onStart} /> : null}
    </div>
  );
}

function LinkRow({
  link,
  last,
  open,
  onOpen,
  onStart,
}: {
  link: PathTreeLink;
  last: boolean;
  open: boolean;
  onOpen: () => void;
  onStart: (laneId: string, stepId?: string) => void;
}) {
  const lane = link.laneId ? treeLane(link.laneId) : undefined;

  return (
    <div className="flex">
      <Elbow last={last} />
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <span
            className={cn(
              'rounded-sm border px-1 py-px font-code text-[8px] font-bold uppercase tracking-[0.16em]',
              branchClass(link.kind)
            )}
          >
            {PATH_BRANCH_LABEL[link.kind]}
          </span>
          {lane ? <span className="text-[11px] text-muted-foreground">{link.why}</span> : null}
        </div>
        {lane ? (
          <LaneButton lane={lane} open={open} onOpen={onOpen} onStart={onStart} />
        ) : (
          <p className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            {link.why}
          </p>
        )}
      </div>
    </div>
  );
}

function IntentBranch({
  intent,
  selectedId,
  onSelect,
  onStart,
}: {
  intent: PathTreeIntent;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStart: (laneId: string, stepId?: string) => void;
}) {
  const lane = treeLane(intent.laneId);
  if (!lane) return null;
  const rootId = `intent:${intent.id}`;
  const openRoot = selectedId === rootId;

  return (
    <section className="space-y-2">
      <h3 className="font-code text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">
        I want to {intent.want.toLowerCase()}
      </h3>
      <div className="relative pl-0">
        <LaneButton
          lane={lane}
          open={openRoot}
          onOpen={() => onSelect(openRoot ? '' : rootId)}
          onStart={onStart}
        />
        <div className="mt-1">
          {intent.links.map((link, index) => {
            const id = `${intent.id}:${link.laneId || index}`;
            return (
              <LinkRow
                key={id}
                link={link}
                last={index === intent.links.length - 1}
                open={selectedId === id}
                onOpen={() => onSelect(selectedId === id ? '' : id)}
                onStart={onStart}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ManualPathDeck({ onLeave }: { onLeave: () => void }) {
  const [selectedId, setSelectedId] = useState<string>(`intent:${MANUAL_PATH_TREE[0]?.id || ''}`);

  const start = useCallback(
    (laneId: string, stepId?: string) => {
      onLeave();
      startManualPath(laneId, stepId);
    },
    [onLeave]
  );

  const legend = useMemo(
    () => [
      { kind: 'more' as const, text: 'go further from here' },
      { kind: 'less' as const, text: 'stop / skip the extra' },
      { kind: 'else' as const, text: 'a different thing — do not mix them' },
    ],
    []
  );

  return (
    <div id="manual-paths" className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-headline text-xl font-bold uppercase tracking-wide">Paths</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Start from what you want. Branches are more, less, or another route. Open a name to see its
          real steps. Start — or tap a step — and a coach stays until that path is done.
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((item) => (
            <li key={item.kind} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className={cn(
                  'rounded-sm border px-1 py-px font-code text-[8px] font-bold uppercase tracking-[0.16em]',
                  branchClass(item.kind)
                )}
              >
                {PATH_BRANCH_LABEL[item.kind]}
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-6">
        {MANUAL_PATH_TREE.map((intent) => (
          <IntentBranch
            key={intent.id}
            intent={intent}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onStart={start}
          />
        ))}
      </div>
    </div>
  );
}
