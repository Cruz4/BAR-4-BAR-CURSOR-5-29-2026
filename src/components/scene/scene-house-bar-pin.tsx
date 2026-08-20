'use client';

/**
 * House bar of the day — compact Scene pin with live reply preview + new bubbles.
 * Close docks it to the start of Discover; restore brings it back to the top.
 * Mic likes are the public score; new-reply badge clears when the pin is on screen.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronUp, Radio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SceneHouseBarDialog } from '@/components/scene/scene-house-bar-dialog';
import { useHouseBarPin } from '@/hooks/use-house-bar-pin';
import { useHouseBarThread } from '@/hooks/use-house-bar-thread';
import { useSceneLive } from '@/hooks/use-scene-live';
import {
  ensureHouseBarSeenBaseline,
  getHouseBarNewCount,
  markHouseBarSeen,
} from '@/lib/scene/house-bar-pin';
import { useToast } from '@/hooks/use-toast';
import { SCENE_TOP_ID } from '@/lib/scene-home';
import { profileHref } from '@/lib/profile/profile-slug';
import { HouseBarMicLike } from '@/components/scene/house-bar-mic-like';
import type { LockEcho } from '@/lib/lock/types';

function sortByMicScore(echoes: LockEcho[]): LockEcho[] {
  return [...echoes].sort((a, b) => {
    const likes = (b.likeCount ?? 0) - (a.likeCount ?? 0);
    if (likes !== 0) return likes;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

function HouseNewBubble({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-400 px-1.5 text-[10px] font-bold tabular-nums text-black shadow-[0_0_14px_rgba(232,121,249,0.65)]"
      aria-label={`${count} new house bar ${count === 1 ? 'reply' : 'replies'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function SceneHouseBarPin({
  variant = 'hero',
}: {
  variant?: 'hero' | 'dock';
}) {
  const { live, loaded, houseBarOn } = useSceneLive();
  const seed = live.houseBar.seedBar;
  const title = live.houseBar.title || 'House bar of the day';
  const { placement, dock, restore } = useHouseBarPin(seed, houseBarOn);
  const { toast } = useToast();
  const { lock, echoes, echoCount, loading } = useHouseBarThread(houseBarOn);
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const visible =
    loaded &&
    houseBarOn &&
    ((variant === 'hero' && placement === 'hero') || (variant === 'dock' && placement === 'dock'));

  useEffect(() => {
    if (!visible || !seed) return;
    ensureHouseBarSeenBaseline(seed, echoCount);
    setNewCount(open ? 0 : getHouseBarNewCount(seed, echoCount));
  }, [visible, seed, echoCount, open]);

  // Clear "new" once the pin itself is on screen — no need to open Write next.
  useEffect(() => {
    if (!visible || !seed || newCount <= 0 || open) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.2);
        if (!hit) return;
        markHouseBarSeen(seed, echoCount);
        setNewCount(0);
      },
      { threshold: [0.2, 0.45] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, seed, echoCount, newCount, open]);

  const onDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && seed) {
      markHouseBarSeen(seed, echoCount);
      setNewCount(0);
    }
  };

  const ranked = useMemo(() => sortByMicScore(echoes), [echoes]);
  const preview = ranked.slice(0, 3);

  if (!visible) return null;

  const displaySeed = lock?.seedBar || seed;

  return (
    <div ref={rootRef} className="relative">
      {newCount > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 -top-3 z-20 flex justify-center">
          <div className="pointer-events-none inline-flex items-center gap-2 rounded-full border border-fuchsia-400/50 bg-fuchsia-500/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_8px_24px_rgba(232,121,249,0.35)]">
            <HouseNewBubble count={newCount} />
            <span>{newCount === 1 ? 'New reply' : 'New replies'}</span>
          </div>
        </div>
      ) : null}

      <Card className="relative overflow-hidden border border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-500/10 via-card/90 to-card/70 px-3 py-2 sm:px-3.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-center gap-1.5 text-center font-code text-[8px] font-bold uppercase tracking-[0.22em] text-fuchsia-300 sm:justify-start sm:text-left">
              <Radio className="h-3 w-3 shrink-0" />
              <span className="truncate">{title}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-tight text-foreground/95">
              “{displaySeed}”
            </p>
          </div>
          <Button
            size="sm"
            className="mt-0.5 h-7 shrink-0 px-2.5 text-[11px] font-bold uppercase tracking-wider"
            onClick={() => onDialogOpenChange(true)}
          >
            Write next
          </Button>
          {variant === 'hero' ? (
            <button
              type="button"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Move house bar to Discover"
              title="Pin to Discover"
              onClick={dock}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fuchsia-200 hover:bg-fuchsia-500/20 hover:text-fuchsia-100"
              aria-label="Move Bar of the day back to the top of The Scene"
              title="Move Bar of the day back to the top of The Scene"
              onClick={() => {
                restore();
                toast({
                  title: 'Bar of the day is back at the top',
                  description: 'You’ll find it at the top of The Scene.',
                });
                if (typeof document !== 'undefined') {
                  document.getElementById(SCENE_TOP_ID)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }
              }}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <ul className="mt-1.5 space-y-1 border-t border-fuchsia-500/15 pt-1.5">
          {loading && preview.length === 0 ? (
            <li className="text-[11px] text-muted-foreground">Loading replies…</li>
          ) : preview.length === 0 ? (
            <li className="text-[11px] text-muted-foreground">No replies yet — be first.</li>
          ) : (
            preview.map((echo, index) => {
              const name = echo.authorName?.trim() || 'Guest';
              const href = echo.authorSlug ? profileHref(echo.authorSlug) : undefined;
              const micScore = echo.likeCount ?? 0;
              return (
                <li key={echo.id} className="flex items-center gap-1.5 text-[12px] leading-snug">
                  <span className="w-4 shrink-0 text-center font-code text-[9px] font-bold tabular-nums text-fuchsia-300/80">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-foreground/90">“{echo.text}”</span>
                    <span className="text-muted-foreground">
                      {' '}
                      ·{' '}
                      {href ? (
                        <Link href={href} className="font-semibold text-sky-300 hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-foreground/60">{name}</span>
                      )}
                      <span className="font-semibold text-fuchsia-300/90"> · {micScore} mic</span>
                    </span>
                  </span>
                  <HouseBarMicLike echo={echo} compact />
                </li>
              );
            })
          )}
        </ul>

        <SceneHouseBarDialog
          open={open}
          onOpenChange={onDialogOpenChange}
          seedBar={displaySeed}
          title={title}
        />
      </Card>
    </div>
  );
}
