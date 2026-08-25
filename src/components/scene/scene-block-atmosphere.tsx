'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  pinSceneNeonEntry,
  resolveSceneNeonEntry,
  unpinSceneNeonEntry,
  pickSceneNeonEntry,
  type SceneNeonEntry,
} from '@/lib/scene/scene-neon-lexicon';
import { useSceneSky } from '@/hooks/use-scene-sky';
import { useAppChromeBottom } from '@/hooks/use-app-chrome-bottom';
import {
  cloudIntensity,
  precipKind,
  showsStars,
  showsSun,
  type SceneWeather,
} from '@/lib/scene/scene-sky';
import {
  activeEclipse,
  activeMeteorShower,
  meteorSkyOpen,
  moonGlow,
  moonPhaseAt,
  moonScreenPosition,
  moonShouldShow,
  shootingStarIntervalMs,
  sunScreenPosition,
  type MeteorShower,
  type MoonPhase,
} from '@/lib/scene/scene-celestial';
import { SCENE_HOUSE_CITY } from '@/lib/scene/scene-sky';

/** Sun/moon arc refresh while Scene is open — real sky drift is slow. */
const CELESTIAL_TICK_MS = 5 * 60 * 1000;

/**
 * The Scene Block — skyline driven by live weather near the viewer + day/night,
 * with lit windows tracking social activity around the viewer.
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
  left: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
};

type SkylineWindow = {
  id: number;
  buildingIndex: number;
  leftPct: number;
  topPct: number;
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

const CLOUDS = (() => {
  const rand = mulberry32(90210);
  return Array.from({ length: 7 }, (_, i) => ({
    id: i,
    left: rand() * 90,
    top: 8 + rand() * 38,
    width: 18 + rand() * 28,
    height: 6 + rand() * 10,
    delay: rand() * 12,
    duration: 40 + rand() * 50,
  }));
})();

const PRECIP = (() => {
  const rand = mulberry32(31415);
  return Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: rand() * 100,
    delay: rand() * 4,
    duration: 0.6 + rand() * 1.4,
    size: 1 + rand() * 2,
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

type MeteorStreak = {
  id: number;
  left: number;
  top: number;
  angle: number;
  len: number;
  travel: string;
};

function SceneMoonDisc({
  moon,
  eclipsed,
  glow,
  style,
}: {
  moon: MoonPhase;
  eclipsed: boolean;
  glow: number;
  style?: React.CSSProperties;
}) {
  const maskId = React.useId().replace(/:/g, '');
  const r = 22;
  const cx = 28;
  const cy = 28;
  // Two-circle terminator: 0 = new (shadow centered), 1 = full (shadow fully off-disc).
  const offset = 2 * r * moon.illumination;
  const shadeCx = moon.waxing ? cx - offset : cx + offset;
  const phaseLabel = eclipsed ? `${moon.label} · lunar eclipse` : moon.label;
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <div
      className="scene-block-moon-anchor pointer-events-auto absolute"
      style={style}
      onMouseEnter={() => setHintOpen(true)}
      onMouseLeave={() => setHintOpen(false)}
      onFocus={() => setHintOpen(true)}
      onBlur={() => setHintOpen(false)}
    >
      <button
        type="button"
        className={cn(
          'scene-block-moon relative block h-14 w-14 cursor-default border-0 bg-transparent p-0',
          eclipsed && 'is-lunar-eclipse'
        )}
        style={{ opacity: Math.min(1, 0.55 + glow * 0.5) }}
        aria-label={phaseLabel}
        onClick={() => setHintOpen((open) => !open)}
      >
        <svg viewBox="0 0 56 56" className="h-full w-full" aria-hidden>
          <defs>
            <mask id={maskId}>
              <rect width="56" height="56" fill="black" />
              <circle cx={cx} cy={cy} r={r} fill="white" />
              <circle cx={shadeCx} cy={cy} r={r} fill="black" />
            </mask>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill={eclipsed ? '#3a140e' : '#1a2238'} />
          <circle cx={cx} cy={cy} r={r} fill={eclipsed ? '#c45c32' : '#f4edd4'} mask={`url(#${maskId})`} />
        </svg>
      </button>
      {hintOpen ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-[40] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 font-sans text-[11px] font-medium leading-tight tracking-normal text-white/85 bg-black/55"
        >
          {phaseLabel}
        </span>
      ) : null}
    </div>
  );
}

function SceneMeteors({
  enabled,
  shower,
}: {
  enabled: boolean;
  shower: MeteorShower | null;
}) {
  const [streaks, setStreaks] = useState<MeteorStreak[]>([]);
  const idRef = useRef(0);
  const showerKey = shower ? `${shower.name}:${Math.round(shower.zhr * shower.intensity)}` : '';
  const showerRef = useRef(shower);
  showerRef.current = shower;

  useEffect(() => {
    if (!enabled) {
      setStreaks([]);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let loopTimer = 0;
    const clearTimers: number[] = [];
    const spawn = () => {
      if (cancelled) return;
      const active = showerRef.current;
      const count = active ? 1 + Math.floor(Math.random() * (active.intensity > 0.7 ? 3 : 2)) : 1;
      const next: MeteorStreak[] = Array.from({ length: count }, () => ({
        id: idRef.current++,
        left: 8 + Math.random() * 78,
        top: 4 + Math.random() * 38,
        angle: active ? 28 + Math.random() * 18 : 18 + Math.random() * 50,
        len: 48 + Math.random() * 56,
        travel: `${110 + Math.random() * 80}px`,
      }));
      setStreaks((prev) => [...prev, ...next]);
      clearTimers.push(
        window.setTimeout(() => {
          if (!cancelled) setStreaks((prev) => prev.filter((s) => !next.some((n) => n.id === s.id)));
        }, 800)
      );
      loopTimer = window.setTimeout(spawn, shootingStarIntervalMs(active) * (0.7 + Math.random() * 0.6));
    };
    loopTimer = window.setTimeout(spawn, 2400 + Math.random() * 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(loopTimer);
      clearTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [enabled, showerKey]);

  if (!enabled && streaks.length === 0) return null;

  return (
    <>
      {streaks.map((streak) => (
        <span
          key={streak.id}
          className="scene-block-meteor"
          style={{
            left: `${streak.left}%`,
            top: `${streak.top}%`,
            ['--meteor-angle' as string]: `${streak.angle}deg`,
            ['--meteor-len' as string]: `${streak.len}px`,
            ['--meteor-travel' as string]: streak.travel,
          }}
        />
      ))}
    </>
  );
}

function precipClass(weather: SceneWeather): string {
  const kind = precipKind(weather);
  if (kind === 'none') return '';
  return `is-${kind.replace(/_/g, '-')}`;
}

export function SceneBlockAtmosphere({
  className,
  energy = 0,
  pulseKey = 0,
}: {
  className?: string;
  energy?: number;
  pulseKey?: number;
}) {
  const { phase, weather, windy, hasWeather, lat, lon } = useSceneSky();
  const appChromeBottom = useAppChromeBottom(16);
  const [skyNow, setSkyNow] = useState(() => new Date());
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const moon = moonPhaseAt(skyNow);
  const shower = activeMeteorShower(skyNow);
  const eclipse = activeEclipse(skyNow, lat, lon, phase);
  const sceneLat = lat ?? SCENE_HOUSE_CITY.lat;
  const sceneLon = lon ?? SCENE_HOUSE_CITY.lon;
  const sunPos = useMemo(
    () => sunScreenPosition(skyNow, sceneLat, sceneLon),
    [skyNow, sceneLat, sceneLon]
  );
  const moonPos = useMemo(
    () => moonScreenPosition(skyNow, sceneLat, sceneLon),
    [skyNow, sceneLat, sceneLon]
  );
  const moonVisible = moonShouldShow(phase, weather, moon, {
    now: skyNow,
    lat: sceneLat,
    lon: sceneLon,
  });
  const glow = moonGlow(moon, weather);
  const meteorsOn = meteorSkyOpen(phase, weather);
  const litCount = Math.min(TOTAL_WINDOWS, Math.max(4, Math.round(4 + energy * 2)));
  const litIds = useMemo(() => new Set(WINDOW_LIGHT_ORDER.slice(0, litCount)), [litCount]);
  const litWindows = useMemo(
    () => SKYLINE_WINDOWS.filter((w) => litIds.has(w.id)),
    [litIds]
  );

  const [bursts, setBursts] = useState<NoteBurst[]>([]);
  const [neon, setNeon] = useState<SceneNeonEntry | null>(null);
  const [neonPinned, setNeonPinned] = useState(false);
  const prevPulseRef = useRef<number>(-1);
  const burstIdRef = useRef(0);

  const clouds = cloudIntensity(weather);
  const precip = precipKind(weather);
  const starVisible = showsStars(phase);
  const sunVisible = showsSun(phase, weather) && sunPos.aboveHorizon;
  const showLightning = weather === 'thunderstorm' || weather === 'hail';

  useEffect(() => {
    const timer = window.setInterval(() => setSkyNow(new Date()), CELESTIAL_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const celestialStyle = (pos: { leftPct: number; topPct: number }) =>
    ({
      left: `${pos.leftPct}%`,
      top: `${pos.topPct}%`,
    }) as const;

  const moonStyle = useMemo(() => {
    const moonHalf = phase === 'dusk' ? 24 : 28;
    const rawTopPx = (moonPos.topPct / 100) * viewportH;
    const minTopPx = appChromeBottom + moonHalf;
    return {
      left: `${moonPos.leftPct}%`,
      top: `${Math.max(rawTopPx, minTopPx)}px`,
    };
  }, [moonPos, appChromeBottom, phase, viewportH]);

  useEffect(() => {
    const { entry, pinned } = resolveSceneNeonEntry();
    setNeon(entry);
    setNeonPinned(pinned);
  }, []);

  const toggleNeonPin = () => {
    if (!neon) return;
    if (neonPinned) {
      unpinSceneNeonEntry();
      setNeonPinned(false);
      // Free the word — roll a new one now so unlock is visible.
      setNeon(pickSceneNeonEntry());
      return;
    }
    pinSceneNeonEntry(neon);
    setNeonPinned(true);
  };

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
    <>
    <div
      className={cn(
        'scene-block pointer-events-none fixed inset-0 z-[1] overflow-hidden',
        windy && 'is-windy',
        className
      )}
      data-phase={phase}
      data-weather={weather}
      data-has-weather={hasWeather ? '1' : '0'}
    >
      <div className="scene-block-sky absolute inset-0" aria-hidden />

      {sunVisible && (
        <div
          className={cn(
            'scene-block-sun absolute',
            eclipse?.kind === 'solar' && 'is-eclipsed',
            eclipse?.kind === 'solar' && eclipse.shade === 'annular' && 'is-annular'
          )}
          style={celestialStyle(sunPos)}
        >
          {eclipse?.kind === 'solar' ? <div className="scene-block-sun-bite" /> : null}
        </div>
      )}

      {starVisible &&
        STARS.map((star) => (
          <div
            key={star.id}
            className={cn('scene-block-star absolute rounded-full', phase === 'dusk' && 'is-dusk')}
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

      {moonVisible ? (
        <SceneMoonDisc
          moon={moon}
          eclipsed={eclipse?.kind === 'lunar'}
          glow={glow}
          style={moonStyle}
        />
      ) : null}

      <SceneMeteors enabled={meteorsOn} shower={shower} />

      {clouds > 0 && (
        <div
          className="scene-block-clouds absolute inset-0"
          style={{ opacity: clouds }}
        >
          {CLOUDS.map((cloud) => (
            <div
              key={cloud.id}
              className="scene-block-cloud absolute rounded-full"
              style={{
                left: `${cloud.left}%`,
                top: `${cloud.top}%`,
                width: `${cloud.width}%`,
                height: `${cloud.height}%`,
                animationDelay: `${cloud.delay}s`,
                animationDuration: `${cloud.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {weather === 'fog' && <div className="scene-block-fog absolute inset-0" />}

      {precip !== 'none' && (
        <div className={cn('scene-block-precip absolute inset-0', precipClass(weather))}>
          {PRECIP.map((drop) => (
            <span
              key={drop.id}
              className="scene-block-precip-particle absolute"
              style={{
                left: `${drop.left}%`,
                animationDelay: `${drop.delay}s`,
                animationDuration: `${drop.duration}s`,
                width: drop.size,
                height: precip === 'snow' || precip === 'heavy_snow' || precip === 'hail' ? drop.size : drop.size * 6,
              }}
            />
          ))}
        </div>
      )}

      {showLightning && <div className="scene-block-lightning absolute inset-0" />}

      <div className="scene-block-headlight absolute inset-y-0 -left-1/3 w-1/3" />

      <div className="scene-block-horizon absolute inset-x-0 bottom-0 h-[55vh]" />

      <div className="absolute inset-x-0 bottom-0" style={{ height: SKYLINE_HEIGHT_PX }}>
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

    {/* Above feed chrome so the pin is clickable; desktop-only (sm+) on purpose. */}
    {neon && (
      <div
        className="scene-block-neon pointer-events-none fixed right-[3%] z-[40] hidden max-w-[16rem] text-right sm:block sm:max-w-[18rem]"
        data-phase={phase}
        style={{ top: appChromeBottom }}
      >
        <div className="inline-flex items-baseline justify-end gap-1.5">
          <button
            type="button"
            onClick={toggleNeonPin}
            className={cn(
              'pointer-events-auto -translate-y-px inline-flex shrink-0 items-center justify-center p-0.5 transition-opacity',
              neonPinned
                ? 'text-amber-300/85 opacity-90 hover:opacity-100'
                : 'text-white/30 opacity-65 hover:opacity-100 hover:text-white/50'
            )}
            title={
              neonPinned
                ? 'Unlock now — or it frees itself after 24 hours'
                : 'Lock this word for up to 24 hours'
            }
            aria-label={neonPinned ? `Unlock ${neon.word}` : `Lock ${neon.word} for 24 hours`}
            aria-pressed={neonPinned}
          >
            {neonPinned ? (
              <LockOpen className="h-2.5 w-2.5" strokeWidth={1.6} aria-hidden />
            ) : (
              <Lock className="h-2.5 w-2.5" strokeWidth={1.6} aria-hidden />
            )}
          </button>
          <span className="scene-block-neon-text font-headline text-base font-bold uppercase tracking-[0.12em] sm:text-lg">
            {neon.word}
          </span>
        </div>
        <p className="scene-block-neon-pron mt-1 font-sans text-xs font-medium normal-case tracking-wide sm:text-[13px]">
          /{neon.pron}/
        </p>
        <p className="scene-block-neon-gloss mt-1.5 max-w-[18rem] font-code text-[12px] font-medium leading-relaxed tracking-wide sm:max-w-[22rem] sm:text-[13px]">
          {neon.gloss}
        </p>
      </div>
    )}
    </>
  );
}
