import assert from 'node:assert/strict';
import {
  CREATOR_CHART_FORMULA,
  MUSIC_FAN_CHART_FORMULA,
  TRACK_CHART_FORMULA,
  chartRegionLabels,
  trackChartReasons,
  trackChartScore,
} from '../src/lib/music-charts';

const signals = {
  qualifiedListeners: 10,
  completions: 4,
  repeatListeners: 2,
  purchaseConversions: 1,
};

assert.equal(trackChartScore(signals), 32, 'track chart score no longer matches public weights');
assert.equal(
  trackChartScore({
    ...signals,
    ...({ amountCents: 1_000_000, inkSpent: 1_000_000, isPro: true, sponsored: true } as object),
  }),
  32,
  'money, Ink, tier, or sponsorship changed track rank'
);
assert.deepEqual(
  TRACK_CHART_FORMULA.map(({ points }) => points),
  [1, 2, 3, 8],
  'public song-chart formula changed unexpectedly'
);
assert.equal(
  CREATOR_CHART_FORMULA.some(({ signal }) => signal === 'sharedLoves'),
  false,
  'creator formula must not award fan-only shared-song Loves'
);
assert.deepEqual(
  MUSIC_FAN_CHART_FORMULA.map(({ signal, points }) => [signal, points]),
  [
    ['convertedShares', 1],
    ['sharedLoves', 1],
    ['repeatListeners', 2],
    ['purchaseConversions', 8],
  ],
  'Music Fan discovery-impact formula changed unexpectedly'
);
assert.deepEqual(
  trackChartReasons(signals),
  ['1 unique buyer conversion', '2 repeat listener days', '4 completed listens'],
  'song-chart explanations changed unexpectedly'
);
assert.deepEqual(
  chartRegionLabels('Brooklyn / Atlanta, Baltimore'),
  ['Brooklyn', 'Atlanta', 'Baltimore'],
  'public Scene/region labels did not split predictably'
);

console.log('Music chart verification passed.');
