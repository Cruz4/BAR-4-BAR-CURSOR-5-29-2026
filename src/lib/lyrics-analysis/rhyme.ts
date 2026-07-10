/**
 * Deterministic rhyme detection and scoring.
 *
 * - Exact rhyme: identical rime (nucleus + coda) from the last stressed vowel.
 * - Near-rhyme score 0..1: vowel-nucleus matches weighted above coda similarity.
 * - Multisyllabic matching: how many trailing syllables of two phrases rhyme.
 * - Internal rhyme: pairwise scan of words within a line above a threshold.
 */

import {
  getWordPhonetics,
  syllabify,
  tokenizeLine,
  type PhoneticSyllable,
} from './phonetics';

export const NEAR_RHYME_THRESHOLD = 0.55;

/** Consonant similarity groups — same-group codas count as partial matches. */
const CONSONANT_GROUPS: Record<string, string> = {
  P: 'stop-vl', T: 'stop-vl', K: 'stop-vl',
  B: 'stop-v', D: 'stop-v', G: 'stop-v',
  F: 'fric-vl', TH: 'fric-vl', S: 'fric-vl', SH: 'fric-vl', HH: 'fric-vl',
  V: 'fric-v', DH: 'fric-v', Z: 'fric-v', ZH: 'fric-v',
  CH: 'affr', JH: 'affr',
  M: 'nasal', N: 'nasal', NG: 'nasal',
  L: 'liquid', R: 'liquid',
  W: 'glide', Y: 'glide', ER: 'liquid',
};

/** Vowel neighborhoods for slant-rhyme credit (e.g. IY/IH, EY/EH). */
const VOWEL_NEIGHBORS: Array<Set<string>> = [
  new Set(['IY', 'IH']),
  new Set(['EY', 'EH', 'AE']),
  new Set(['AA', 'AO', 'AH']),
  new Set(['OW', 'UH', 'UW']),
  new Set(['AY', 'OY']),
  new Set(['AW', 'AA']),
  new Set(['ER', 'AH']),
];

function vowelSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  for (const group of VOWEL_NEIGHBORS) {
    if (group.has(a) && group.has(b)) return 0.6;
  }
  return 0;
}

function codaSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const len = Math.max(a.length, b.length);
  let score = 0;
  for (let i = 0; i < len; i++) {
    // Compare from the end — final consonants matter most.
    const pa = a[a.length - 1 - i];
    const pb = b[b.length - 1 - i];
    if (pa === undefined || pb === undefined) continue;
    if (pa === pb) score += 1;
    else if (CONSONANT_GROUPS[pa] && CONSONANT_GROUPS[pa] === CONSONANT_GROUPS[pb]) score += 0.5;
  }
  return score / len;
}

function wordSyllables(word: string): PhoneticSyllable[] {
  return syllabify(getWordPhonetics(word).phones);
}

/** Trailing syllables of a phrase, most recent last. */
function phraseTailSyllables(phrase: string, maxSyllables: number): PhoneticSyllable[] {
  const words = tokenizeLine(phrase);
  const all: PhoneticSyllable[] = [];
  for (const w of words) all.push(...wordSyllables(w));
  return all.slice(-maxSyllables);
}

/** Rime portion of a word: syllables from the last stressed vowel onward. */
export function rimeSyllables(word: string): PhoneticSyllable[] {
  const syls = wordSyllables(word);
  if (syls.length === 0) return [];
  let start = syls.length - 1;
  for (let i = syls.length - 1; i >= 0; i--) {
    if (syls[i].stress === 1 || syls[i].stress === 2) {
      start = i;
      break;
    }
  }
  return syls.slice(start);
}

/** Stable string key for a word's rime — equal keys mean an exact rhyme. */
export function rhymeKey(word: string): string {
  const rime = rimeSyllables(word);
  if (rime.length === 0) return '?';
  return rime.map((s) => [s.nucleus, ...s.coda].join('-')).join('.');
}

