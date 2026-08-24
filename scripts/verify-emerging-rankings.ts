import assert from 'node:assert/strict';
import {
  EMERGING_FORMULA,
  emergingDayKey,
  emergingEntryPath,
  emergingReasons,
  emergingScore,
} from '../src/lib/emerging-ranking';

const signals = {
  qualifiedListeners: 10,
  repeatListeners: 2,
  follows: 1,
  innerCircleJoins: 1,
  convertedShares: 1,
  purchaseConversions: 1,
};

assert.equal(emergingScore(signals), 38, 'emerging score no longer matches its public weights');
assert.equal(
  emergingScore({
    ...signals,
    ...({ amountCents: 1_000_000, inkSpent: 1_000_000, isPro: true, sponsored: true } as object),
  }),
  38,
  'money, Ink, tier, or sponsorship changed emerging rank'
);
assert.deepEqual(
  emergingReasons(signals),
  ['10 qualified listeners', '2 repeat listens', '1 new follower'],
  'ranking explanations changed unexpectedly'
);
const fixed = new Date('2026-08-24T23:59:59.000Z');
assert.equal(emergingDayKey(fixed), '2026-08-24');
assert.equal(emergingEntryPath('listener-1', fixed), 'emergingSignals/2026-08-24/entries/listener-1');
assert.deepEqual(
  EMERGING_FORMULA.map(({ points }) => points),
  [1, 3, 4, 5, 5, 8],
  'public formula no longer matches organic momentum weights'
);

console.log('Emerging ranking verification passed.');
