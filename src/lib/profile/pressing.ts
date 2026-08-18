/**
 * The Pressing — Living Field composition engine.
 *
 * Each Artist Home is a unique stack of visual layers from a 24-kind vocabulary
 * (classic groove/mesh/ghost stack + futuristic lattice, beams, orbitals, scan,
 * constellation, prisms, aurora, horizon, signal, spires, nova, circuit).
 * Seed × faders pick which layers + their geometry — vast combination space.
 *
 * Hue is locked to the seed. Scroll drives parallax / phase only — never recolor.
 * Pure + client-safe.
 */

import { tokenizeLine, heuristicSyllables } from '@/lib/lyrics-analysis';

export type PressingFaders = {
  heat: number;
  grain: number;
  pace: number;
  ink: number;
};

export type PressingConfig = {
  seedText: string;
  faders: PressingFaders;
  alive?: boolean;
  /** Restless — faster motion. Does NOT recolor. */
  autoDrift?: boolean;
};

export type CutStyle = 0 | 1 | 2 | 3 | 4 | 5;
export type ApertureMode = 0 | 1 | 2 | 3 | 4;

export type GrooveRing = {
  d: string;
  opacity: number;
  strokeWidth: number;
  rotateSec: number;
  reverse: boolean;
};

export type FieldLayerKind =
  | 'grooves'
  | 'wells'
  | 'ribbons'
  | 'mesh'
  | 'ghosts'
  | 'curtains'
  | 'facets'
  | 'ripples'
  | 'arcs'
  | 'motes'
  | 'blade'
  | 'film'
  | 'lattice'
  | 'beams'
  | 'orbitals'
  | 'scan'
  | 'constellation'
  | 'prisms'
  | 'aurora'
  | 'horizon'
  | 'signal'
  | 'spires'
  | 'nova'
  | 'circuit';

export type FieldLayer =
  | {
      kind: 'grooves';
      depth: number;
      rings: GrooveRing[];
      stylusPath: string;
      stylusSec: number;
    }
  | {
      kind: 'wells';
      depth: number;
      wells: Array<{ x: number; y: number; r: number; opacity: number }>;
    }
  | {
      kind: 'ribbons';
      depth: number;
      paths: Array<{ d: string; opacity: number; width: number }>;
    }
  | {
      kind: 'mesh';
      depth: number;
      cols: number;
      rows: number;
      warp: number;
      opacity: number;
    }
  | {
      kind: 'ghosts';
      depth: number;
      words: Array<{ text: string; x: number; y: number; size: number; rot: number }>;
    }
  | {
      kind: 'curtains';
      depth: number;
      sheets: Array<{ x: number; width: number; opacity: number }>;
    }
  | {
      kind: 'facets';
      depth: number;
      polys: Array<{ points: string; opacity: number }>;
    }
  | {
      kind: 'ripples';
      depth: number;
      origins: Array<{ x: number; y: number; delay: number }>;
    }
  | {
      kind: 'arcs';
      depth: number;
      curves: Array<{ d: string; opacity: number }>;
    }
  | {
      kind: 'motes';
      depth: number;
      orbs: Array<{ x: number; y: number; r: number; opacity: number; drift: number }>;
    }
  | {
      kind: 'blade';
      depth: number;
      angle: number;
      opacity: number;
    }
  | {
      kind: 'film';
      depth: number;
      side: 'left' | 'right' | 'both';
      opacity: number;
    }
  | {
      kind: 'lattice';
      depth: number;
      cells: Array<{ cx: number; cy: number; r: number; opacity: number }>;
    }
  | {
      kind: 'beams';
      depth: number;
      focus: { x: number; y: number };
      rays: Array<{ angle: number; length: number; width: number; opacity: number }>;
    }
  | {
      kind: 'orbitals';
      depth: number;
      cx: number;
      cy: number;
      rings: Array<{ r: number; opacity: number }>;
      nodes: Array<{ angle: number; orbit: number; size: number; opacity: number }>;
      spinSec: number;
    }
  | {
      kind: 'scan';
      depth: number;
      lineCount: number;
      opacity: number;
      sweepOpacity: number;
      periodSec: number;
    }
  | {
      kind: 'constellation';
      depth: number;
      stars: Array<{ x: number; y: number; r: number; opacity: number }>;
      edges: Array<{ d: string; opacity: number }>;
    }
  | {
      kind: 'prisms';
      depth: number;
      shards: Array<{ points: string; opacity: number }>;
    }
  | {
      kind: 'aurora';
      depth: number;
      bands: Array<{ x: number; width: number; opacity: number; skew: number }>;
    }
  | {
      kind: 'horizon';
      depth: number;
      vanishY: number;
      rows: number;
      cols: number;
      opacity: number;
    }
  | {
      kind: 'signal';
      depth: number;
      traces: Array<{ d: string; opacity: number; width: number }>;
    }
  | {
      kind: 'spires';
      depth: number;
      needles: Array<{ x: number; height: number; width: number; opacity: number }>;
    }
  | {
      kind: 'nova';
      depth: number;
      cx: number;
      cy: number;
      rays: number;
      opacity: number;
      spinSec: number;
    }
  | {
      kind: 'circuit';
      depth: number;
      traces: Array<{ d: string; opacity: number }>;
      nodes: Array<{ x: number; y: number; r: number; opacity: number }>;
    };

