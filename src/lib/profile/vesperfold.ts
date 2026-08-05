/**
 * Vesperfold Mark — generative feed-star identity.
 *
 * Each seed unpacks a deep fold stack so neighboring seeds look unrelated:
 * silhouette grammar, tip count, lacquer chemistry, underink bloom, filament
 * braid, ember core, halo orbit, grain lattice, prism shear, notch meter,
 * void cut, and spine warp.
 *
 * Combinatorial space ≈ 54.2M. Used for round feed avatars, never
 * as the Artist Home hero photo.
 */

export const VESPERFOLD_SLOT_LIMIT = 5;

export const VESPERFOLD_AXES = {
  fold: 8,
  lean: 4,
  lacquer: 10,
  underink: 8,
  filament: 7,
  ember: 7,
  halo: 6,
  grain: 6,
  prism: 4,
  notch: 3,
} as const;

export const VESPERFOLD_SPACE =
  VESPERFOLD_AXES.fold *
  VESPERFOLD_AXES.lean *
  VESPERFOLD_AXES.lacquer *
  VESPERFOLD_AXES.underink *
  VESPERFOLD_AXES.filament *
  VESPERFOLD_AXES.ember *
  VESPERFOLD_AXES.halo *
  VESPERFOLD_AXES.grain *
  VESPERFOLD_AXES.prism *
  VESPERFOLD_AXES.notch;

export type VesperfoldSlot = {
  id: string;
  seed: number;
  lockedAt: string;
  label: string;
};

export type VesperfoldStack = {
  seed: number;
  fold: number;
  lean: number;
  lacquer: number;
  underink: number;
  filament: number;
  ember: number;
  halo: number;
  grain: number;
  prism: number;
  notch: number;
  /** Derived silhouette grammar 0–7 (from fold + seed hash). */
  grammar: number;
  /** Tip count 4–9. */
  tips: number;
  label: string;
};

const FOLD_NAMES = [
  'Cuspfold',
  'Ribfold',
  'Spirefold',
  'Cove-fold',
  'Knotfold',
  'Shearfold',
  'Plaitfold',
  'Riftfold',
] as const;

const LACQUER_NAMES = [
  'Verdant',
  'Auroral',
  'Cinder',
  'Ultramarine',
  'Amethyst',
  'Brass',
  'Ivory',
  'Obsidian',
  'Coral',
  'Teal',
] as const;

const GRAMMAR_NAMES = [
  'Needle',
  'Crown',
  'Saw',
  'Lotus',
  'Blade',
  'Comet',
  'Lattice',
  'Hollow',
] as const;

