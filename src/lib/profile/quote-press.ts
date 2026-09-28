/**
 * The Imprint — generative quote-card typography engine.
 *
 * Seed text × faders unpack a stack of typographic layers (fonts, fills,
 * highlights, shadows, card backdrops). Same bar + same faders → same card.
 *
 * Combinatorial space ≈ 142M base axes × 101^4 fader steps.
 */

import { tokenizeLine, heuristicSyllables } from '@/lib/lyrics-analysis';
import { dieCutClip, hashSeed, type CutStyle } from '@/lib/profile/pressing';

export const QUOTE_PRESS_SLOT_LIMIT = 7;
export const IMPRINT_SHUFFLE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const IMPRINT_SHUFFLE_CAP_VISITOR = 3;
export const IMPRINT_SHUFFLE_CAP_PRO = 10;

/** Timestamps still inside the rolling 24-hour window, oldest first. */
export function activeImprintShuffleUses(raw: unknown, now = Date.now()): string[] {
  if (!Array.isArray(raw)) return [];
  const fresh = raw.filter((item): item is string => {
    if (typeof item !== 'string') return false;
    const at = Date.parse(item);
    return Number.isFinite(at) && now - at < IMPRINT_SHUFFLE_WINDOW_MS;
  });
  return fresh.slice(-IMPRINT_SHUFFLE_CAP_PRO);
}

export function imprintShuffleRemaining(
  raw: unknown,
  isPro: boolean,
  now = Date.now()
): { remaining: number; cap: number; uses: string[] } {
  const cap = isPro ? IMPRINT_SHUFFLE_CAP_PRO : IMPRINT_SHUFFLE_CAP_VISITOR;
  const uses = activeImprintShuffleUses(raw, now);
  const counted = uses.slice(-cap);
  return { remaining: Math.max(0, cap - counted.length), cap, uses };
}

export type QuotePressFaders = {
  heat: number;
  grain: number;
  pace: number;
  ink: number;
};

export type QuotePressConfig = {
  faders: QuotePressFaders;
};

export type QuotePressHighlight = {
  start: number;
  end: number;
  style: Record<string, string>;
};

export type QuotePressLayerKind =
  | 'gradientWash'
  | 'grain'
  | 'vignette'
  | 'foilRim'
  | 'lightLeak'
  | 'scanLine'
  | 'underlineBars'
  | 'quoteMarks'
  | 'cornerMarks'
  | 'wordGlow'
  | 'longShadow'
  | 'neonStroke'
  | 'mesh'
  | 'motes'
  | 'divider'
  | 'serialPlate'
  | 'aurora'
  | 'starfield'
  | 'pulseGlow'
  | 'driftBlob'
  | 'rippleRing'
  | 'chromaBand'
  | 'sparkleField'
  | 'breatheWash'
  | 'orbitDots'
  | 'waveWash'
  | 'prismaticSheen'
  | 'inkBleed'
  | 'haloPulse'
  | 'noiseDrift'
  | 'laserGrid'
  | 'emberField';

