import assert from 'node:assert/strict';
import { organicMomentumScore } from '../src/lib/drop-listen-analytics';

const baseline = organicMomentumScore({
  qualifiedListeners: 10,
  repeatListeners: 2,
  follows: 1,
  innerCircleJoins: 1,
  convertedShares: 1,
  purchaseConversions: 1,
});

assert.equal(baseline, 38, 'documented relationship weights changed unexpectedly');
assert.equal(
  organicMomentumScore({
    qualifiedListeners: 10,
    repeatListeners: 2,
    follows: 1,
    innerCircleJoins: 1,
    convertedShares: 1,
    purchaseConversions: 1,
    // Runtime callers cannot buy score with unrelated fields.
    ...({ amountCents: 1_000_000, inkSpent: 1_000_000, sponsored: true, isPro: true } as object),
  }),
  baseline,
  'money, Ink, sponsorship, or subscription status affected organic score'
);
assert.equal(
  organicMomentumScore({
    qualifiedListeners: -5,
    repeatListeners: Number.NaN,
    follows: -1,
    innerCircleJoins: 0,
    convertedShares: 0,
    purchaseConversions: 0,
  }),
  0,
  'invalid signals must not create score'
);

console.log('Discovery integrity verification passed.');

