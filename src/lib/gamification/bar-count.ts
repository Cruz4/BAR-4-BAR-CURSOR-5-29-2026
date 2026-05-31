import type { TrackSection } from '@/lib/types';

export function countNonEmptyBars(sections: TrackSection[] | undefined): number {
  if (!sections?.length) return 0;
  return sections.reduce((acc, s) => {
    return acc + (s.bars?.filter((b) => String(b.text || '').trim().length > 0).length || 0);
  }, 0);
}