export type QuotePressLayer =
  | { kind: 'gradientWash'; depth: number; from: string; via: string; to: string; angle: number }
  | { kind: 'grain'; depth: number; opacity: number }
  | { kind: 'vignette'; depth: number; strength: number }
  | { kind: 'foilRim'; depth: number; gradient: string; opacity: number }
  | { kind: 'lightLeak'; depth: number; color: string; x: number; y: number; size: number }
  | { kind: 'scanLine'; depth: number; color: string; speedSec: number }
  | { kind: 'underlineBars'; depth: number; color: string; wordIndexes: number[] }
  | { kind: 'quoteMarks'; depth: number; open: string; close: string; color: string; size: number }
  | { kind: 'cornerMarks'; depth: number; color: string; variant: number }
  | { kind: 'wordGlow'; depth: number; color: string; blur: number }
  | { kind: 'longShadow'; depth: number; color: string; offset: number }
  | { kind: 'neonStroke'; depth: number; color: string; width: number }
  | { kind: 'mesh'; depth: number; opacity: number; cols: number }
  | { kind: 'motes'; depth: number; dots: Array<{ x: number; y: number; r: number; opacity: number }> }
  | { kind: 'divider'; depth: number; color: string; position: 'above' | 'below' }
  | { kind: 'serialPlate'; depth: number; serial: string; color: string }
  | { kind: 'aurora'; depth: number; from: string; via: string; to: string; durationSec: number }
  | { kind: 'starfield'; depth: number; stars: Array<{ x: number; y: number; r: number; delaySec: number }> }
  | { kind: 'pulseGlow'; depth: number; color: string; durationSec: number }
  | { kind: 'driftBlob'; depth: number; color: string; x: number; y: number; size: number; durationSec: number }
  | { kind: 'rippleRing'; depth: number; color: string; durationSec: number }
  | { kind: 'chromaBand'; depth: number; color: string; angle: number; durationSec: number }
  | { kind: 'sparkleField'; depth: number; sparkles: Array<{ x: number; y: number; delaySec: number }> }
  | { kind: 'breatheWash'; depth: number; color: string; durationSec: number }
  | { kind: 'orbitDots'; depth: number; color: string; count: number; durationSec: number }
  | { kind: 'waveWash'; depth: number; color: string; durationSec: number }
  | { kind: 'prismaticSheen'; depth: number; opacity: number; durationSec: number }
  | { kind: 'inkBleed'; depth: number; color: string; x: number; y: number }
  | { kind: 'haloPulse'; depth: number; color: string; durationSec: number }
  | { kind: 'noiseDrift'; depth: number; opacity: number; durationSec: number }
  | { kind: 'laserGrid'; depth: number; color: string; durationSec: number }
  | { kind: 'emberField'; depth: number; embers: Array<{ x: number; delaySec: number }> };

export type QuotePressTokens = {
  compositionId: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  letterSpacing: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  textColor: string;
  accentColor: string;
  fillMode: 'solid' | 'gradient' | 'split';
  textGradient?: string;
  highlightMode: 'none' | 'rhyme' | 'stress' | 'scatter' | 'gradientWords';
  highlights: QuotePressHighlight[];
  textShadow: string;
  cardBackground: string;
  cardBorder: string;
  cardGlow: string;
  frameClip: string;
  ornament: 'quotes' | 'corner' | 'serial' | 'barcode' | 'none';
  serial: string;
  layers: QuotePressLayer[];
  fontSizeClamp: string;
  scale: number;
  hue: number;
  cutStyle: CutStyle;
};

export type QuotePressSlot = {
  id: string;
  faders: QuotePressFaders;
  lockedAt: string;
  label: string;
};

/** Curated families — must match Google Fonts link in layout.tsx */
export const QUOTE_PRESS_FONTS = [
  '"Bebas Neue", sans-serif',
  '"Playfair Display", serif',
  '"Oswald", sans-serif',
  '"Space Grotesk", sans-serif',
  '"DM Serif Display", serif',
  '"Permanent Marker", cursive',
  '"Roboto Slab", serif',
  '"IBM Plex Mono", monospace',
  '"Inter", sans-serif',
  '"Architects Daughter", cursive',
  '"Syne", sans-serif',
  '"Libre Baskerville", serif',
  '"Anton", sans-serif',
  '"Caveat", cursive',
  '"Outfit", sans-serif',
  '"Bungee", cursive',
  '"Rubik", sans-serif',
  '"Fjalla One", sans-serif',
  '"Merriweather", serif',
  '"Kanit", sans-serif',
  '"Righteous", cursive',
  '"Lora", serif',
  '"Montserrat", sans-serif',
  '"Pacifico", cursive',
  '"Teko", sans-serif',
  '"Raleway", sans-serif',
  '"Abril Fatface", serif',
  '"Shadows Into Light", cursive',
  '"Bangers", cursive',
  '"Comfortaa", sans-serif',
  '"Cinzel", serif',
  '"Satisfy", cursive',
] as const;

export const QUOTE_PRESS_AXES = {
  fonts: QUOTE_PRESS_FONTS.length,
  weights: 6,
  align: 3,
  fill: 3,
  highlight: 5,
  ornament: 5,
  cut: 6,
  layers: 32,
} as const;

/** Layer stacks: 4–7 distinct kinds picked from 32. */
const LAYER_STACK_ESTIMATE = 35960 + 201376 + 906192 + 3365856;

