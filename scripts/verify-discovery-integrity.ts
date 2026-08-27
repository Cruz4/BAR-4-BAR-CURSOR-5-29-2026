import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { organicMomentumScore } from '../src/lib/drop-listen-analytics';
import { buildDiscoveryMatch } from '../src/lib/discovery-graph';

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

const tasteMatch = buildDiscoveryMatch(
  {
    kinds: ['music_fan'],
    genres: ['Alternative', 'R&B'],
    moods: ['Moody'],
    influences: ['Missy Elliott'],
    region: 'Baltimore',
  },
  {
    kinds: ['artist'],
    genres: ['alternative'],
    moods: ['MOODY'],
    influences: ['Missy Elliott'],
    region: 'baltimore',
    ...({ isPro: true, inkBalance: 999999, salesCents: 999999 } as object),
  },
  'taste'
);
assert.equal(tasteMatch.score, 12, 'public taste-tag weights changed unexpectedly');
assert.deepEqual(
  tasteMatch.reasons,
  ['Genre · Alternative', 'Mood · Moody', 'Influence · Missy Elliott'],
  'taste matches must stay explainable'
);

const creationMatch = buildDiscoveryMatch(
  { kinds: ['producer'], genres: ['Hip-hop'], collaboration: 'open' },
  { kinds: ['producer'], genres: ['hip-hop'], collaboration: 'open' },
  'creation'
);
assert.equal(creationMatch.score, 10, 'creation matching should use public craft/collab choices');
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

const searchSource = readFileSync(new URL('../src/lib/server/discovery-search.ts', import.meta.url), 'utf8');
const identityStripSource = readFileSync(new URL('../src/components/profile/sound-identity-strip.tsx', import.meta.url), 'utf8');
const songPageSource = readFileSync(new URL('../src/components/song/pressed-song-page-client.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(
  searchSource,
  /haystack:\s*\[searchableText, owner\.displayName,\s*\.\.\.identityStrings/,
  'profile identity tags must not make every post match the same query'
);
assert.match(searchSource, /drop\.metadata\.genreStyles/, 'release results must expose their own genre/style tags');
assert.match(identityStripSource, /resultKinds:\s*\['person'\]/, 'profile identity tags must open People discovery');
assert.match(songPageSource, /<MusicDiscoveryTags metadata=\{summary\.metadata\}/, 'song pages must show discoverable music metadata');
assert.match(songPageSource, /<MusicDiscoveryTags[^>]*soundAsText/, 'song-page Sound details must remain informational instead of becoming a search link');

console.log('Discovery integrity verification passed.');