export type PressingTokens = {
  seedHash: number;
  pressHash: number;
  hue: number;
  hue2: number;
  hue3: number;
  saturation: number;
  bgL: number;
  cardL: number;
  grainOpacity: number;
  motionSec: number;
  breathSec: number;
  plateFamily: number;
  compositionId: string;
  aperture: ApertureMode;
  layers: FieldLayer[];
  cutStyle: CutStyle;
  plateSkew: number;
  plateSerial: string;
  radiusPx: number;
  typeVariant: number;
  alive: boolean;
  autoDrift: boolean;
  totalSyllables: number;
  ghostText: string;
  /** Alias used by older UI labels. */
  grooveFamily: number;
};

export const DEFAULT_FADERS: PressingFaders = { heat: 55, grain: 30, pace: 40, ink: 80 };

export const DEFAULT_PRESSING: PressingConfig = {
  seedText: 'Type a bar here to watch your page change.',
  faders: DEFAULT_FADERS,
  alive: true,
  autoDrift: false,
};

const ALL_KINDS: FieldLayerKind[] = [
  'grooves',
  'wells',
  'ribbons',
  'mesh',
  'ghosts',
  'curtains',
  'facets',
  'ripples',
  'arcs',
  'motes',
  'blade',
  'film',
  'lattice',
  'beams',
  'orbitals',
  'scan',
  'constellation',
  'prisms',
  'aurora',
  'horizon',
  'signal',
  'spires',
  'nova',
  'circuit',
];

