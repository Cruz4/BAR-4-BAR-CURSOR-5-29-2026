/**
 * Lyric-comprehension engine verification.
 * Run: npm run verify:lyrics-analysis  (uses tsx to import the TS modules)
 */

import {
  loadPhoneticDictionary,
  countWordSyllables,
  countLineSyllables,
  isExactRhyme,
  nearRhymeScore,
  isNearRhyme,
  multisyllabicMatch,
  findInternalRhymes,
  findRepeatedWords,
  wordsRepeatedFrom,
  repeatsEndWord,
  compareLineLengths,
  estimateLineTiming,
  barDurationSec,
  lineSimilarity,
  isDuplicateOfEarlierBar,
  findBannedWords,
  passesBannedWords,
  analyzeBar,
  rhymeKey,
} from '../src/lib/lyrics-analysis/index.ts';

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    failures++;
    return;
  }
  console.log('OK:', message);
}

function assertClose(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message} (got ${actual})`);
}

await loadPhoneticDictionary();

// --- Syllables -------------------------------------------------------------
assert(countWordSyllables('cat') === 1, 'cat = 1 syllable');
assert(countWordSyllables('money') === 2, 'money = 2 syllables');
assert(countWordSyllables('beautiful') === 3, 'beautiful = 3 syllables');
assert(countWordSyllables('celebration') === 4, 'celebration = 4 syllables');
assert(countWordSyllables('fire') >= 1 && countWordSyllables('fire') <= 2, 'fire = 1-2 syllables');
assert(countWordSyllables('flexin') === 2, "OOV slang 'flexin' = 2 syllables");
assert(countLineSyllables('I got money on my mind') === 7, 'line syllable total = 7');
assert(countLineSyllables('') === 0, 'empty line = 0 syllables');

// --- Exact rhyme -----------------------------------------------------------
assert(isExactRhyme('cat', 'hat'), 'cat / hat exact rhyme');
assert(isExactRhyme('money', 'honey'), 'money / honey exact rhyme');
assert(!isExactRhyme('cat', 'dog'), 'cat / dog no rhyme');
assert(!isExactRhyme('orange', 'silver'), 'orange / silver no rhyme');
assert(rhymeKey('cat') !== '?', 'rhymeKey produces a real key');
assert(rhymeKey('cat') === rhymeKey('hat'), 'rhymeKey equal for exact rhymes');

// --- Near rhyme ------------------------------------------------------------
assert(isNearRhyme('time', 'mine'), 'time / mine near rhyme (assonance)');
assert(isNearRhyme('home', 'stone'), 'home / stone near rhyme');
assert(!isNearRhyme('cat', 'dog'), 'cat / dog not a near rhyme');
assert(!isNearRhyme('money', 'money'), 'identical words are not scored as rhymes');
assert(nearRhymeScore('hat', 'cat') > nearRhymeScore('hat', 'dog'), 'scores rank sensibly');

// --- Multisyllabic ---------------------------------------------------------
const multi = multisyllabicMatch('the paper chase', 'a vapor race');
assert(multi.depth >= 2, `multisyllabic 'paper chase'/'vapor race' depth >= 2 (got ${multi.depth})`);
const single = multisyllabicMatch('in the night', 'shining bright');
assert(single.depth >= 1, 'single-syllable tail still matches');
const none = multisyllabicMatch('purple monkeys', 'dishwasher soap');
assert(none.depth === 0, 'unrelated phrases have depth 0');

// --- Internal rhyme ---------------------------------------------------------
const internal = findInternalRhymes('I grind all the time with a dime on my mind');
const internalWords = internal.flatMap((p) => [p.wordA, p.wordB]);
assert(internal.length >= 2, 'internal rhymes detected in dense line');
assert(internalWords.includes('grind') && internalWords.includes('time'), 'grind/time flagged');
assert(findInternalRhymes('the quick brown fox jumped over').length === 0, 'no false internal rhymes');

// --- Repetition --------------------------------------------------------------
const repeated = findRepeatedWords([
  'stacking paper till the paper touch the roof',
  'no proof without the paper',
]);
assert(repeated.length > 0 && repeated[0].word === 'paper' && repeated[0].count === 3, 'paper repeated 3x detected');
assert(wordsRepeatedFrom('paper in my pocket', ['stacking paper daily']).includes('paper'), 'cross-line repeat detected');
assert(repeatsEndWord('I want the money', ['she counting money']), 'repeated end word detected');
assert(!repeatsEndWord('I want the cash', ['she counting money']), 'different end words pass');
assert(findRepeatedWords(['the cat and the dog and the bird']).length === 0, 'stopwords not flagged');

// --- Line length -------------------------------------------------------------
const lengths = compareLineLengths([
  'I got money on my mind',            // 7
  'and my mind is on the prize',       // 7
  'yeah',                              // 1 -> short
  'counting hundred dollar bills up in the elevator to the sky penthouse', // long
]);
assert(lengths[0].flag === 'ok', 'median-length line is ok');
assert(lengths[2].flag === 'short', 'one-word line flagged short');
assert(lengths[3].flag === 'long', 'overstuffed line flagged long');

// --- Timing ------------------------------------------------------------------
assertClose(barDurationSec(90), 2.667, 0.01, 'bar at 90 BPM lasts ~2.67s');
const dense = estimateLineTiming(
  'everybody in the building keep on yelling out my name and they never gonna stop until they see me in the grave',
  90
);
assert(dense.density === 'dense' || dense.density === 'overloaded', 'packed line flagged dense/overloaded');
const chill = estimateLineTiming('I ride slow', 90);
assert(chill.density === 'sparse' || chill.density === 'comfortable', 'short line is sparse/comfortable');

// --- Similarity ----------------------------------------------------------------
assert(lineSimilarity('I got money on my mind', 'I got money on my mind') === 1, 'identical lines score 1');
assert(lineSimilarity('I got money on my mind', 'money on my mind I got') > 0.5, 'reordered line still similar');
assert(lineSimilarity('I got money on my mind', 'purple elephants dancing tonight') < 0.2, 'unrelated lines score low');
assert(
  isDuplicateOfEarlierBar('I got money on my mind', ['stack it up', 'I got money on my mind']),
  'duplicate bar detected'
);
assert(
  !isDuplicateOfEarlierBar('brand new flow brand new day', ['I got money on my mind']),
  'fresh bar passes'
);

// --- Banned words ---------------------------------------------------------------
assert(findBannedWords('keep that gun talk quiet', ['gun']).length === 1, 'plain banned word caught');
assert(findBannedWords('keep that g*n talk quiet', ['gun']).length === 1, 'censored g*n caught');
assert(findBannedWords('guuuns everywhere', ['gun']).length === 1, 'stretched plural caught');
assert(findBannedWords('GUN in caps', ['gun']).length === 1, 'case-insensitive');
assert(findBannedWords('the gundam model kit', ['gun']).length === 0, 'substring inside longer word not flagged');
assert(findBannedWords('no drill talk today', ['drill talk']).length === 1, 'multi-word phrase caught');
assert(passesBannedWords('clean line here', ['gun', 'drill talk']), 'clean line passes');
assert(passesBannedWords('anything goes', []), 'empty ban list passes');

// --- Aggregate -------------------------------------------------------------------
const bar = analyzeBar('I grind all the time with a dime on my mind', {
  earlierLines: ['out here on my grind every day'],
  tempoBPM: 90,
});
assert(bar.syllables > 0, 'analyzeBar counts syllables');
assert(bar.rhymeKey !== '?', 'analyzeBar computes a rhyme key');
assert(bar.endWord === 'mind', 'analyzeBar finds end word');
assert(bar.internalRhymes.length > 0, 'analyzeBar finds internal rhymes');
assert(bar.repeatedWords.includes('grind'), 'analyzeBar flags repeated words');
assert(bar.timing !== null && bar.timing.barDurationSec > 0, 'analyzeBar computes timing');

// --- Repetition guardrail logic (mirrors lyric-guardrails.ts) --------------------
assert(repeatsEndWord('stacking paper flow', ['first line flow']), 'end-word repeat detected');
assert(
  !repeatsEndWord('stacking paper tonight', ['first line flow']),
  'different end word passes end-word check'
);
assert(
  wordsRepeatedFrom('grind through the night', ['out here on my grind']).includes('grind'),
  'words from previous line detected'
);
assert(
  !isDuplicateOfEarlierBar('brand new bar brand new day', ['I got money on my mind']),
  'non-duplicate passes duplicate check'
);

if (failures > 0) {
  console.error(`\n${failures} lyric-analysis check(s) failed.`);
  process.exit(1);
}
console.log('\nAll lyric-analysis verification checks passed.');
