/**
 * Syllable estimation: CMU dictionary lookup first, vowel-group heuristic
 * with English exception rules as fallback. Replaces the old
 * "word count = syllables" proxy stored on manually written bars.
 */

import { getWordPhonetics, normalizeWord, tokenizeLine } from './phonetics';

/** Estimate syllables for a single word. */
export function countWordSyllables(rawWord: string): number {
  const word = normalizeWord(rawWord);
  if (!word) return 0;

  const phonetics = getWordPhonetics(word);
  if (phonetics.source === 'dictionary') return phonetics.syllables;

  return heuristicSyllables(word);
}

/** Estimate syllables for a full lyric line. */
export function countLineSyllables(line: string): number {
  return tokenizeLine(line).reduce((sum, w) => sum + countWordSyllables(w), 0);
}

/**
 * Vowel-group counting with common English exceptions.
 * Used when the word is not in the pronunciation dictionary.
 */
export function heuristicSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 2) return 1;

  let count = (w.match(/[aeiouy]+/g) || []).length;

  // Silent trailing e ("game", "note") but not "-le" ("table") or "-ee".
  if (/[b-df-hj-np-tv-z]e$/.test(w) && !w.endsWith('le') && !w.endsWith('ee')) count--;
  // "-ed" after most consonants is silent ("walked"), except t/d ("wanted").
  if (/[b-df-hj-np-rv-z]ed$/.test(w) && !/[td]ed$/.test(w)) count--;
  // "-es" after sibilants adds a syllable already counted; after others it's silent ("makes").
  if (/[b-df-hj-np-rv-z]es$/.test(w) && !/(ch|sh|s|x|z)es$/.test(w)) count--;
  // Consonant + le is its own syllable ("ta-ble").
  if (/[b-df-hj-np-tv-z]le$/.test(w)) count++;
  // "-ism" is two syllables ("re-al-ism").
  if (w.endsWith('ism')) count++;
  // "io"/"ia" hiatus often splits ("ra-di-o", "me-di-a").
  if (/[aeiou]{3}/.test(w)) count++;

  return Math.max(1, count);
}
