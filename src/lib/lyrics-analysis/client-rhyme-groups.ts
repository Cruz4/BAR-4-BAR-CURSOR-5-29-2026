/**
 * Client-side rhyme groups for HighlightedText — Ink-free.
 * Used by the landing demo sheet and guest try-sheet auto Rhyme Pulse.
 */

import {
  lineEndWord,
  nearRhymeScore,
  NEAR_RHYME_THRESHOLD,
  rhymeKey,
} from '@/lib/lyrics-analysis';

export type ClientRhymeGroup = { words: string[] };

/** Build app-style rhymeGroups from end-words across sheet lines. */
export function buildClientRhymeGroups(lines: string[]): ClientRhymeGroup[] {
  const ends = lines
    .map((line) => lineEndWord(line))
    .filter((w): w is string => !!w && w.length > 0);
  if (ends.length < 2) return [];

  const parent = ends.map((_, i) => i);
  const find = (i: number): number => {
    let cur = i;
    while (parent[cur] !== cur) cur = parent[cur];
    return cur;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const a = ends[i];
      const b = ends[j];
      if (a.toLowerCase() === b.toLowerCase()) {
        union(i, j);
        continue;
      }
      const ka = rhymeKey(a);
      const kb = rhymeKey(b);
      if (ka !== '?' && kb !== '?' && ka === kb) {
        union(i, j);
        continue;
      }
      if (nearRhymeScore(a, b) >= NEAR_RHYME_THRESHOLD) {
        union(i, j);
      }
    }
  }

  const buckets = new Map<number, Set<string>>();
  ends.forEach((word, i) => {
    const root = find(i);
    if (!buckets.has(root)) buckets.set(root, new Set());
    buckets.get(root)!.add(word.toLowerCase());
  });

  return Array.from(buckets.values())
    .map((set) => ({ words: Array.from(set) }))
    .filter((g) => g.words.length >= 2);
}
