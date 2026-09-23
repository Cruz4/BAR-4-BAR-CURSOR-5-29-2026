import type { CompiledRenderRecipe } from '@/lib/song-generation/types';

const SAMPLE_RATE = 22_050;
export const SHEET_PREVIEW_MAX_SEC = 36;
export const SHEET_PREVIEW_MIME = 'audio/wav';
export const SHEET_PREVIEW_MODEL = 'akasheet-sheet-preview';
export const SHEET_PREVIEW_REVISION = '2026.09.20.dark';

const KEY_ROOT: Record<string, number> = {
  C: 130.81,
  D: 146.83,
  E: 164.81,
  F: 174.61,
  G: 196.0,
  A: 220.0,
  B: 246.94,
};

function hash32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseRootHz(musicalKey?: string): number {
  const letter = (musicalKey || 'A').trim().charAt(0).toUpperCase();
  return KEY_ROOT[letter] ?? 220;
}

/** Natural minor — low, not major-pentatonic toy. */
function minorScale(root: number): number[] {
  return [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 16 / 9].map((r) => root * r);
}

function encodeWav(samples: Float32Array): Buffer {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clipped * 32767), 44 + i * 2);
  }
  return buf;
}

function lyricTokens(lyrics: string): string[] {
  return lyrics
    .replace(/\[[^\]]*]/g, ' ')
    .split(/[^A-Za-z0-9']+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
}

function noise(rand: () => number) {
  return rand() * 2 - 1;
}

/** Darker studio sketch from lyrics/BPM — 808 + sparse minor line, no toy horns. */
export function synthesizeSheetPreview(
  recipe: Pick<
    CompiledRenderRecipe,
    'lyricsText' | 'bpm' | 'musicalKey' | 'seed' | 'durationSec' | 'workKind' | 'caption'
  >
): { wav: Buffer; durationSec: number } {
  const bpm = Math.max(72, Math.min(108, recipe.bpm ?? 88));
  const durationSec = Math.min(
    SHEET_PREVIEW_MAX_SEC,
    Math.max(28, Math.round((recipe.durationSec || 36) * 0.15) || 36)
  );
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const samples = new Float32Array(n);
  const seed =
    typeof recipe.seed === 'number'
      ? recipe.seed
      : hash32(`${recipe.lyricsText}|${recipe.caption || ''}|${recipe.musicalKey || ''}`);
  const rand = mulberry32(seed);
  const scale = minorScale(parseRootHz(recipe.musicalKey));
  const beat = 60 / bpm;
  const tokens = lyricTokens(recipe.lyricsText || recipe.caption || 'vault');
  const vocal = recipe.workKind !== 'instrumental';

  let kickPhaseAcc = 0;
  let snarePhaseAcc = 0;

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    const beatInBar = (t / beat) % 4;
    const bar = Math.floor(t / (beat * 4));

    let kick = 0;
    const onKick = beatInBar < 0.18 || (beatInBar >= 2.5 && beatInBar < 2.62);
    if (onKick) {
      kickPhaseAcc += (55 + (1 - (beatInBar % 1)) * 70) / SAMPLE_RATE;
      const env = Math.exp(-((beatInBar % 1) * 28));
      kick = Math.sin(2 * Math.PI * kickPhaseAcc) * env * 0.7;
    } else {
      kickPhaseAcc = 0;
    }

    let snare = 0;
    if (beatInBar >= 1.98 && beatInBar < 2.16) {
      snarePhaseAcc += 180 / SAMPLE_RATE;
      const env = Math.exp(-(beatInBar - 2) * 22);
      snare = (Math.sin(2 * Math.PI * snarePhaseAcc) * 0.15 + noise(rand) * 0.12) * env;
    } else {
      snarePhaseAcc = 0;
    }

    const hat =
      beatInBar % 1 < 0.04 && Math.floor(t / (beat * 0.5)) % 2 === 1
        ? noise(rand) * 0.035 * Math.exp(-(beatInBar % 1) * 40)
        : 0;

    const root = scale[bar % 4 === 3 ? 4 : 0];
    const fifth = scale[4];
    const pad =
      (Math.sin(2 * Math.PI * (root / 2) * t) * 0.16 + Math.sin(2 * Math.PI * (fifth / 2) * t) * 0.08) *
      (0.72 + 0.18 * Math.sin(2 * Math.PI * t * 0.15));

    const sub = Math.sin(2 * Math.PI * (root / 4) * t) * 0.28 * (kick > 0.05 ? 0.55 : 1);

    let lead = 0;
    if (vocal && tokens.length && bar % 2 === 1) {
      const tokenIndex = Math.floor(t / (beat * 2)) % tokens.length;
      const word = tokens[tokenIndex];
      const degree = (word.charCodeAt(0) + word.length) % 5;
      const hz = scale[degree];
      const local = (t / (beat * 2)) % 1;
      if (local > 0.08 && local < 0.72) {
        const env = Math.min(1, (local - 0.08) * 8) * Math.min(1, (0.72 - local) * 5);
        lead = Math.sin(2 * Math.PI * hz * t) * 0.09 * env;
      }
    }

    const master = kick * 0.9 + snare * 0.7 + hat + pad + sub + lead;
    samples[i] = Math.tanh(master * 0.95) * 0.92;
  }

  return { wav: encodeWav(samples), durationSec };
}
