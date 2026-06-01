/**
 * Bar vs line terminology — automated checks for plan verification scenarios.
 * Run: npm run verify:bar-units
 */

const LINES_PER_RHYME_BAR = 2;

function linesToRhymeBars(lineCount) {
  return Math.floor(Math.max(0, lineCount) / LINES_PER_RHYME_BAR);
}

function rhymeBarsToLines(barCount) {
  return Math.max(0, barCount) * LINES_PER_RHYME_BAR;
}

function countNonEmptyLines(sections) {
  if (!sections?.length) return 0;
  return sections.reduce((acc, s) => {
    return acc + (s.bars?.filter((b) => String(b.text || '').trim().length > 0).length || 0);
  }, 0);
}

function countRhymeBars(sections) {
  return linesToRhymeBars(countNonEmptyLines(sections));
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log('OK:', message);
}

const SESSION_BARS = 16;
const TRACK_COMPLETE_MIN_BARS = 8;
const WEEKLY_BARS_TARGET = 8;

// 16 lines ≠ 16 bars; 32 lines = 16-bar session
assert(linesToRhymeBars(16) === 8, '16 lines = 8 rhyme bars (not 16-bar session)');
assert(
  16 < rhymeBarsToLines(SESSION_BARS),
  '16-Bar Session does not unlock at 16 lines'
);
assert(
  32 >= rhymeBarsToLines(SESSION_BARS),
  '16-Bar Session unlocks at 32 lines'
);

// Weekly "Write 8 bars" completes at 16 lines
assert(
  linesToRhymeBars(16) >= WEEKLY_BARS_TARGET,
  'Weekly 8-bar goal completes at 16 lines (8/8 bars)'
);
assert(
  linesToRhymeBars(15) < WEEKLY_BARS_TARGET,
  'Weekly 8-bar goal not complete at 15 lines (7 bars)'
);

// Track complete requires 16 lines (8 bars)
assert(
  rhymeBarsToLines(TRACK_COMPLETE_MIN_BARS) === 16,
  'Track complete minimum is 16 lines (8 bars)'
);

// Hub structure sync: 32-line verse → 16 bars
const verse32Lines = { bars: Array.from({ length: 32 }, (_, i) => ({ text: `line ${i + 1}` })) };
assert(
  linesToRhymeBars(verse32Lines.bars.length) === 16,
  '32-line verse shows 16 bars in structure sync'
);

// Orphan line policy: floor(lines/2)
assert(linesToRhymeBars(17) === 8, '17 lines = 8 bars (orphan line ignored)');
assert(countRhymeBars([{ bars: [{ text: 'a' }] }]) === 0, '1 non-empty line = 0 bars');

console.log('\nAll rhyme-bar verification checks passed.');
