/**
 * Scene sky extras — moon phase (from the date), major meteor showers,
 * and a small table of real eclipses. No extra network calls.
 */

import * as SunCalc from 'suncalc';
import { cloudIntensity, type SceneSkyPhase, type SceneWeather } from '@/lib/scene/scene-sky';

export type MoonPhaseName =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export type MoonPhase = {
  /** 0 = new, 0.5 = full, 1 = next new. */
  cycle: number;
  /** 0–1 lit fraction. */
  illumination: number;
  waxing: boolean;
  name: MoonPhaseName;
  label: string;
};

export type MeteorShower = {
  name: string;
  zhr: number;
  /** 0–1, 1 at peak day. */
  intensity: number;
};

export type SceneEclipse =
  | { kind: 'lunar'; shade: 'total' | 'partial' | 'penumbral'; label: string }
  | { kind: 'solar'; shade: 'total' | 'annular' | 'partial'; label: string };

type ShowerWindow = {
  name: string;
  /** MM-DD inclusive, UTC calendar. */
  start: string;
  peak: string;
  end: string;
  zhr: number;
};

type LatLonBox = { minLat: number; maxLat: number; minLon: number; maxLon: number };

type EclipseWindow = {
  kind: 'lunar' | 'solar';
  shade: 'total' | 'annular' | 'partial' | 'penumbral';
  label: string;
  startMs: number;
  endMs: number;
  /** Solar path only. Lunar uses local night. */
  boxes?: LatLonBox[];
};

const SHOWERS: ShowerWindow[] = [
  { name: 'Quadrantids', start: '01-01', peak: '01-03', end: '01-05', zhr: 80 },
  { name: 'Lyrids', start: '04-16', peak: '04-22', end: '04-25', zhr: 18 },
  { name: 'Eta Aquariids', start: '04-19', peak: '05-06', end: '05-28', zhr: 40 },
  { name: 'Delta Aquariids', start: '07-12', peak: '07-30', end: '08-23', zhr: 20 },
  { name: 'Perseids', start: '07-17', peak: '08-12', end: '08-24', zhr: 100 },
  { name: 'Orionids', start: '10-02', peak: '10-21', end: '11-07', zhr: 20 },
  { name: 'Leonids', start: '11-06', peak: '11-17', end: '11-30', zhr: 15 },
  { name: 'Geminids', start: '12-04', peak: '12-14', end: '12-17', zhr: 120 },
  { name: 'Ursids', start: '12-17', peak: '12-22', end: '12-26', zhr: 10 },
];

const ECLIPSES: EclipseWindow[] = [
  {
    kind: 'lunar',
    shade: 'total',
    label: 'Total lunar eclipse',
    startMs: Date.UTC(2026, 2, 3, 8, 0, 0),
    endMs: Date.UTC(2026, 2, 3, 15, 30, 0),
  },
  {
    kind: 'solar',
    shade: 'total',
    label: 'Total solar eclipse',
    startMs: Date.UTC(2026, 7, 12, 15, 0, 0),
    endMs: Date.UTC(2026, 7, 12, 21, 30, 0),
    boxes: [
      { minLat: 35, maxLat: 72, minLon: -55, maxLon: 5 },
      { minLat: 60, maxLat: 84, minLon: -75, maxLon: -10 },
    ],
  },
  {
    kind: 'lunar',
    shade: 'partial',
    label: 'Partial lunar eclipse',
    startMs: Date.UTC(2026, 7, 28, 1, 0, 0),
    endMs: Date.UTC(2026, 7, 28, 7, 30, 0),
  },
  {
    kind: 'solar',
    shade: 'annular',
    label: 'Annular solar eclipse',
    startMs: Date.UTC(2027, 1, 6, 13, 0, 0),
    endMs: Date.UTC(2027, 1, 6, 19, 0, 0),
    boxes: [
      { minLat: -45, maxLat: 20, minLon: -80, maxLon: 45 },
    ],
  },
  {
    kind: 'solar',
    shade: 'total',
    label: 'Total solar eclipse',
    startMs: Date.UTC(2027, 7, 2, 7, 0, 0),
    endMs: Date.UTC(2027, 7, 2, 13, 30, 0),
    boxes: [
      { minLat: 12, maxLat: 42, minLon: -10, maxLon: 55 },
    ],
  },
  {
    kind: 'lunar',
    shade: 'total',
    label: 'Total lunar eclipse',
    startMs: Date.UTC(2028, 6, 6, 14, 0, 0),
    endMs: Date.UTC(2028, 6, 6, 21, 0, 0),
  },
  {
    kind: 'solar',
    shade: 'total',
    label: 'Total solar eclipse',
    startMs: Date.UTC(2028, 6, 22, 0, 0, 0),
    endMs: Date.UTC(2028, 6, 22, 6, 30, 0),
    boxes: [
      { minLat: -50, maxLat: -8, minLon: 110, maxLon: 180 },
    ],
  },
];

const PHASE_LABEL: Record<MoonPhaseName, string> = {
  new: 'New moon',
  waxing_crescent: 'Waxing crescent',
  first_quarter: 'First quarter',
  waxing_gibbous: 'Waxing gibbous',
  full: 'Full moon',
  waning_gibbous: 'Waning gibbous',
  last_quarter: 'Last quarter',
  waning_crescent: 'Waning crescent',
};

function mdToDay(md: string): number {
  const [m, d] = md.split('-').map(Number);
  return m * 100 + d;
}

