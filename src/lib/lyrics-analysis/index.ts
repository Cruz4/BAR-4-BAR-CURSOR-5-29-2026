/**
 * Bar 4 Bar lyric-comprehension engine.
 *
 * Deterministic, Ink-free analysis: the AI handles meaning and creativity,
 * this code handles the measurable constraints — syllables, rhyme, timing,
 * repetition, similarity, and banned-word enforcement.
 *
 * Server code should `await loadPhoneticDictionary()` once before analyzing
 * for dictionary-grade accuracy; without it everything still works via
 * grapheme heuristics.
 */

export {
  loadPhoneticDictionary,
  isPhoneticDictionaryLoaded,
  getWordPhonetics,
  syllabify,
  tokenizeLine,
  normalizeWord,
  type WordPhonetics,
  type PhoneticSyllable,
} from './phonetics';

export { countWordSyllables, countLineSyllables, heuristicSyllables } from './syllables';

export {
  rhymeKey,
  rimeSyllables,
  isExactRhyme,
  nearRhymeScore,
  isNearRhyme,
  multisyllabicMatch,
  findInternalRhymes,
  lineEndWord,
  NEAR_RHYME_THRESHOLD,
  type MultisyllabicMatch,
  type InternalRhymePair,
} from './rhyme';

export {
  findRepeatedWords,
  wordsRepeatedFrom,
  repeatsEndWord,
  type RepeatedWord,
  type RepetitionOptions,
} from './repetition';

export { compareLineLengths, type LineLengthReport, type LineLengthOptions } from './lines';

export {
  estimateLineTiming,
  estimateSectionTiming,
  barDurationSec,
  beatDurationSec,
  BEATS_PER_MUSICAL_BAR,
  type LineTimingEstimate,
} from './timing';

export {
  lineSimilarity,
  findSimilarBars,
  isDuplicateOfEarlierBar,
  DUPLICATE_THRESHOLD,
  type SimilarBar,
} from './similarity';

export {
  findBannedWords,
  passesBannedWords,
  normalizeForBanCheck,
  type BannedWordViolation,
} from './banned-words';

import { countLineSyllables } from './syllables';
import { rhymeKey, lineEndWord, findInternalRhymes, type InternalRhymePair } from './rhyme';
import { wordsRepeatedFrom } from './repetition';
import { findSimilarBars, type SimilarBar } from './similarity';
import { estimateLineTiming, type LineTimingEstimate } from './timing';

export type BarAnalysis = {
  text: string;
  syllables: number;
  /** Phonetic end-rhyme key ('?' when the line is empty). */
  rhymeKey: string;
  endWord: string | null;
  internalRhymes: InternalRhymePair[];
  /** Content words this line repeats from earlier lines (when provided). */
  repeatedWords: string[];
  /** Nearest earlier bar by similarity (when earlier lines provided). */
  nearestEarlierBar: SimilarBar | null;
  /** Timing estimate (when BPM provided). */
  timing: LineTimingEstimate | null;
};

export type AnalyzeBarOptions = {
  earlierLines?: string[];
  tempoBPM?: number;
};

/** Aggregate analysis for one lyric line. */
export function analyzeBar(text: string, options: AnalyzeBarOptions = {}): BarAnalysis {
  const { earlierLines = [], tempoBPM } = options;
  const endWord = lineEndWord(text);
  const similar = earlierLines.length ? findSimilarBars(text, earlierLines) : { nearest: null, matches: [] };
  return {
    text,
    syllables: countLineSyllables(text),
    rhymeKey: endWord ? rhymeKey(endWord) : '?',
    endWord,
    internalRhymes: findInternalRhymes(text),
    repeatedWords: earlierLines.length ? wordsRepeatedFrom(text, earlierLines) : [],
    nearestEarlierBar: similar.nearest,
    timing: typeof tempoBPM === 'number' ? estimateLineTiming(text, tempoBPM) : null,
  };
}