/** Exact rhyme: identical rime from the last stressed vowel, different words. */
export function isExactRhyme(wordA: string, wordB: string): boolean {
  const a = rhymeKey(wordA);
  const b = rhymeKey(wordB);
  if (a === '?' || b === '?') return false;
  return a === b;
}

/**
 * Near-rhyme score in 0..1 comparing the trailing syllables of two words.
 * Nucleus (vowel) match is weighted 70%, coda similarity 30%.
 */
export function nearRhymeScore(wordA: string, wordB: string): number {
  const a = rimeSyllables(wordA);
  const b = rimeSyllables(wordB);
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 1; i <= len; i++) {
    const sa = a[a.length - i];
    const sb = b[b.length - i];
    total += 0.7 * vowelSimilarity(sa.nucleus, sb.nucleus) + 0.3 * codaSimilarity(sa.coda, sb.coda);
  }
  // Penalize mismatched rime lengths slightly.
  const lengthPenalty = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return (total / len) * (0.75 + 0.25 * lengthPenalty);
}

export function isNearRhyme(wordA: string, wordB: string, threshold = NEAR_RHYME_THRESHOLD): boolean {
  const na = tokenizeLine(wordA).join('');
  const nb = tokenizeLine(wordB).join('');
  if (!na || !nb || na === nb) return false;
  return nearRhymeScore(wordA, wordB) >= threshold;
}

export type MultisyllabicMatch = {
  /** Number of trailing syllables that rhyme (0 = no match). */
  depth: number;
  /** Average per-syllable rhyme score across the matched depth. */
  score: number;
};

/**
 * Multisyllabic rhyme matching between two phrases (e.g. line endings).
 * Compares trailing syllables pairwise from the end and reports how deep
 * the rhyme goes (up to `maxDepth`, default 4).
 */
export function multisyllabicMatch(phraseA: string, phraseB: string, maxDepth = 4): MultisyllabicMatch {
  const a = phraseTailSyllables(phraseA, maxDepth);
  const b = phraseTailSyllables(phraseB, maxDepth);
  const len = Math.min(a.length, b.length);
  if (len === 0) return { depth: 0, score: 0 };

  let depth = 0;
  let total = 0;
  for (let i = 1; i <= len; i++) {
    const sa = a[a.length - i];
    const sb = b[b.length - i];
    const sylScore = 0.7 * vowelSimilarity(sa.nucleus, sb.nucleus) + 0.3 * codaSimilarity(sa.coda, sb.coda);
    if (sylScore < NEAR_RHYME_THRESHOLD) break;
    depth = i;
    total += sylScore;
  }
  return { depth, score: depth > 0 ? total / depth : 0 };
}

export type InternalRhymePair = {
  wordA: string;
  wordB: string;
  indexA: number;
  indexB: number;
  score: number;
};

/**
 * Internal rhyme detection: scans word pairs within one line and returns
 * pairs whose near-rhyme score clears the threshold. Skips identical words
 * and 1-syllable stopword-ish function words.
 */
export function findInternalRhymes(line: string, threshold = NEAR_RHYME_THRESHOLD + 0.1): InternalRhymePair[] {
  const words = tokenizeLine(line);
  const results: InternalRhymePair[] = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (words[i] === words[j]) continue;
      if (INTERNAL_RHYME_SKIP.has(words[i]) || INTERNAL_RHYME_SKIP.has(words[j])) continue;
      const score = nearRhymeScore(words[i], words[j]);
      if (score >= threshold) {
        results.push({ wordA: words[i], wordB: words[j], indexA: i, indexB: j, score });
      }
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

const INTERNAL_RHYME_SKIP = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'is', 'it', 'and', 'or',
  'but', 'for', 'so', 'my', 'me', 'i', 'you', 'he', 'she', 'we', 'they',
  'be', 'was', 'are', 'do', 'did', 'not', 'no', 'that', 'this', 'with', 'up',
]);

/** Last meaningful word of a lyric line (used as its end-rhyme anchor). */
export function lineEndWord(line: string): string | null {
  const words = tokenizeLine(line);
  return words.length ? words[words.length - 1] : null;
}