export function moonPhaseAt(now: Date = new Date()): MoonPhase {
  const info = SunCalc.getMoonIllumination(now);
  const cycle = ((info.phase % 1) + 1) % 1;
  const illumination = Math.min(1, Math.max(0, info.fraction));
  const waxing = cycle < 0.5;
  let name: MoonPhaseName = 'new';
  if (cycle < 0.03 || cycle >= 0.97) name = 'new';
  else if (cycle < 0.22) name = 'waxing_crescent';
  else if (cycle < 0.28) name = 'first_quarter';
  else if (cycle < 0.47) name = 'waxing_gibbous';
  else if (cycle < 0.53) name = 'full';
  else if (cycle < 0.72) name = 'waning_gibbous';
  else if (cycle < 0.78) name = 'last_quarter';
  else name = 'waning_crescent';
  return { cycle, illumination, waxing, name, label: PHASE_LABEL[name] };
}

export function activeMeteorShower(now: Date = new Date()): MeteorShower | null {
  const key = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  let best: MeteorShower | null = null;
  for (const shower of SHOWERS) {
    const start = mdToDay(shower.start);
    const peak = mdToDay(shower.peak);
    const end = mdToDay(shower.end);
    const inWindow = start <= end ? key >= start && key <= end : key >= start || key <= end;
    if (!inWindow) continue;
    const dist = Math.min(Math.abs(key - peak), Math.abs(key - peak + 10000), Math.abs(key - peak - 10000));
    const intensity = Math.max(0.2, 1 - dist / 10);
    const next: MeteorShower = { name: shower.name, zhr: shower.zhr, intensity };
    if (!best || next.zhr * next.intensity > best.zhr * best.intensity) best = next;
  }
  return best;
}

function inBox(lat: number, lon: number, box: LatLonBox): boolean {
  return lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon;
}

export function activeEclipse(
  now: Date,
  lat: number | null,
  lon: number | null,
  phase: SceneSkyPhase
): SceneEclipse | null {
  const t = now.getTime();
  for (const ev of ECLIPSES) {
    if (t < ev.startMs || t > ev.endMs) continue;
    if (ev.kind === 'lunar') {
      if (phase !== 'night' && phase !== 'dusk') continue;
      return { kind: 'lunar', shade: ev.shade === 'annular' ? 'partial' : ev.shade, label: ev.label };
    }
    if (lat == null || lon == null || !ev.boxes?.some((box) => inBox(lat, lon, box))) continue;
    if (phase !== 'day' && phase !== 'dawn') continue;
    return {
      kind: 'solar',
      shade: ev.shade === 'penumbral' ? 'partial' : ev.shade,
      label: ev.label,
    };
  }
  return null;
}

export type CelestialScreenPosition = {
  leftPct: number;
  topPct: number;
  /** True when the body is above the local horizon. */
  aboveHorizon: boolean;
  altitudeDeg: number;
};

/** Degrees used to park the moon in the upper sky after it has set. */
const MOON_REST_ALTITUDE_DEG = 26;

/**
 * Map suncalc azimuth/altitude to Scene skyline screen coords.
 * suncalc v2 returns both in degrees (south → west positive azimuth).
 */
export function celestialToScreenPosition(
  azimuthDeg: number,
  altitudeDeg: number
): CelestialScreenPosition {
  const azimuthRad = (azimuthDeg * Math.PI) / 180;
  const aboveHorizon = altitudeDeg > -0.35;
  const leftPct = Math.min(94, Math.max(6, 50 + 50 * Math.sin(azimuthRad)));
  const displayAlt = Math.max(altitudeDeg, 2);
  const topPct = Math.min(58, Math.max(8, 56 - displayAlt * 1.08));
  return { leftPct, topPct, aboveHorizon, altitudeDeg };
}

export function sunScreenPosition(
  now: Date,
  lat: number,
  lon: number
): CelestialScreenPosition {
  const { azimuth, altitude } = SunCalc.getPosition(now, lat, lon);
  return celestialToScreenPosition(azimuth, altitude);
}

export function moonScreenPosition(
  now: Date,
  lat: number,
  lon: number
): CelestialScreenPosition {
  const { azimuth, altitude } = SunCalc.getMoonPosition(now, lat, lon);
  const pos = celestialToScreenPosition(azimuth, altitude);
  if (pos.aboveHorizon) return pos;
  // Keep tonight's moon in the sky after moonset so The Scene isn't empty.
  return celestialToScreenPosition(azimuth, MOON_REST_ALTITUDE_DEG);
}

export function moonShouldShow(
  phase: SceneSkyPhase,
  weather: SceneWeather,
  moon: MoonPhase,
  _opts?: { now?: Date; lat?: number | null; lon?: number | null }
): boolean {
  if (phase !== 'night' && phase !== 'dusk') return false;
  if (moon.illumination < 0.05) return false;
  if (cloudIntensity(weather) >= 0.92) return false;
  return true;
}

export function meteorSkyOpen(phase: SceneSkyPhase, weather: SceneWeather): boolean {
  if (phase !== 'night' && phase !== 'dusk') return false;
  return cloudIntensity(weather) < 0.58;
}

/** Milliseconds between shooting-star streaks. */
export function shootingStarIntervalMs(shower: MeteorShower | null): number {
  if (!shower) return 52000;
  return Math.max(3200, Math.round(88000 / Math.sqrt(shower.zhr * shower.intensity)));
}

export function moonGlow(moon: MoonPhase, weather: SceneWeather): number {
  const cloud = 1 - cloudIntensity(weather) * 0.75;
  return Math.max(0.12, moon.illumination * cloud);
}
