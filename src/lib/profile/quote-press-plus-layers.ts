import type { QuotePressFaders } from '@/lib/profile/quote-press';

export const PLUS_LAYER_KINDS = [
  'conicSweep',
  'bokehOrbs',
  'ribbonSweep',
  'glassShard',
  'inkRipple',
  'tapeStrip',
  'halftoneBloom',
  'signalNoise',
  'flareCross',
  'softBloom',
  'twinLeak',
  'gradientMesh',
  'filmGate',
  'scanSweep',
  'foilBand',
  'dotMatrix',
  'waxSeal',
  'refraction',
  'slowShimmer',
  'edgeGlow',
  'depthFog',
  'prismRing',
  'slideSheen',
  'staticRain',
  'ghostLines',
  'liquidMetal',
  'sunRays',
  'moonArc',
  'vinylSpin',
  'threadWeave',
  'pixelDust',
  'chromaPulse',
] as const;

export type QuotePressPlusLayerKind = (typeof PLUS_LAYER_KINDS)[number];

export type QuotePressPlusLayer = {
  kind: QuotePressPlusLayerKind;
  depth: number;
  color: string;
  accent: string;
  durationSec: number;
  variant: number;
};

const PLUS_KIND_SET = new Set<string>(PLUS_LAYER_KINDS);

export function isPlusLayerKind(kind: string): kind is QuotePressPlusLayerKind {
  return PLUS_KIND_SET.has(kind);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;
}

export function buildPlusLayer(
  kind: QuotePressPlusLayerKind,
  hash: number,
  faders: QuotePressFaders,
  hue: number,
  depth: number
): QuotePressPlusLayer {
  const sat = 42 + faders.heat * 0.38;
  const color = hsl(hue, sat, 58 + faders.heat * 0.12);
  const accent = hsl((hue + 48) % 360, sat * 0.85, 68, 0.55);
  const durationSec = clamp(9 - faders.pace * 0.055, 3.5, 18);
  const variant = hash % 4;
  return { kind, depth, color, accent, durationSec, variant };
}