/** Accent-only stacks feel empty — force a body layer if we landed here. */
const ACCENT_ONLY = new Set<FieldLayerKind>(['film', 'blade', 'scan', 'motes', 'spires']);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function hashSeed(text: string): number {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mix(a: number, b: number): number {
  let h = (a >>> 0) ^ Math.imul(b >>> 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function normalizeFaders(raw?: Partial<PressingFaders> | null): PressingFaders {
  return {
    heat: clamp(Math.round(Number(raw?.heat ?? DEFAULT_FADERS.heat)) || 0, 0, 100),
    grain: clamp(Math.round(Number(raw?.grain ?? DEFAULT_FADERS.grain)) || 0, 0, 100),
    pace: clamp(Math.round(Number(raw?.pace ?? DEFAULT_FADERS.pace)) || 0, 0, 100),
    ink: clamp(Math.round(Number(raw?.ink ?? DEFAULT_FADERS.ink)) || 0, 0, 100),
  };
}

function breathFromSyllables(totalSyllables: number, pace: number): number {
  const spoken = Math.max(2.4, totalSyllables * 0.22);
  return Number(clamp(spoken * (1.55 - pace * 0.009), 3.2, 14).toFixed(2));
}

function syllableStats(seedText: string): { totalSyllables: number; density: number; words: string[] } {
  const words = tokenizeLine(seedText).slice(0, 16);
  if (!words.length) return { totalSyllables: 2, density: 1.6, words: [] };
  const totalSyllables = words.reduce((s, w) => s + Math.max(1, heuristicSyllables(w)), 0);
  return { totalSyllables, density: totalSyllables / words.length, words };
}

export function identityHash(seedHash: number, faders: PressingFaders): number {
  return mix(
    seedHash,
    faders.heat * 1009 + faders.grain * 1013 + faders.pace * 1019 + faders.ink * 1021
  );
}

function groovePathAtRadius(
  words: string[],
  hash: number,
  lobes: number,
  radius: number,
  family: number,
  ringIndex: number
): string {
  const samples = Math.max(48, lobes * 12);
  const ecc = 0.72 + ((hash >>> (ringIndex + 3)) % 24) / 100;
  const cx = 50 + (((hash >>> (10 + ringIndex)) % 11) - 5) * 0.22;
  const cy = 48 + (((hash >>> (14 + ringIndex)) % 9) - 4) * 0.28;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    let r = radius;
    for (let L = 0; L < lobes; L++) {
      const word = words[L % Math.max(words.length, 1)];
      const syl = word ? Math.max(1, heuristicSyllables(word)) : 2;
      const amp = (0.55 + ((hash >>> (L * 3 + ringIndex)) % 10) * 0.12) * (0.45 + syl * 0.1);
      const phase = (((hash >>> (L * 5 + 2)) % 628) / 100) + ringIndex * 0.07;
      const harm = 1 + ((L + family) % 4);
      r += Math.cos(angle * harm + phase) * amp;
    }
    r = clamp(r, 6, 46);
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(2)} ${(cy + Math.sin(angle) * r * ecc).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' ')} Z`;
}

function pickLayerKinds(hash: number): FieldLayerKind[] {
  // 2–4 distinct layers from 24 kinds → combination space ~8× the prior 12-kind pool
  const count = 2 + ((hash >>> 3) % 3);
  const pool = [...ALL_KINDS];
  const picked: FieldLayerKind[] = [];
  let h = hash;
  for (let i = 0; i < count && pool.length; i++) {
    h = mix(h, i * 9973 + 13);
    const idx = h % pool.length;
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  if (picked.length && picked.every((k) => ACCENT_ONLY.has(k))) {
    (picked as FieldLayerKind[])[0] = 'grooves';
  }
  return picked;
}

function buildLayer(
  kind: FieldLayerKind,
  seedText: string,
  hash: number,
  words: string[],
  faders: PressingFaders,
  breathSec: number,
  depth: number
): FieldLayer {
  const family = (hash >>> 8) % 8;
  const lobes = clamp(3 + Math.min(words.length, 8), 3, 11);

  switch (kind) {
    case 'grooves': {
      const n = 5 + ((hash >>> 4) % 6);
      const baseRotate = clamp(48 - faders.pace * 0.28, 18, 56);
      const rings: GrooveRing[] = [];
      for (let i = 0; i < n; i++) {
        const radius = 12 + i * ((34 - 12) / Math.max(n - 1, 1));
        rings.push({
          d: groovePathAtRadius(words, hash, lobes, radius, family, i),
          opacity: Number((0.1 + (i / n) * 0.22).toFixed(3)),
          strokeWidth: Number((0.18 + (n - i) * 0.04).toFixed(3)),
          rotateSec: Number((baseRotate * (0.7 + i * 0.18)).toFixed(2)),
          reverse: i % 2 === 1,
        });
      }
      return {
        kind,
        depth,
        rings,
        stylusPath: rings[Math.floor(n * 0.72)]?.d || rings[0]?.d || '',
        stylusSec: Number(clamp(breathSec * 1.35, 5, 16).toFixed(2)),
      };
    }
    case 'wells': {
      const count = 2 + ((hash >>> 5) % 4);
      const wells = Array.from({ length: count }, (_, i) => ({
        x: 12 + ((hash >>> (i * 4)) % 76),
        y: 14 + ((hash >>> (i * 5 + 2)) % 68),
        r: 14 + ((hash >>> (i * 3)) % 22) + faders.heat * 0.08,
        opacity: Number((0.1 + ((hash >>> (i + 6)) % 12) / 100).toFixed(3)),
      }));
      return { kind, depth, wells };
    }
    case 'ribbons': {
      const count = 2 + ((hash >>> 6) % 3);
      const paths = Array.from({ length: count }, (_, i) => {
        const y0 = 15 + i * 28 + ((hash >>> (i * 2)) % 10);
        const c1 = 20 + ((hash >>> (i * 3)) % 40);
        const c2 = 50 + ((hash >>> (i * 4)) % 35);
        return {
          d: `M -5 ${y0} C ${c1} ${y0 - 18}, ${c2} ${y0 + 22}, 105 ${y0 + ((hash >> i) % 12) - 6}`,
          opacity: Number((0.12 + i * 0.05).toFixed(3)),
          width: Number((2.2 + ((hash >>> i) % 8) * 0.4).toFixed(2)),
        };
      });
      return { kind, depth, paths };
    }
    case 'mesh':
      return {
        kind,
        depth,
        cols: 6 + ((hash >>> 7) % 7),
        rows: 5 + ((hash >>> 9) % 6),
        warp: Number((0.4 + ((hash >>> 2) % 20) / 10 + faders.grain * 0.008).toFixed(2)),
        opacity: Number((0.06 + faders.heat * 0.0006).toFixed(3)),
      };
    case 'ghosts': {
      const raw = tokenizeLine(seedText)
        .map((w) => w.replace(/[^a-zA-Z']/g, ''))
        .filter((w) => w.length >= 3)
        .sort((a, b) => b.length - a.length);
      const wordsOut: Array<{ text: string; x: number; y: number; size: number; rot: number }> = [];
      for (let i = 0; i < Math.min(3, raw.length || 1); i++) {
        const w = (raw[i] || 'PRESS').toUpperCase();
        wordsOut.push({
          text: w,
          x: 4 + i * 22 + ((hash >>> (i * 3)) % 10),
          y: 12 + i * 26,
          size: 9 + ((hash >>> (i + 4)) % 8),
          rot: ((hash >>> (i * 5)) % 17) - 8,
        });
      }
      return { kind, depth, words: wordsOut };
    }
    case 'curtains': {
      const count = 3 + ((hash >>> 4) % 4);
      const sheets = Array.from({ length: count }, (_, i) => ({
        x: (100 / (count + 1)) * (i + 1) + (((hash >>> i) % 9) - 4),
        width: 8 + ((hash >>> (i * 2)) % 14),
        opacity: Number((0.05 + ((hash >>> (i + 3)) % 10) / 100).toFixed(3)),
      }));
      return { kind, depth, sheets };
    }
    case 'facets': {
      const count = 3 + ((hash >>> 5) % 4);
      const polys = Array.from({ length: count }, (_, i) => {
        const cx = 20 + ((hash >>> (i * 4)) % 60);
        const cy = 18 + ((hash >>> (i * 5 + 1)) % 55);
        const s = 10 + ((hash >>> (i * 3)) % 16);
        const a = ((hash >>> (i * 2)) % 360) * (Math.PI / 180);
        const pts = [0, 1, 2, 3].map((k) => {
          const ang = a + (k * Math.PI) / 2;
          return `${(cx + Math.cos(ang) * s).toFixed(1)},${(cy + Math.sin(ang) * s * 0.85).toFixed(1)}`;
        });
        return { points: pts.join(' '), opacity: Number((0.05 + i * 0.02).toFixed(3)) };
      });
      return { kind, depth, polys };
    }
    case 'ripples': {
      const count = 2 + ((hash >>> 3) % 3);
      const origins = Array.from({ length: count }, (_, i) => ({
        x: 20 + ((hash >>> (i * 6)) % 60),
        y: 22 + ((hash >>> (i * 7 + 2)) % 50),
        delay: i * 0.8,
      }));
      return { kind, depth, origins };
    }
    case 'arcs': {
      const nodes = Array.from({ length: 4 + ((hash >>> 2) % 4) }, (_, i) => ({
        x: 10 + ((hash >>> (i * 3)) % 80),
        y: 12 + ((hash >>> (i * 5 + 1)) % 70),
      }));
      const curves: Array<{ d: string; opacity: number }> = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        const mx = (a.x + b.x) / 2 + (((hash >>> i) % 20) - 10);
        const my = (a.y + b.y) / 2 + (((hash >>> (i + 3)) % 20) - 10);
        curves.push({
          d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`,
          opacity: Number((0.1 + (i % 3) * 0.04).toFixed(3)),
        });
      }
      return { kind, depth, curves };
    }
    case 'motes': {
      const count = 5 + ((hash >>> 4) % 7);
      const orbs = Array.from({ length: count }, (_, i) => ({
        x: 5 + ((hash >>> (i * 4)) % 90),
        y: 8 + ((hash >>> (i * 5 + 2)) % 84),
        r: 1.2 + ((hash >>> (i * 2)) % 18) / 4,
        opacity: Number((0.08 + ((hash >>> i) % 12) / 100).toFixed(3)),
        drift: 0.6 + ((hash >>> (i + 7)) % 10) / 10,
      }));
      return { kind, depth, orbs };
    }
    case 'blade':
      return {
        kind,
        depth,
        angle: ((hash >>> 6) % 160) - 30,
        opacity: Number((0.08 + faders.heat * 0.0007).toFixed(3)),
      };
    case 'lattice': {
      const cells: Array<{ cx: number; cy: number; r: number; opacity: number }> = [];
      const cols = 4 + ((hash >>> 3) % 3);
      const rows = 3 + ((hash >>> 5) % 3);
      const r = 5.5 + ((hash >>> 7) % 4);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offset = row % 2 === 0 ? 0 : r * 0.9;
          cells.push({
            cx: 8 + offset + col * ((84 - offset) / Math.max(cols - 1, 1)),
            cy: 12 + row * (76 / Math.max(rows - 1, 1)),
            r,
            opacity: Number((0.05 + ((hash >>> (col + row * 3)) % 10) / 100).toFixed(3)),
          });
        }
      }
      return { kind, depth, cells };
    }
    case 'beams': {
      const focus = {
        x: 20 + ((hash >>> 4) % 60),
        y: 8 + ((hash >>> 8) % 30),
      };
      const count = 5 + ((hash >>> 2) % 6);
      const rays = Array.from({ length: count }, (_, i) => ({
        angle: -70 + i * (140 / Math.max(count - 1, 1)) + (((hash >>> i) % 9) - 4),
        length: 55 + ((hash >>> (i + 3)) % 35),
        width: Number((1.2 + ((hash >>> (i * 2)) % 8) * 0.35).toFixed(2)),
        opacity: Number((0.06 + ((hash >>> (i + 5)) % 10) / 100).toFixed(3)),
      }));
      return { kind, depth, focus, rays };
    }
    case 'orbitals': {
      const cx = 42 + ((hash >>> 4) % 16);
      const cy = 40 + ((hash >>> 6) % 14);
      const rings = Array.from({ length: 3 + ((hash >>> 3) % 3) }, (_, i) => ({
        r: 10 + i * 9 + ((hash >>> (i + 2)) % 4),
        opacity: Number((0.08 + i * 0.03).toFixed(3)),
      }));
      const nodes = Array.from({ length: 4 + ((hash >>> 5) % 5) }, (_, i) => ({
        angle: ((hash >>> (i * 4)) % 360) + i * 37,
        orbit: rings[i % rings.length]?.r ?? 18,
        size: 0.6 + ((hash >>> (i + 1)) % 8) / 10,
        opacity: Number((0.12 + ((hash >>> i) % 10) / 100).toFixed(3)),
      }));
      return {
        kind,
        depth,
        cx,
        cy,
        rings,
        nodes,
        spinSec: Number(clamp(breathSec * 2.2, 10, 28).toFixed(2)),
      };
    }
    case 'scan':
      return {
        kind,
        depth,
        lineCount: 18 + ((hash >>> 4) % 14),
        opacity: Number((0.04 + faders.grain * 0.0005).toFixed(3)),
        sweepOpacity: Number((0.1 + faders.heat * 0.0006).toFixed(3)),
        periodSec: Number(clamp(breathSec * 1.1, 4, 14).toFixed(2)),
      };
    case 'constellation': {
      const count = 6 + ((hash >>> 3) % 6);
      const stars = Array.from({ length: count }, (_, i) => ({
        x: 8 + ((hash >>> (i * 5)) % 84),
        y: 10 + ((hash >>> (i * 7 + 2)) % 72),
        r: 0.35 + ((hash >>> (i * 2)) % 10) / 12,
        opacity: Number((0.12 + ((hash >>> i) % 12) / 100).toFixed(3)),
      }));
      const edges: Array<{ d: string; opacity: number }> = [];
      for (let i = 0; i < stars.length - 1; i++) {
        if (((hash >>> (i + 9)) % 3) === 0) continue;
        const a = stars[i];
        const b = stars[(i + 1 + ((hash >>> i) % 2)) % stars.length];
        edges.push({
          d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
          opacity: Number((0.06 + (i % 3) * 0.02).toFixed(3)),
        });
      }
      return { kind, depth, stars, edges };
    }
    case 'prisms': {
      const count = 3 + ((hash >>> 4) % 4);
      const shards = Array.from({ length: count }, (_, i) => {
        const cx = 15 + ((hash >>> (i * 5)) % 70);
        const cy = 12 + ((hash >>> (i * 6 + 1)) % 60);
        const len = 14 + ((hash >>> (i * 3)) % 18);
        const w = 3 + ((hash >>> (i * 2)) % 5);
        const a = (((hash >>> (i * 4)) % 360) * Math.PI) / 180;
        const tipX = cx + Math.cos(a) * len;
        const tipY = cy + Math.sin(a) * len;
        const ox = Math.cos(a + Math.PI / 2) * w;
        const oy = Math.sin(a + Math.PI / 2) * w;
        return {
          points: `${cx.toFixed(1)},${cy.toFixed(1)} ${(tipX + ox).toFixed(1)},${(tipY + oy).toFixed(1)} ${(tipX - ox).toFixed(1)},${(tipY - oy).toFixed(1)}`,
          opacity: Number((0.05 + i * 0.02).toFixed(3)),
        };
      });
      return { kind, depth, shards };
    }
    case 'aurora': {
      const count = 3 + ((hash >>> 5) % 3);
      const bands = Array.from({ length: count }, (_, i) => ({
        x: 10 + i * 22 + ((hash >>> (i * 3)) % 12),
        width: 14 + ((hash >>> (i * 2)) % 16) + faders.heat * 0.06,
        opacity: Number((0.07 + ((hash >>> (i + 4)) % 10) / 100).toFixed(3)),
        skew: (((hash >>> (i * 5)) % 24) - 12) / 2,
      }));
      return { kind, depth, bands };
    }
    case 'horizon':
      return {
        kind,
        depth,
        vanishY: 28 + ((hash >>> 6) % 18),
        rows: 6 + ((hash >>> 3) % 5),
        cols: 8 + ((hash >>> 5) % 6),
        opacity: Number((0.07 + faders.grain * 0.0004).toFixed(3)),
      };
    case 'signal': {
      const count = 2 + ((hash >>> 4) % 3);
      const traces = Array.from({ length: count }, (_, i) => {
        const y = 28 + i * 22 + ((hash >>> (i * 2)) % 8);
        const amp = 4 + ((hash >>> (i + 3)) % 8) + faders.pace * 0.04;
        const pts: string[] = [];
        for (let x = 0; x <= 100; x += 4) {
          const wave =
            Math.sin((x / 100) * Math.PI * (3 + (hash % 4)) + i) * amp +
            Math.sin((x / 100) * Math.PI * 7 + ((hash >>> i) % 5)) * (amp * 0.35);
          pts.push(`${x} ${(y + wave).toFixed(2)}`);
        }
        return {
          d: `M ${pts.join(' L ')}`,
          opacity: Number((0.1 + i * 0.04).toFixed(3)),
          width: Number((0.35 + ((hash >>> i) % 5) * 0.08).toFixed(2)),
        };
      });
      return { kind, depth, traces };
    }
    case 'spires': {
      const count = 7 + ((hash >>> 3) % 8);
      const needles = Array.from({ length: count }, (_, i) => ({
        x: 4 + i * (92 / Math.max(count - 1, 1)) + (((hash >>> i) % 5) - 2),
        height: 18 + ((hash >>> (i * 3)) % 55) + faders.ink * 0.12,
        width: Number((0.35 + ((hash >>> (i + 2)) % 6) * 0.12).toFixed(2)),
        opacity: Number((0.06 + ((hash >>> (i + 4)) % 10) / 100).toFixed(3)),
      }));
      return { kind, depth, needles };
    }
    case 'nova':
      return {
        kind,
        depth,
        cx: 40 + ((hash >>> 5) % 20),
        cy: 32 + ((hash >>> 7) % 24),
        rays: 10 + ((hash >>> 3) % 10),
        opacity: Number((0.07 + faders.heat * 0.0005).toFixed(3)),
        spinSec: Number(clamp(48 - faders.pace * 0.22, 16, 48).toFixed(2)),
      };
    case 'circuit': {
      const count = 4 + ((hash >>> 4) % 5);
      const traces: Array<{ d: string; opacity: number }> = [];
      const nodes: Array<{ x: number; y: number; r: number; opacity: number }> = [];
      for (let i = 0; i < count; i++) {
        const x0 = 8 + ((hash >>> (i * 5)) % 40);
        const y0 = 10 + ((hash >>> (i * 6 + 1)) % 70);
        const x1 = x0 + 12 + ((hash >>> (i * 3)) % 30);
        const y1 = y0 + (((hash >>> (i + 2)) % 2 === 0 ? 1 : -1) * (8 + ((hash >>> i) % 18)));
        const x2 = Math.min(96, x1 + 10 + ((hash >>> (i * 4)) % 22));
        traces.push({
          d: `M ${x0} ${y0} H ${x1} V ${y1} H ${x2}`,
          opacity: Number((0.08 + (i % 3) * 0.03).toFixed(3)),
        });
        nodes.push(
          { x: x0, y: y0, r: 0.7, opacity: 0.18 },
          { x: x1, y: y0, r: 0.55, opacity: 0.14 },
          { x: x1, y: y1, r: 0.55, opacity: 0.14 },
          { x: x2, y: y1, r: 0.7, opacity: 0.16 }
        );
      }
      return { kind, depth, traces, nodes };
    }
    case 'film':
    default:
      return {
        kind: 'film',
        depth,
        side: (['left', 'right', 'both'] as const)[(hash >>> 5) % 3],
        opacity: Number((0.1 + ((hash >>> 8) % 10) / 100).toFixed(3)),
      };
  }
}

