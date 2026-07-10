/**
 * Repeated-word detection across lines, sections, or a whole track.
 * Stopword-aware: common function words are never flagged.
 */

import { tokenizeLine } from './phonetics';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at',
  'is', 'it', 'its', "it's", 'as', 'be', 'was', 'are', 'am', 'do', 'did',
  'for', 'with', 'that', 'this', 'these', 'those', 'not', 'no', 'my', 'me',
  'i', "i'm", 'you', 'your', 'he', 'she', 'we', 'they', 'them', 'his', 'her',
  'up', 'down', 'out', 'all', 'like', 'just', 'got', 'get', 'when', 'what',
  'if', 'then', 'than', 'from', 'by', 'can', "can't", 'will', 'wont', "won't",
  'dont', "don't", 'aint', "ain't", 'im', 'yeah', 'oh', 'uh', 'ya',
]);

export type WordOccurrence = {
  lineIndex: number;
  wordIndex: number;
};

export type RepeatedWord = {
  word: string;
  count: number;
  occurrences: WordOccurrence[];
};

export type RepetitionOptions = {
  /** Minimum occurrences before a word is flagged (default 2). */
  minCount?: number;
  /** Include stopwords in the scan (default false). */
  includeStopwords?: boolean;
};

/**
 * Scan a list of lines for repeated content words.
 * Returns words sorted by count descending.
 */
export function findRepeatedWords(lines: string[], options: RepetitionOptions = {}): RepeatedWord[] {
  const { minCount = 2, includeStopwords = false } = options;
  const seen = new Map<string, WordOccurrence[]>();

  lines.forEach((line, lineIndex) => {
    tokenizeLine(line).forEach((word, wordIndex) => {
      if (!includeStopwords && STOPWORDS.has(word)) return;
      if (word.length < 2) return;
      const list = seen.get(word) ?? [];
      list.push({ lineIndex, wordIndex });
      seen.set(word, list);
    });
  });

  const repeated: RepeatedWord[] = [];
  for (const [word, occurrences] of seen) {
    if (occurrences.length >= minCount) {
      repeated.push({ word, count: occurrences.length, occurrences });
    }
  }
  return repeated.sort((a, b) => b.count - a.count);
}

/** Words a new line would repeat from a set of earlier lines. */
export function wordsRepeatedFrom(newLine: string, earlierLines: string[]): string[] {
  const earlier = new Set<string>();
  for (const line of earlierLines) {
    for (const w of tokenizeLine(line)) {
      if (!STOPWORDS.has(w) && w.length >= 2) earlier.add(w);
    }
  }
  const repeats = new Set<string>();
  for (const w of tokenizeLine(newLine)) {
    if (earlier.has(w)) repeats.add(w);
  }
  return [...repeats];
}

/** True when two lines end on the same word (the most jarring repetition). */
export function repeatsEndWord(newLine: string, earlierLines: string[]): boolean {
  const words = tokenizeLine(newLine);
  if (!words.length) return false;
  const endWord = words[words.length - 1];
  return earlierLines.some((line) => {
    const w = tokenizeLine(line);
    return w.length > 0 && w[w.length - 1] === endWord;
  });
}
