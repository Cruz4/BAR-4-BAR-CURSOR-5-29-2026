'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { pickSceneNeonEntry, type SceneNeonEntry } from '@/lib/scene/scene-neon-lexicon';

/**
 * The Scene Block — a night skyline that is actually driven by what's
 * happening around the viewer, not a canned ambient loop.
 *
 * Unlike a purely decorative background, the number of lit windows tracks
 * real activity (friends + wall posts + Discover cards + pending requests),
 * and every time a new post/drop lands, a small burst of notes rises from a
 * lit window. The block gets busier as your circle does.
 */

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Building = {
  left: number; // %
  width: number; // %
  height: number; // px
  cols: number;
  rows: number;
};

type SkylineWindow = {
  id: number;
  buildingIndex: number;
  leftPct: number; // within building, 0-100
  topPct: number; // within building, 0 (roof) - 100 (ground)
  hue: 'amber' | 'cyan' | 'magenta';
  delay: number;
  duration: number;
};

const SKYLINE_HEIGHT_PX = 232;

const BACK_BUILDINGS: Building[] = [
  { left: 1, width: 8, height: 96, cols: 0, rows: 0 },
  { left: 12, width: 6, height: 138, cols: 0, rows: 0 },
  { left: 21, width: 9, height: 74, cols: 0, rows: 0 },
  { left: 33, width: 7, height: 158, cols: 0, rows: 0 },
  { left: 43, width: 10, height: 104, cols: 0, rows: 0 },
  { left: 56, width: 6, height: 128, cols: 0, rows: 0 },
  { left: 65, width: 8, height: 82, cols: 0, rows: 0 },
  { left: 76, width: 9, height: 146, cols: 0, rows: 0 },
  { left: 88, width: 8, height: 92, cols: 0, rows: 0 },
];

const FRONT_BUILDINGS: Building[] = [
  { left: -2, width: 16, height: 150, cols: 2, rows: 3 },
  { left: 16, width: 11, height: 118, cols: 2, rows: 3 },
  { left: 29, width: 17, height: 188, cols: 3, rows: 3 },
  { left: 48, width: 13, height: 138, cols: 2, rows: 3 },
  { left: 63, width: 19, height: 208, cols: 3, rows: 3 },
  { left: 84, width: 16, height: 164, cols: 2, rows: 3 },
];

const { windows: SKYLINE_WINDOWS, litOrder: WINDOW_LIGHT_ORDER } = (() => {
  const rand = mulberry32(88301);
  const windows: SkylineWindow[] = [];
  let id = 0;
  FRONT_BUILDINGS.forEach((building, buildingIndex) => {
    for (let r = 0; r < building.rows; r++) {
      for (let c = 0; c < building.cols; c++) {
        const hueRoll = rand();
        windows.push({
          id: id++,
          buildingIndex,
          leftPct: ((c + 0.5) / building.cols) * 100,
          topPct: ((r + 0.55) / building.rows) * 100,
          hue: hueRoll > 0.93 ? 'magenta' : hueRoll > 0.83 ? 'cyan' : 'amber',
          delay: rand() * 8,
          duration: 3 + rand() * 4,
        });
      }
    }
  });
  const order = windows.map((w) => w.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { windows, litOrder: order };
})();

const TOTAL_WINDOWS = SKYLINE_WINDOWS.length;
const STARS = (() => {
  const rand = mulberry32(4171);
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: rand() * 100,
    top: rand() * 62,
    delay: rand() * 6,
    duration: 3 + rand() * 3,
    size: rand() > 0.8 ? 2 : 1,
  }));
})();

function windowAbsoluteLeft(win: SkylineWindow): number {
  const building = FRONT_BUILDINGS[win.buildingIndex];
  return building.left + (win.leftPct / 100) * building.width;
}

function windowAbsoluteBottom(win: SkylineWindow): number {
  const building = FRONT_BUILDINGS[win.buildingIndex];
  return Math.max(8, building.height * (1 - win.topPct / 100));
}

type NoteBurst = {
  id: number;
  leftPct: number;
  bottomPx: number;
  glyph: string;
};

const NOTE_GLYPHS = ['♪', '♫', '♬'];