function plateSerialFrom(hash: number, family: number): string {
  const a = (family + 10).toString(36).toUpperCase();
  const b = (hash & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const c = ((hash >>> 16) % 100).toString().padStart(2, '0');
  return `${a}-${b}-${c}`;
}

export function pressTokens(config: PressingConfig): PressingTokens {
  const seedText = (config.seedText || DEFAULT_PRESSING.seedText).slice(0, 280);
  const faders = normalizeFaders(config.faders);
  const alive = config.alive !== false;
  const autoDrift = config.autoDrift === true;
  const seedHash = hashSeed(seedText);
  const pressHash = identityHash(seedHash, faders);
  const { totalSyllables, density, words } = syllableStats(seedText);

  const hue = seedHash % 360;
  const hue2 = (hue + 14 + ((pressHash >>> 8) % 22)) % 360;
  const hue3 = (hue + 6 + ((pressHash >>> 12) % 14)) % 360;

  const plateFamily = (pressHash >>> 8) % 8;
  const aperture = ((pressHash >>> 20) % 5) as ApertureMode;
  const cutStyle = ((pressHash >>> 18) % 6) as CutStyle;
  const plateSkew = Number((((pressHash >>> 22) % 25) / 10 - 1.2).toFixed(2));
  const typeVariant = (pressHash >>> 24) % 4;

  const saturation = clamp(32 + faders.heat * 0.5 + (density - 1.6) * 8, 20, 88);
  const bgL = clamp(11 - faders.ink * 0.09, 2, 11);
  const cardL = clamp(bgL + 5, 6, 17);
  const grainOpacity = Number((faders.grain * 0.0024).toFixed(4));
  const motionSec = Math.round(clamp(40 - faders.pace * 0.26, 12, 40));
  const breathSec = breathFromSyllables(totalSyllables, faders.pace);
  const radiusPx = clamp(Math.round(10 + ((pressHash >>> 5) % 10) - (density - 1.2) * 2), 4, 18);

  const kinds = pickLayerKinds(pressHash);
  const layers = kinds.map((kind, i) =>
    buildLayer(kind, seedText, mix(pressHash, i * 7919), words, faders, breathSec, 0.35 + i * 0.22)
  );
  const compositionId = kinds.map((k) => k.slice(0, 2)).join('') + ((pressHash >>> 16) % 100).toString(36);

  return {
    seedHash,
    pressHash,
    hue,
    hue2,
    hue3,
    saturation,
    bgL,
    cardL,
    grainOpacity,
    motionSec,
    breathSec,
    plateFamily,
    compositionId,
    aperture,
    layers,
    cutStyle,
    plateSkew,
    plateSerial: plateSerialFrom(pressHash, plateFamily),
    radiusPx,
    typeVariant,
    alive,
    autoDrift,
    totalSyllables,
    ghostText: seedText.replace(/\s+/g, ' · ').slice(0, 72),
    grooveFamily: plateFamily,
  };
}

export function pressingCssVars(tokens: PressingTokens): Record<string, string> {
  const { hue, hue2, hue3, saturation: s, bgL, cardL } = tokens;
  const accentL = 62;
  return {
    '--ph-hue': String(hue),
    '--ph-hue2': String(hue2),
    '--ph-hue3': String(hue3),
    '--ph-bg': `hsl(${hue} ${Math.round(s * 0.28)}% ${bgL}%)`,
    '--ph-bg2': `hsl(${hue} ${Math.round(s * 0.22)}% ${Math.max(bgL - 1, 1)}%)`,
    '--ph-plate': `hsl(${hue} ${Math.round(s * 0.2)}% ${cardL}% / 0.55)`,
    '--ph-card': `hsl(${hue} ${Math.round(s * 0.2)}% ${cardL}% / 0.55)`,
    '--ph-card-solid': `hsl(${hue} ${Math.round(s * 0.22)}% ${cardL}%)`,
    '--ph-border': `hsl(${hue} ${Math.round(s * 0.4)}% ${accentL}% / 0.32)`,
    '--ph-accent': `hsl(${hue} ${s}% ${accentL}%)`,
    '--ph-accent-soft': `hsl(${hue} ${s}% ${accentL}% / 0.12)`,
    '--ph-accent2': `hsl(${hue2} ${Math.round(s * 0.9)}% ${accentL + 2}%)`,
    '--ph-accent2-soft': `hsl(${hue2} ${Math.round(s * 0.9)}% ${accentL + 2}% / 0.1)`,
    '--ph-text': `hsl(${hue} 10% 97%)`,
    '--ph-muted': `hsl(${hue} 8% 70% / 0.8)`,
    '--ph-grain': String(tokens.grainOpacity),
    '--ph-motion': `${tokens.motionSec}s`,
    '--ph-breath': `${tokens.breathSec}s`,
    '--ph-radius': `${tokens.radiusPx}px`,
    '--ph-skew': `${tokens.plateSkew}deg`,
  };
}

export function pressingTypeClass(typeVariant: number): string {
  switch (typeVariant % 4) {
    case 0:
      return 'font-headline uppercase tracking-tight';
    case 1:
      return 'font-headline uppercase tracking-[0.12em]';
    case 2:
      return 'font-headline tracking-tight';
    default:
      return 'font-headline uppercase tracking-tighter italic';
  }
}

export function apertureMask(mode: ApertureMode, hue: number): string {
  const ink = `hsl(${hue} 18% 3% / 0.94)`;
  switch (mode) {
    case 0:
      return `radial-gradient(ellipse 78% 68% at 50% 36%, transparent 8%, transparent 42%, ${ink} 100%)`;
    case 1:
      return `radial-gradient(ellipse 70% 75% at 42% 40%, transparent 5%, transparent 38%, ${ink} 100%)`;
    case 2:
      return `radial-gradient(ellipse 72% 70% at 58% 34%, transparent 6%, transparent 40%, ${ink} 100%)`;
    case 3:
      return `radial-gradient(ellipse 85% 55% at 50% 30%, transparent 10%, transparent 45%, ${ink} 100%)`;
    default:
      return `radial-gradient(ellipse 65% 80% at 50% 42%, transparent 4%, transparent 36%, ${ink} 100%)`;
  }
}

export function dieCutClip(style: CutStyle): string {
  switch (style) {
    case 0:
      return 'polygon(0 12px, 12px 12px, 12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)';
    case 1:
      return 'polygon(0 0, 18% 0, 22% 8px, 78% 8px, 82% 0, 100% 0, 100% 100%, 0 100%)';
    case 2:
      return 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)';
    case 3:
      return 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 72%, 10px 68%, 10px 32%, 0 28%)';
    case 4:
      return 'polygon(8px 0, calc(100% - 8px) 0, 100% 14%, 100% 86%, calc(100% - 8px) 100%, 8px 100%, 0 86%, 0 14%)';
    default:
      return 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 14px 88%, 0 84%, 0 72%, 14px 68%, 14px 38%, 0 34%, 0 22%, 14px 18%)';
  }
}

export function normalizePressingConfig(raw: unknown): PressingConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<PressingConfig>;
  const seedText =
    typeof obj.seedText === 'string' && obj.seedText.trim()
      ? obj.seedText.trim().slice(0, 280)
      : DEFAULT_PRESSING.seedText;
  return {
    seedText,
    faders: normalizeFaders(obj.faders),
    alive: obj.alive !== false,
    autoDrift: obj.autoDrift === true,
  };
}
