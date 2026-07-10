/**
 * Similarity of a new bar to earlier bars: token Jaccard blended with
 * normalized edit distance over word sequences. Used to catch the AI (or the
 * writer) recycling a line that already exists on the sheet.
 */

import { tokenizeLine } from './phonetics';

export type SimilarBar = {
  lineIndex: number;
  text: string;
  /** 0..1 — 1 means effectively the same line. */
  score: number;
};

export const DUPLICATE_THRESHOLD = 0.8;

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  return intersection / (setA.size + setB.size - intersection);
}

/** Levenshtein distance over token arrays (word-level, not character-level). */
function tokenEditDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array<number>(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

/** 0..1 similarity between two lyric lines. */
export function lineSimilarity(lineA: string, lineB: string): number {
  const a = tokenizeLine(lineA);
  const b = tokenizeLine(lineB);
  if (a.length === 0 || b.length === 0) return 0;

  const jac = jaccard(a, b);
  const editSim = 1 - tokenEditDistance(a, b) / Math.max(a.length, b.length);
  return 0.5 * jac + 0.5 * Math.max(0, editSim);
}

/**
 * Compare a candidate line to earlier bars; returns the nearest earlier bar
 * and all bars above `threshold`, sorted by score descending.
 */
export function findSimilarBars(
  candidate: string,
  earlierLines: string[],
  threshold = 0.5
): { nearest: SimilarBar | null; matches: SimilarBar[] } {
  let nearest: SimilarBar | null = null;
  const matches: SimilarBar[] = [];

  earlierLines.forEach((text, lineIndex) => {
    if (!text.trim()) return;
    const score = lineSimilarity(candidate, text);
    const entry = { lineIndex, text, score };
    if (!nearest || score > nearest.score) nearest = entry;
    if (score >= threshold) matches.push(entry);
  });

  return { nearest, matches: matches.sort((a, b) => b.score - a.score) };
}

/** True when the candidate effectively duplicates an earlier bar. */
export function isDuplicateOfEarlierBar(candidate: string, earlierLines: string[]): boolean {
  const { nearest } = findSimilarBars(candidate, earlierLines, DUPLICATE_THRESHOLD);
  return !!nearest && nearest.score >= DUPLICATE_THRESHOLD;
}