export function SceneBlockAtmosphere({
  className,
  energy = 0,
  pulseKey = 0,
}: {
  className?: string;
  /** Raw activity score — friends + wall posts + Discover cards + 2× pending requests. */
  energy?: number;
  /** Bump this (e.g. to posts.length) to trigger a note burst when something new lands. */
  pulseKey?: number;
}) {
  const litCount = Math.min(TOTAL_WINDOWS, Math.max(4, Math.round(4 + energy * 2)));
  const litIds = useMemo(() => new Set(WINDOW_LIGHT_ORDER.slice(0, litCount)), [litCount]);
  const litWindows = useMemo(
    () => SKYLINE_WINDOWS.filter((w) => litIds.has(w.id)),
    [litIds]
  );

  const [bursts, setBursts] = useState<NoteBurst[]>([]);
  const [neon, setNeon] = useState<SceneNeonEntry | null>(null);
  const prevPulseRef = useRef<number>(-1);
  const burstIdRef = useRef(0);

  useEffect(() => {
    setNeon(pickSceneNeonEntry());
  }, []);

  useEffect(() => {
    if (pulseKey <= prevPulseRef.current) {
      prevPulseRef.current = pulseKey;
      return;
    }
    const baseline = Math.max(prevPulseRef.current, 0);
    const delta = Math.min(5, Math.max(1, pulseKey - baseline));
    prevPulseRef.current = pulseKey;
    if (litWindows.length === 0) return;

    const spawned: NoteBurst[] = Array.from({ length: delta }, () => {
      const win = litWindows[Math.floor(Math.random() * litWindows.length)];
      return {
        id: burstIdRef.current++,
        leftPct: windowAbsoluteLeft(win) + (Math.random() - 0.5) * 3,
        bottomPx: windowAbsoluteBottom(win),
        glyph: NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)],
      };
    });
    setBursts((prev) => [...prev, ...spawned]);
    const timer = window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => !spawned.some((s) => s.id === b.id)));
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [pulseKey, litWindows]);

  return (
    <div
      className={cn('scene-block pointer-events-none fixed inset-0 z-[1] overflow-hidden', className)}
      aria-hidden
    >
      <div className="scene-block-sky absolute inset-0" />

      {STARS.map((star) => (
        <div
          key={star.id}
          className="scene-block-star absolute rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}

      <div className="scene-block-headlight absolute inset-y-0 -left-1/3 w-1/3" />

      <div className="scene-block-horizon absolute inset-x-0 bottom-0 h-[55vh]" />

      {neon && (
        <div
          className="scene-block-neon absolute right-[4%] top-[4.5rem] hidden max-w-[11rem] text-right sm:block"
          aria-hidden
        >
          <span className="scene-block-neon-text font-headline text-sm font-bold uppercase italic tracking-[0.28em]">
            {neon.word}
          </span>
          <p className="scene-block-neon-pron mt-0.5 font-code text-[8px] font-medium normal-case tracking-wide">
            /{neon.pron}/
          </p>
          <p className="scene-block-neon-gloss mt-1 font-code text-[9px] font-medium leading-snug tracking-wide">
            {neon.gloss}
          </p>
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: SKYLINE_HEIGHT_PX }}
      >
        {BACK_BUILDINGS.map((b, i) => (
          <div
            key={`back-${i}`}
            className="scene-block-building-back absolute bottom-0"
            style={{ left: `${b.left}%`, width: `${b.width}%`, height: b.height }}
          />
        ))}

        {FRONT_BUILDINGS.map((b, i) => (
          <div
            key={`front-${i}`}
            className="scene-block-building-front absolute bottom-0"
            style={{ left: `${b.left}%`, width: `${b.width}%`, height: b.height }}
          />
        ))}

        {SKYLINE_WINDOWS.map((win) => {
          const lit = litIds.has(win.id);
          return (
            <div
              key={win.id}
              className={cn(
                'scene-block-window absolute',
                lit ? `is-lit hue-${win.hue}` : 'is-dim'
              )}
              style={{
                left: `${windowAbsoluteLeft(win)}%`,
                bottom: windowAbsoluteBottom(win),
                animationDelay: lit ? `${win.delay}s` : undefined,
                animationDuration: lit ? `${win.duration}s` : undefined,
              }}
            />
          );
        })}

        {bursts.map((burst) => (
          <span
            key={burst.id}
            className="scene-block-note absolute select-none"
            style={{ left: `${burst.leftPct}%`, bottom: burst.bottomPx }}
          >
            {burst.glyph}
          </span>
        ))}
      </div>
    </div>
  );
}
