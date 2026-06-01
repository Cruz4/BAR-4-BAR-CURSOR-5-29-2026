import type { TrackSection } from '@/lib/types';

/** One rhyme bar = two lines on the sheet (couplet). */
export const LINES_PER_RHYME_BAR = 2;

export function countNonEmptyLines(sections: TrackSection[] | undefined): number {
  if (!sections?.length) return 0;
  return sections.reduce((acc, s) => {
    return acc + (s.bars?.filter((b) => String(b.text || '').trim().length > 0).length || 0);
  }, 0);
}

export function linesToRhymeBars(lineCount: number): number {
  return Math.floor(Math.max(0, lineCount) / LINES_PER_RHYME_BAR);
}

export function rhymeBarsToLines(barCount: number): number {
  return Math.max(0, barCount) * LINES_PER_RHYME_BAR;
}

export function countRhymeBars(sections: TrackSection[] | undefined): number {
  return linesToRhymeBars(countNonEmptyLines(sections));
}
