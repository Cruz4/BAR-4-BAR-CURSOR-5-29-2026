/**
 * BPM-based timing estimates.
 *
 * Assumes 4/4 time: one musical bar = 4 beats. In this app one lyric line
 * typically rides one musical bar (two lyric lines = one "rhyme bar" couplet).
 * Comfortable rap delivery lands around 2-3 syllables per beat; beyond ~4.5
 * the line is hard to deliver, below ~1 it drags.
 */

import { countLineSyllables } from './syllables';

export const BEATS_PER_MUSICAL_BAR = 4;

/** Comfortable syllables-per-beat band for a standard flow. */
export const COMFORT_MIN_SYLLABLES_PER_BEAT = 1;
export const COMFORT_MAX_SYLLABLES_PER_BEAT = 4.5;

export type LineTimingEstimate = {
  lineIndex: number;
  text: string;
  syllables: number;
  /** Seconds one musical bar lasts at this BPM. */
  barDurationSec: number;
  /** Estimated seconds to deliver the line at ~1 syllable per half-beat cap. */
  estimatedDurationSec: number;
  syllablesPerBeat: number;
  density: 'sparse' | 'comfortable' | 'dense' | 'overloaded';
};

export function beatDurationSec(tempoBPM: number): number {
  const bpm = clampBpm(tempoBPM);
  return 60 / bpm;
}

export function barDurationSec(tempoBPM: number): number {
  return beatDurationSec(tempoBPM) * BEATS_PER_MUSICAL_BAR;
}

function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return 90;
  return Math.min(300, Math.max(30, bpm));
}

/** Timing estimate for one lyric line assumed to ride one 4/4 musical bar. */
export function estimateLineTiming(text: string, tempoBPM: number, lineIndex = 0): LineTimingEstimate {
  const syllables = countLineSyllables(text);
  const barSec = barDurationSec(tempoBPM);
  const perBeat = syllables / BEATS_PER_MUSICAL_BAR;

  let density: LineTimingEstimate['density'];
  if (syllables === 0 || perBeat < COMFORT_MIN_SYLLABLES_PER_BEAT) density = 'sparse';
  else if (perBeat <= 3) density = 'comfortable';
  else if (perBeat <= COMFORT_MAX_SYLLABLES_PER_BEAT) density = 'dense';
  else density = 'overloaded';

  // Delivery estimate: ~2 syllables per beat conversational flow, at minimum
  // the syllables must fit; can't be faster than the bar allows.
  const estimatedDurationSec = Math.min(barSec, (syllables / 2) * beatDurationSec(tempoBPM));

  return {
    lineIndex,
    text,
    syllables,
    barDurationSec: barSec,
    estimatedDurationSec,
    syllablesPerBeat: perBeat,
    density,
  };
}

/** Timing estimates for a set of lines plus a total runtime estimate. */
export function estimateSectionTiming(lines: string[], tempoBPM: number): {
  lines: LineTimingEstimate[];
  totalSec: number;
} {
  const estimates = lines.map((text, i) => estimateLineTiming(text, tempoBPM, i));
  const nonEmpty = estimates.filter((e) => e.syllables > 0).length;
  return { lines: estimates, totalSec: nonEmpty * barDurationSec(tempoBPM) };
}
