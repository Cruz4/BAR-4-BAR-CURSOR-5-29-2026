/**
 * Line-length comparison: syllables per line vs the section median,
 * flagging outliers that will feel too long or too short in the pocket.
 */

import { countLineSyllables } from './syllables';

export type LineLengthReport = {
  lineIndex: number;
  text: string;
  syllables: number;
  /** Signed difference from the section median. */
  deltaFromMedian: number;
  flag: 'ok' | 'short' | 'long';
};

export type LineLengthOptions = {
  /** Allowed deviation from the median before flagging (default 3 syllables). */
  tolerance?: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compare each line's syllable count to the group median. */
export function compareLineLengths(lines: string[], options: LineLengthOptions = {}): LineLengthReport[] {
  const { tolerance = 3 } = options;
  const counts = lines.map(countLineSyllables);
  const nonEmpty = counts.filter((c) => c > 0);
  const med = median(nonEmpty);

  return lines.map((text, lineIndex) => {
    const syllables = counts[lineIndex];
    const delta = syllables - med;
    let flag: LineLengthReport['flag'] = 'ok';
    if (syllables > 0 && med > 0) {
      if (delta > tolerance) flag = 'long';
      else if (delta < -tolerance) flag = 'short';
    }
    return { lineIndex, text, syllables, deltaFromMedian: delta, flag };
  });
}
