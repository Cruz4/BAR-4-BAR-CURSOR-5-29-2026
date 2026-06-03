import type { Bar, LineSource, TrackSection } from '@/lib/types';

export type { LineSource };

export type LineBaselineEntry = {
  hasText: boolean;
  source?: LineSource | 'legacy';
};

export function lineBaselineKey(sectionId: string, idx: number): string {
  return `${sectionId}:${idx}`;
}

export function buildLineBaseline(sections: TrackSection[] | undefined): Record<string, LineBaselineEntry> {
  const map: Record<string, LineBaselineEntry> = {};
  if (!sections?.length) return map;
  for (const section of sections) {
    for (const bar of section.bars || []) {
      const hasText = String(bar.text || '').trim().length > 0;
      const source: LineBaselineEntry['source'] = bar.lineSource
        ? bar.lineSource
        : hasText
          ? 'legacy'
          : undefined;
      map[lineBaselineKey(section.id, bar.idx)] = { hasText, source };
    }
  }
  return map;
}

export function resolveLineSource(bar: Pick<Bar, 'lineSource' | 'text'>): LineSource | undefined {
  if (bar.lineSource) return bar.lineSource;
  return String(bar.text || '').trim().length > 0 ? undefined : undefined;
}

export function withLineSource<T extends Bar>(bar: T, source: LineSource): T {
  return { ...bar, lineSource: source };
}

export type LineCreditDeltas = {
  writtenLines: number;
  generatedLines: number;
};

/**
 * Counts newly credited lines since the last baseline snapshot.
 * Legacy lines (pre-attribution) are not re-counted until the user edits or adds tagged lines.
 */
export function computeLineCreditDeltas(
  prev: Record<string, LineBaselineEntry>,
  sections: TrackSection[] | undefined
): LineCreditDeltas {
  let writtenLines = 0;
  let generatedLines = 0;
  if (!sections?.length) return { writtenLines, generatedLines };

  for (const section of sections) {
    for (const bar of section.bars || []) {
      const key = lineBaselineKey(section.id, bar.idx);
      const hasText = String(bar.text || '').trim().length > 0;
      if (!hasText) continue;

      const prevEntry = prev[key];
      const source = bar.lineSource;

      if (!prevEntry?.hasText) {
        if (source === 'generated') generatedLines += 1;
        else if (source === 'written') writtenLines += 1;
        continue;
      }

      if (
        prevEntry.source === 'generated' &&
        source === 'written' &&
        prevEntry.hasText
      ) {
        writtenLines += 1;
      }
    }
  }

  return { writtenLines, generatedLines };
}

export function countLinesWithSource(
  sections: TrackSection[] | undefined,
  source: LineSource
): number {
  if (!sections?.length) return 0;
  return sections.reduce((acc, section) => {
    const n =
      section.bars?.filter(
        (b) => b.lineSource === source && String(b.text || '').trim().length > 0
      ).length || 0;
    return acc + n;
  }, 0);
}
