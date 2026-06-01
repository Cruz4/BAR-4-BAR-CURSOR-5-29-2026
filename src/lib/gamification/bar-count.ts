import type { TrackSection } from '@/lib/types';
import { countNonEmptyLines } from '@/lib/lyrics-units';

/** @deprecated Use countNonEmptyLines — counts lyric rows (lines), not rhyme bars. */
export function countNonEmptyBars(sections: TrackSection[] | undefined): number {
  return countNonEmptyLines(sections);
}

export { countNonEmptyLines, countRhymeBars, linesToRhymeBars, rhymeBarsToLines } from '@/lib/lyrics-units';