export const QUOTE_PRESS_SPACE =
  QUOTE_PRESS_AXES.fonts *
  QUOTE_PRESS_AXES.weights *
  QUOTE_PRESS_AXES.align *
  QUOTE_PRESS_AXES.fill *
  QUOTE_PRESS_AXES.highlight *
  QUOTE_PRESS_AXES.ornament *
  QUOTE_PRESS_AXES.cut *
  LAYER_STACK_ESTIMATE;

export const DEFAULT_QUOTE_PRESS_FADERS: QuotePressFaders = {
  heat: 55,
  grain: 30,
  pace: 40,
  ink: 80,
};

const ALL_LAYER_KINDS: QuotePressLayerKind[] = [
  'gradientWash',
  'grain',
  'vignette',
  'foilRim',
  'lightLeak',
  'scanLine',
  'underlineBars',
  'quoteMarks',
  'cornerMarks',
  'wordGlow',
  'longShadow',
  'neonStroke',
  'mesh',
  'motes',
  'divider',
  'serialPlate',
  'aurora',
  'starfield',
  'pulseGlow',
  'driftBlob',
  'rippleRing',
  'chromaBand',
  'sparkleField',
  'breatheWash',
  'orbitDots',
  'waveWash',
  'prismaticSheen',
  'inkBleed',
  'haloPulse',
  'noiseDrift',
  'laserGrid',
  'emberField',
];

const WEIGHTS = [300, 400, 500, 600, 700, 800];
const HIGHLIGHT_MODES: QuotePressTokens['highlightMode'][] = [
  'none',
  'rhyme',
  'stress',
  'scatter',
  'gradientWords',
];
const ORNAMENTS: QuotePressTokens['ornament'][] = [
  'quotes',
  'corner',
  'serial',
  'barcode',
  'none',
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function mix(a: number, b: number): number {
  let h = (a >>> 0) ^ Math.imul(b >>> 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function normalizeQuotePressFaders(raw?: Partial<QuotePressFaders> | null): QuotePressFaders {
  return {
    heat: clamp(Math.round(Number(raw?.heat ?? DEFAULT_QUOTE_PRESS_FADERS.heat)) || 0, 0, 100),
    grain: clamp(Math.round(Number(raw?.grain ?? DEFAULT_QUOTE_PRESS_FADERS.grain)) || 0, 0, 100),
    ink: clamp(Math.round(Number(raw?.ink ?? DEFAULT_QUOTE_PRESS_FADERS.ink)) || 0, 0, 100),
    pace: clamp(Math.round(Number(raw?.pace ?? DEFAULT_QUOTE_PRESS_FADERS.pace)) || 0, 0, 100),
  };
}

export function identityHash(seedHash: number, faders: QuotePressFaders): number {
  return mix(
    seedHash,
    faders.heat * 1009 + faders.grain * 1013 + faders.pace * 1019 + faders.ink * 1021
  );
}

/** Free tier — deterministic faders from text alone. */
export function quotePressFadersFromText(text: string): QuotePressFaders {
  const h = hashSeed(text);
  return {
    heat: (h >>> 0) % 101,
    grain: (h >>> 8) % 101,
    pace: (h >>> 16) % 101,
    ink: (h >>> 24) % 101,
  };
}

export function randomQuotePressFaders(): QuotePressFaders {
  return {
    heat: Math.floor(Math.random() * 101),
    grain: Math.floor(Math.random() * 101),
    pace: Math.floor(Math.random() * 101),
    ink: Math.floor(Math.random() * 101),
  };
}

export function normalizeQuotePressConfig(raw: unknown): QuotePressConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Partial<QuotePressConfig>;
  if (!obj.faders) return undefined;
  return { faders: normalizeQuotePressFaders(obj.faders) };
}

export function sanitizeQuotePressSlots(raw: unknown): QuotePressSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: QuotePressSlot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<QuotePressSlot>;
    if (typeof row.id !== 'string' || !row.id.trim()) continue;
    if (!row.faders || typeof row.faders !== 'object') continue;
    out.push({
      id: row.id.trim().slice(0, 64),
      faders: normalizeQuotePressFaders(row.faders),
      lockedAt:
        typeof row.lockedAt === 'string' && row.lockedAt
          ? row.lockedAt.slice(0, 40)
          : new Date().toISOString(),
      label: typeof row.label === 'string' ? row.label.trim().slice(0, 48) : 'Locked style',
    });
    if (out.length >= QUOTE_PRESS_SLOT_LIMIT) break;
  }
  return out;
}