/** High-contrast lacquer chemistries: [void, plate, rim, hot, cold] */
const LACQUER_PALETTES: Array<[string, string, string, string, string]> = [
  ['#031510', '#0d9488', '#5eead4', '#f0fdf4', '#14532d'],
  ['#0c0618', '#7c3aed', '#e879f9', '#faf5ff', '#1e1b4b'],
  ['#1a0505', '#ea580c', '#fbbf24', '#fff7ed', '#7f1d1d'],
  ['#020617', '#2563eb', '#22d3ee', '#eff6ff', '#1e3a8a'],
  ['#1a0533', '#c026d3', '#f472b6', '#fdf4ff', '#4a044e'],
  ['#1c1005', '#ca8a04', '#fde047', '#fffbeb', '#713f12'],
  ['#0a0a0a', '#a3a3a3', '#fafafa', '#ffffff', '#404040'],
  ['#000000', '#525252', '#e5e5e5', '#f97316', '#171717'],
  ['#2a0210', '#e11d48', '#fb7185', '#fff1f2', '#881337'],
  ['#021c1b', '#14b8a6', '#a3e635', '#ecfccb', '#134e4a'],
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeVesperfoldSeed(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.floor(Math.abs(n)) % VESPERFOLD_SPACE;
}

export function randomVesperfoldSeed(exclude?: number): number {
  let next = Math.floor(Math.random() * VESPERFOLD_SPACE);
  if (exclude != null && VESPERFOLD_SPACE > 1) {
    let guard = 0;
    while (next === normalizeVesperfoldSeed(exclude) && guard++ < 12) {
      next = Math.floor(Math.random() * VESPERFOLD_SPACE);
    }
  }
  return next;
}

export function unpackVesperfold(seedInput: number): VesperfoldStack {
  let x = normalizeVesperfoldSeed(seedInput);
  const notch = x % VESPERFOLD_AXES.notch;
  x = Math.floor(x / VESPERFOLD_AXES.notch);
  const prism = x % VESPERFOLD_AXES.prism;
  x = Math.floor(x / VESPERFOLD_AXES.prism);
  const grain = x % VESPERFOLD_AXES.grain;
  x = Math.floor(x / VESPERFOLD_AXES.grain);
  const halo = x % VESPERFOLD_AXES.halo;
  x = Math.floor(x / VESPERFOLD_AXES.halo);
  const ember = x % VESPERFOLD_AXES.ember;
  x = Math.floor(x / VESPERFOLD_AXES.ember);
  const filament = x % VESPERFOLD_AXES.filament;
  x = Math.floor(x / VESPERFOLD_AXES.filament);
  const underink = x % VESPERFOLD_AXES.underink;
  x = Math.floor(x / VESPERFOLD_AXES.underink);
  const lacquer = x % VESPERFOLD_AXES.lacquer;
  x = Math.floor(x / VESPERFOLD_AXES.lacquer);
  const lean = x % VESPERFOLD_AXES.lean;
  x = Math.floor(x / VESPERFOLD_AXES.lean);
  const fold = x % VESPERFOLD_AXES.fold;
  const seed = normalizeVesperfoldSeed(seedInput);
  const grammar = (fold + ((seed * 2654435761) >>> 0) % 5) % 8;
  const tips = 4 + ((seed + fold * 3 + lean * 5) % 6); // 4–9
  return {
    seed,
    fold,
    lean,
    lacquer,
    underink,
    filament,
    ember,
    halo,
    grain,
    prism,
    notch,
    grammar,
    tips,
    label: `${GRAMMAR_NAMES[grammar]} · ${FOLD_NAMES[fold]} · ${LACQUER_NAMES[lacquer]}`,
  };
}

type Pt = { x: number; y: number };

function starRing(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  tips: number,
  lean: number,
  rot: number,
  grammar: number,
  rng: () => number
): Pt[] {
  const pts: Pt[] = [];
  const leanRad = ((lean - 1.5) * 11 * Math.PI) / 180;
  for (let i = 0; i < tips * 2; i++) {
    const tip = i % 2 === 0;
    let r = tip ? outer : inner;
    // Grammar warps radius rhythm so silhouettes diverge hard.
    if (grammar === 0 && tip) r *= 1.12 + (i % 4) * 0.04; // Needle — long spikes
    if (grammar === 1 && !tip) r *= 0.55; // Crown — deep valleys
    if (grammar === 2) r *= tip ? 1.05 + (i % 3) * 0.08 : 0.7 + rng() * 0.15; // Saw
    if (grammar === 3 && tip) r *= 0.88 + Math.sin(i) * 0.08; // Lotus — softer tips
    if (grammar === 4 && tip) r *= i % 4 === 0 ? 1.22 : 0.95; // Blade — uneven
    if (grammar === 5) r *= tip ? 1.1 : 0.42 + lean * 0.04; // Comet — skinny waist
    if (grammar === 6 && !tip) r *= 0.85 + (i % 5) * 0.03; // Lattice
    if (grammar === 7 && tip) r *= 0.92; // Hollow — shorter tips (void core later)
    const a =
      -Math.PI / 2 +
      (i * Math.PI) / tips +
      rot +
      (tip ? leanRad * (grammar === 4 ? 1.4 : 1) : -leanRad * 0.5);
    const wobble = grammar === 2 || grammar === 6 ? (rng() - 0.5) * outer * 0.04 : 0;
    pts.push({ x: cx + Math.cos(a) * r + wobble, y: cy + Math.sin(a) * r + wobble });
  }
  return pts;
}

function ptsAttr(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/** Full SVG markup for a Vesperfold mark (safe to inline). */
export function renderVesperfoldSvg(seedInput: number, size = 128): string {
  const stack = unpackVesperfold(seedInput);
  const rng = mulberry32((stack.seed * 2654435761 + stack.grammar * 97) >>> 0);
  const [voidC, plate, rim, hot, cold] = LACQUER_PALETTES[stack.lacquer]!;
  const uid = `vf${stack.seed.toString(36)}`;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * (0.36 + stack.fold * 0.012 + (stack.grammar % 3) * 0.015);
  const innerRatio =
    stack.grammar === 5 ? 0.28 : stack.grammar === 1 ? 0.32 : 0.36 + stack.underink * 0.03;
  const inner = outer * innerRatio;
  const rot = ((stack.prism * 17 + stack.lean * 9 + stack.grammar * 11) * Math.PI) / 180;
  const main = starRing(cx, cy, outer, inner, stack.tips, stack.lean, rot, stack.grammar, rng);
  const shear = starRing(
    cx,
    cy,
    outer * (0.78 + stack.prism * 0.04),
    inner * 1.15,
    stack.tips,
    stack.lean,
    rot + (stack.prism - 1.5) * 0.14,
    (stack.grammar + 2) % 8,
    rng
  );
  const core = starRing(
    cx,
    cy,
    outer * (0.22 + stack.ember * 0.02),
    inner * 0.45,
    Math.max(4, stack.tips - 1),
    stack.lean,
    rot + 0.35,
    stack.grammar,
    rng
  );

  const haloRings: string[] = [];
  const haloCount = 1 + (stack.halo % 4);
  for (let h = 0; h < haloCount; h++) {
    const r = outer * (1.02 + h * 0.1 + stack.halo * 0.015);
    const dash =
      stack.grammar === 6
        ? `${2 + stack.halo},${6 + stack.filament}`
        : `${5 + stack.halo * 2},${2 + (stack.filament % 3)}`;
    haloRings.push(
      `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="${h % 2 ? hot : rim}" stroke-opacity="${(0.2 + h * 0.14).toFixed(2)}" stroke-width="${(size * (0.01 + stack.filament * 0.002)).toFixed(2)}" stroke-dasharray="${dash}" transform="rotate(${(stack.halo * 19 + h * 28).toFixed(1)} ${cx} ${cy})" />`
    );
  }

  const blooms: string[] = [];
  const bloomN = 2 + (stack.underink % 5);
  for (let i = 0; i < bloomN; i++) {
    const a = -Math.PI / 2 + (i / bloomN) * Math.PI * 2 + rot + rng() * 0.4;
    const br = outer * (0.12 + rng() * 0.42);
    const bx = cx + Math.cos(a) * outer * (0.2 + rng() * 0.35);
    const by = cy + Math.sin(a) * outer * (0.2 + rng() * 0.35);
    blooms.push(
      `<circle cx="${bx.toFixed(2)}" cy="${by.toFixed(2)}" r="${br.toFixed(2)}" fill="${i % 2 ? hot : cold}" fill-opacity="${(0.14 + rng() * 0.28).toFixed(2)}" />`
    );
  }

  const filaments: string[] = [];
  for (let i = 0; i < stack.tips; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / stack.tips + rot;
    const a1 = a0 + Math.PI / stack.tips;
    const x0 = cx + Math.cos(a0) * outer * 0.97;
    const y0 = cy + Math.sin(a0) * outer * 0.97;
    const x1 = cx + Math.cos(a1) * inner * 1.05;
    const y1 = cy + Math.sin(a1) * inner * 1.05;
    const pull = 6 + stack.filament * 2.2 + (stack.grammar === 0 ? 8 : 0);
    const mx = (x0 + x1) / 2 + Math.cos(a0 + 0.7) * pull;
    const my = (y0 + y1) / 2 + Math.sin(a0 + 0.7) * pull;
    filaments.push(
      `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${hot}" stroke-opacity="${(0.55 + stack.filament * 0.05).toFixed(2)}" stroke-width="${(1.1 + stack.filament * 0.28).toFixed(2)}" stroke-linecap="round" />`
    );
    if (stack.filament > 3) {
      filaments.push(
        `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} Q${(mx - 3).toFixed(2)} ${(my + 3).toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${cold}" stroke-opacity="0.35" stroke-width="0.8" />`
      );
    }
  }

  const grains: string[] = [];
  const grainCount = 12 + stack.grain * 5 + stack.grammar * 2;
  for (let i = 0; i < grainCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = outer * (0.1 + rng() * 0.82);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const len = 1.2 + stack.grain * 0.55 + rng() * 2;
    const ang = a * 57.3 + stack.grain * 12;
    grains.push(
      `<line x1="${(x - len).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(x + len).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${i % 2 ? hot : rim}" stroke-opacity="${(0.25 + rng() * 0.4).toFixed(2)}" stroke-width="${(0.6 + rng()).toFixed(2)}" transform="rotate(${ang.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})" />`
    );
  }

  const notches: string[] = [];
  for (let i = 0; i < stack.tips; i++) {
    if ((i + stack.notch) % (stack.notch + 1) !== 0) continue;
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / stack.tips + rot;
    const x0 = cx + Math.cos(a) * outer * 1.01;
    const y0 = cy + Math.sin(a) * outer * 1.01;
    const x1 = cx + Math.cos(a) * outer * (1.14 + stack.notch * 0.03);
    const y1 = cy + Math.sin(a) * outer * (1.14 + stack.notch * 0.03);
    notches.push(
      `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="${hot}" stroke-opacity="0.95" stroke-width="${(1.6 + stack.notch * 0.35).toFixed(2)}" stroke-linecap="round" />`
    );
  }

  // Void cut — hollow / lattice grammars punch a second silhouette
  const voidPoly =
    stack.grammar === 7 || stack.grammar === 6
      ? starRing(
          cx,
          cy,
          outer * (0.34 + stack.underink * 0.02),
          inner * 0.5,
          Math.max(3, stack.tips - 2),
          stack.lean,
          rot + 0.5,
          stack.grammar,
          rng
        )
      : null;

  const emberR = outer * (0.06 + stack.ember * 0.018);
  const plateOpacity = stack.grammar === 7 ? 0.82 : 0.98;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Vesperfold ${stack.label}">
  <defs>
    <linearGradient id="${uid}-plate" x1="15%" y1="10%" x2="90%" y2="95%">
      <stop offset="0%" stop-color="${hot}"/>
      <stop offset="40%" stop-color="${plate}"/>
      <stop offset="100%" stop-color="${voidC}"/>
    </linearGradient>
    <radialGradient id="${uid}-ember" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="${hot}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${plate}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${uid}-clip"><polygon points="${ptsAttr(main)}"/></clipPath>
    <filter id="${uid}-soft" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="${(size * 0.018).toFixed(2)}"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="${voidC}" opacity="0.35"/>
  <g opacity="0.95">${haloRings.join('')}</g>
  <g clip-path="url(#${uid}-clip)" filter="url(#${uid}-soft)">${blooms.join('')}</g>
  <polygon points="${ptsAttr(main)}" fill="url(#${uid}-plate)" fill-opacity="${plateOpacity}" stroke="${rim}" stroke-width="${(size * (0.02 + stack.filament * 0.002)).toFixed(2)}" />
  <polygon points="${ptsAttr(shear)}" fill="${cold}" fill-opacity="${(0.1 + stack.prism * 0.06).toFixed(2)}" stroke="${hot}" stroke-opacity="0.45" stroke-width="1" />
  <g opacity="0.9">${filaments.join('')}</g>
  <g clip-path="url(#${uid}-clip)">${grains.join('')}</g>
  <polygon points="${ptsAttr(core)}" fill="${voidC}" fill-opacity="0.65" stroke="${hot}" stroke-width="1.2" />
  ${
    voidPoly
      ? `<polygon points="${ptsAttr(voidPoly)}" fill="${voidC}" fill-opacity="0.92" stroke="${rim}" stroke-width="0.8" />`
      : ''
  }
  <circle cx="${cx}" cy="${cy}" r="${emberR.toFixed(2)}" fill="url(#${uid}-ember)" />
  <g>${notches.join('')}</g>
</svg>`;
}

export function vesperfoldDataUrl(seed: number, size = 128): string {
  const svg = renderVesperfoldSvg(seed, size);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function sanitizeVesperfoldSlots(raw: unknown): VesperfoldSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: VesperfoldSlot[] = [];
  const seen = new Set<number>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const seed = normalizeVesperfoldSeed(r.seed);
    if (seen.has(seed)) continue;
    seen.add(seed);
    const stack = unpackVesperfold(seed);
    out.push({
      id: typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 40) : `vf-${seed}`,
      seed,
      lockedAt:
        typeof r.lockedAt === 'string' && r.lockedAt.trim()
          ? r.lockedAt
          : new Date().toISOString(),
      label:
        typeof r.label === 'string' && r.label.trim()
          ? r.label.trim().slice(0, 64)
          : stack.label,
    });
    if (out.length >= VESPERFOLD_SLOT_LIMIT) break;
  }
  return out;
}