function pickLayerKinds(hash: number): QuotePressLayerKind[] {
  const count = 4 + ((hash >>> 3) % 4);
  const pool = [...ALL_LAYER_KINDS];
  const picked: QuotePressLayerKind[] = [];
  let h = hash;
  for (let i = 0; i < count && pool.length; i++) {
    h = mix(h, i * 7919 + 17);
    const idx = h % pool.length;
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  if (!picked.includes('gradientWash')) picked.unshift('gradientWash');
  return picked;
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;
}

function buildHighlights(
  text: string,
  mode: QuotePressTokens['highlightMode'],
  hash: number,
  accent: string,
  textColor: string
): QuotePressHighlight[] {
  if (mode === 'none' || !text.trim()) return [];
  const words = tokenizeLine(text);
  if (!words.length) return [];

  const highlights: QuotePressHighlight[] = [];
  let cursor = 0;
  const wordRanges: Array<{ word: string; start: number; end: number; syl: number }> = [];
  for (const word of words) {
    const idx = text.indexOf(word, cursor);
    if (idx < 0) continue;
    wordRanges.push({
      word,
      start: idx,
      end: idx + word.length,
      syl: heuristicSyllables(word),
    });
    cursor = idx + word.length;
  }

  const rhymeGroups = new Map<string, number>();
  let rhymeId = 0;
  for (const wr of wordRanges) {
    const tail = wr.word.slice(-3).toLowerCase();
    if (!rhymeGroups.has(tail)) rhymeGroups.set(tail, rhymeId++);
  }

  wordRanges.forEach((wr, i) => {
    let active = false;
    if (mode === 'stress') active = wr.syl >= 3 || i % 3 === 0;
    if (mode === 'rhyme') {
      const tail = wr.word.slice(-3).toLowerCase();
      const gid = rhymeGroups.get(tail) ?? 0;
      active = gid % 2 === 0;
    }
    if (mode === 'scatter') active = ((hash >>> (i * 5)) % 5) < 2;
    if (mode === 'gradientWords') active = i % 2 === 0;

    if (!active) return;
    const hueShift = ((hash >>> (i * 7)) % 40) - 20;
    const highlightBg =
      mode === 'rhyme' || mode === 'scatter'
        ? `hsl(${(hash % 360) + hueShift} 55% 38% / 0.55)`
        : 'transparent';
    highlights.push({
      start: wr.start,
      end: wr.end,
      style: {
        color:
          mode === 'gradientWords'
            ? accent
            : mode === 'rhyme' || mode === 'scatter'
              ? 'hsl(0 0% 98%)'
              : textColor,
        backgroundColor: highlightBg,
        textShadow:
          mode === 'stress'
            ? `0 0 14px ${accent}, 0 1px 2px rgba(0,0,0,0.45)`
            : mode === 'scatter'
              ? `0 2px 8px ${accent}`
              : 'none',
        fontWeight: mode === 'stress' ? '700' : 'inherit',
        ...(highlightBg !== 'transparent'
          ? { borderRadius: '3px', padding: '0 3px' }
          : {}),
      },
    });
  });

  return highlights;
}

function buildLayer(
  kind: QuotePressLayerKind,
  hash: number,
  faders: QuotePressFaders,
  hue: number,
  serial: string,
  depth: number,
  wordCount: number
): QuotePressLayer {
  const sat = 42 + faders.heat * 0.38;
  const accent = hsl(hue, sat, 58 + faders.heat * 0.12);
  const accentSoft = hsl(hue, sat * 0.7, 72, 0.45);

  switch (kind) {
    case 'gradientWash':
      return {
        kind,
        depth,
        from: hsl(hue, sat, 8 + (100 - faders.ink) * 0.12),
        via: hsl((hue + 24) % 360, sat * 0.85, 14 + (100 - faders.ink) * 0.1),
        to: hsl((hue + 48) % 360, sat * 0.7, 6 + (100 - faders.ink) * 0.08),
        angle: 120 + ((hash >>> 4) % 120),
      };
    case 'grain':
      return { kind, depth, opacity: Number((0.04 + faders.grain * 0.0045).toFixed(3)) };
    case 'vignette':
      return { kind, depth, strength: Number((0.35 + faders.ink * 0.004).toFixed(3)) };
    case 'foilRim':
      return {
        kind,
        depth,
        gradient: `linear-gradient(135deg, ${accent}, transparent 40%, ${accentSoft})`,
        opacity: Number((0.25 + faders.heat * 0.003).toFixed(3)),
      };
    case 'lightLeak':
      return {
        kind,
        depth,
        color: accentSoft,
        x: 8 + ((hash >>> 6) % 84),
        y: 6 + ((hash >>> 10) % 40),
        size: 28 + ((hash >>> 14) % 36),
      };
    case 'scanLine':
      return {
        kind,
        depth,
        color: accent,
        speedSec: clamp(6 - faders.pace * 0.04, 2.5, 9),
      };
    case 'underlineBars':
      return {
        kind,
        depth,
        color: accent,
        wordIndexes: Array.from({ length: Math.min(3, wordCount) }, (_, i) => i * 2 + ((hash >>> i) % 2)),
      };
    case 'quoteMarks':
      return {
        kind,
        depth,
        open: '\u201C',
        close: '\u201D',
        color: accent,
        size: 1.4 + faders.heat * 0.006,
      };
    case 'cornerMarks':
      return { kind, depth, color: accent, variant: (hash >>> 12) % 4 };
    case 'wordGlow':
      return { kind, depth, color: accent, blur: 8 + faders.heat * 0.2 };
    case 'longShadow':
      return {
        kind,
        depth,
        color: hsl(hue, sat * 0.5, 4, 0.55),
        offset: 2 + Math.round(faders.ink * 0.06),
      };
    case 'neonStroke':
      return { kind, depth, color: accent, width: 1 + ((hash >>> 2) % 2) };
    case 'mesh':
      return {
        kind,
        depth,
        opacity: Number((0.06 + faders.grain * 0.002).toFixed(3)),
        cols: 4 + ((hash >>> 8) % 5),
      };
    case 'motes': {
      const dots = Array.from({ length: 5 + ((hash >>> 5) % 6) }, (_, i) => ({
        x: 6 + ((hash >>> (i * 3)) % 88),
        y: 8 + ((hash >>> (i * 3 + 1)) % 84),
        r: 1 + ((hash >>> (i * 3 + 2)) % 3),
        opacity: Number((0.2 + (i % 3) * 0.15).toFixed(2)),
      }));
      return { kind, depth, dots };
    }
    case 'divider':
      return {
        kind,
        depth,
        color: accent,
        position: (hash >>> 18) % 2 === 0 ? 'above' : 'below',
      };
    case 'serialPlate':
      return { kind, depth, serial, color: hsl(hue, sat * 0.4, 55, 0.65) };
    case 'aurora':
      return {
        kind,
        depth,
        from: hsl(hue, sat, 42, 0.35),
        via: hsl((hue + 60) % 360, sat * 0.9, 52, 0.28),
        to: hsl((hue + 120) % 360, sat * 0.75, 38, 0.32),
        durationSec: clamp(8 - faders.pace * 0.05, 4, 14),
      };
    case 'starfield': {
      const stars = Array.from({ length: 8 + ((hash >>> 4) % 10) }, (_, i) => ({
        x: 4 + ((hash >>> (i * 2)) % 92),
        y: 4 + ((hash >>> (i * 2 + 1)) % 92),
        r: 0.6 + ((hash >>> (i * 3)) % 3) * 0.4,
        delaySec: Number(((i * 0.37) % 4).toFixed(2)),
      }));
      return { kind, depth, stars };
    }
    case 'pulseGlow':
      return {
        kind,
        depth,
        color: accentSoft,
        durationSec: clamp(5 - faders.pace * 0.03, 2.5, 8),
      };
    case 'driftBlob':
      return {
        kind,
        depth,
        color: accentSoft,
        x: 10 + ((hash >>> 6) % 80),
        y: 12 + ((hash >>> 9) % 76),
        size: 22 + ((hash >>> 12) % 34),
        durationSec: clamp(10 - faders.pace * 0.06, 5, 16),
      };
    case 'rippleRing':
      return {
        kind,
        depth,
        color: accent,
        durationSec: clamp(7 - faders.pace * 0.04, 3, 12),
      };
    case 'chromaBand':
      return {
        kind,
        depth,
        color: accent,
        angle: 30 + ((hash >>> 7) % 120),
        durationSec: clamp(9 - faders.pace * 0.05, 4, 15),
      };
    case 'sparkleField': {
      const sparkles = Array.from({ length: 6 + ((hash >>> 5) % 8) }, (_, i) => ({
        x: 5 + ((hash >>> (i * 2)) % 90),
        y: 6 + ((hash >>> (i * 2 + 1)) % 88),
        delaySec: Number(((i * 0.53) % 5).toFixed(2)),
      }));
      return { kind, depth, sparkles };
    }
    case 'breatheWash':
      return {
        kind,
        depth,
        color: hsl(hue, sat * 0.6, 24, 0.22),
        durationSec: clamp(6 - faders.pace * 0.035, 3, 10),
      };
    case 'orbitDots':
      return {
        kind,
        depth,
        color: accent,
        count: 3 + ((hash >>> 8) % 4),
        durationSec: clamp(12 - faders.pace * 0.07, 6, 20),
      };
    case 'waveWash':
      return {
        kind,
        depth,
        color: accentSoft,
        durationSec: clamp(8 - faders.pace * 0.045, 4, 14),
      };
    case 'prismaticSheen':
      return {
        kind,
        depth,
        opacity: Number((0.12 + faders.heat * 0.0025).toFixed(3)),
        durationSec: clamp(10 - faders.pace * 0.055, 5, 18),
      };
    case 'inkBleed':
      return {
        kind,
        depth,
        color: hsl(hue, sat * 0.5, 8, 0.45),
        x: 15 + ((hash >>> 10) % 70),
        y: 20 + ((hash >>> 13) % 60),
      };
    case 'haloPulse':
      return {
        kind,
        depth,
        color: accent,
        durationSec: clamp(5.5 - faders.pace * 0.032, 2.8, 9),
      };
    case 'noiseDrift':
      return {
        kind,
        depth,
        opacity: Number((0.05 + faders.grain * 0.003).toFixed(3)),
        durationSec: clamp(14 - faders.pace * 0.08, 7, 22),
      };
    case 'laserGrid':
      return {
        kind,
        depth,
        color: accent,
        durationSec: clamp(11 - faders.pace * 0.06, 5, 18),
      };
    case 'emberField': {
      const embers = Array.from({ length: 5 + ((hash >>> 6) % 7) }, (_, i) => ({
        x: 8 + ((hash >>> (i * 3)) % 84),
        delaySec: Number(((i * 0.71) % 6).toFixed(2)),
      }));
      return { kind, depth, embers };
    }
    default:
      return { kind: 'grain', depth, opacity: 0.08 };
  }
}

function plateSerial(hash: number): string {
  const a = (hash >>> 0).toString(36).toUpperCase().slice(0, 4).padStart(4, '0');
  const b = (hash >>> 12).toString(36).toUpperCase().slice(0, 4).padStart(4, '0');
  return `IM-${a}-${b}`;
}

export function quotePressTokens(text: string, config?: QuotePressConfig | null): QuotePressTokens {
  const trimmed = text.trim().slice(0, 1000);
  const faders = normalizeQuotePressFaders(config?.faders ?? quotePressFadersFromText(trimmed));
  const seedHash = hashSeed(trimmed || 'imprint');
  const pressHash = identityHash(seedHash, faders);
  const words = tokenizeLine(trimmed);

  const fontIdx = pressHash % QUOTE_PRESS_FONTS.length;
  const weightIdx = (pressHash >>> 6) % WEIGHTS.length;
  const alignIdx = (pressHash >>> 10) % 3;
  const fillIdx = (pressHash >>> 12) % 3;
  const highlightIdx = (pressHash >>> 14) % HIGHLIGHT_MODES.length;
  const ornamentIdx = (pressHash >>> 18) % ORNAMENTS.length;
  const cutStyle = ((pressHash >>> 22) % 6) as CutStyle;

  const hue = pressHash % 360;
  const sat = 38 + faders.heat * 0.42;
  const textLight = Math.max(78, 92 - faders.ink * 0.18);
  const textColor = hsl(hue, Math.max(18, sat * 0.45), textLight);
  const accentColor = hsl((hue + 42) % 360, Math.max(28, sat), Math.min(88, 62 + faders.heat * 0.15));

  const fillMode: QuotePressTokens['fillMode'] =
    fillIdx === 0 ? 'solid' : fillIdx === 1 ? 'gradient' : 'split';
  const highlightMode = HIGHLIGHT_MODES[highlightIdx];
  const ornament = ORNAMENTS[ornamentIdx];

  const letterEm = Number((-0.02 + faders.pace * 0.0016).toFixed(3));
  const lineHeight = Number((1.08 + faders.pace * 0.004).toFixed(2));
  const textAlign: QuotePressTokens['textAlign'] =
    alignIdx === 0 ? 'left' : alignIdx === 1 ? 'center' : 'right';

  const shadowY = 1 + Math.round(faders.ink * 0.05);
  const shadowBlur = 4 + Math.round(faders.heat * 0.12);
  const textShadow = `${shadowY}px ${shadowY + 1}px ${shadowBlur}px hsl(${hue} 30% 4% / 0.65)`;

  const serial = plateSerial(pressHash);
  const layerKinds = pickLayerKinds(pressHash);
  const layers = layerKinds.map((kind, i) =>
    buildLayer(kind, mix(pressHash, i * 997), faders, hue, serial, 1 - i / (layerKinds.length + 1), words.length)
  );

  const lenScale = trimmed.length > 280 ? 0.82 : trimmed.length > 160 ? 0.9 : 1;
  const fontSizeClamp = `clamp(${1.05 * lenScale}rem, ${2.8 * lenScale}vw, ${2.2 * lenScale}rem)`;

  const cardBackground = hsl(hue, sat * 0.55, 10 + (100 - faders.ink) * 0.08);
  const cardBorder = hsl(hue, sat * 0.4, 42, 0.35);
  const cardGlow = `0 8px 32px hsl(${hue} 50% 20% / ${0.25 + faders.heat * 0.003})`;

  const highlights = buildHighlights(trimmed, highlightMode, pressHash, accentColor, textColor);

  const textGradient =
    fillMode !== 'solid'
      ? `linear-gradient(135deg, ${textColor}, ${accentColor})`
      : undefined;

  return {
    compositionId: serial,
    fontFamily: QUOTE_PRESS_FONTS[fontIdx],
    fontWeight: WEIGHTS[weightIdx],
    fontStyle: (pressHash >>> 20) % 5 === 0 ? 'italic' : 'normal',
    letterSpacing: `${letterEm}em`,
    lineHeight,
    textAlign,
    textColor,
    accentColor,
    fillMode,
    textGradient,
    highlightMode,
    highlights,
    textShadow,
    cardBackground,
    cardBorder,
    cardGlow,
    frameClip: dieCutClip(cutStyle),
    ornament,
    serial,
    layers,
    fontSizeClamp,
    scale: lenScale,
    hue,
    cutStyle,
  };
}

export function quotePressCssVars(tokens: QuotePressTokens): Record<string, string> {
  return {
    '--qp-text': tokens.textColor,
    '--qp-accent': tokens.accentColor,
    '--qp-bg': tokens.cardBackground,
    '--qp-border': tokens.cardBorder,
    '--qp-glow': tokens.cardGlow,
  };
}

export function quotePressSlotLabel(faders: QuotePressFaders): string {
  const h = identityHash(hashSeed('imprint'), faders);
  const moods = ['Neon', 'Velvet', 'Grit', 'Ivory', 'Ink', 'Halo', 'Cipher', 'Brass'];
  return `${moods[h % moods.length]} · ${faders.heat}/${faders.grain}/${faders.pace}/${faders.ink}`;
}
