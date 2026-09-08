import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  QUOTE_PRESS_SPACE,
  identityHash,
  quotePressFadersFromText,
  quotePressTokens,
  sanitizeQuotePressSlots,
} from '../src/lib/profile/quote-press';
import { hashSeed } from '../src/lib/profile/pressing';

const sample = 'Same bar, same imprint — press your words.';
const a = quotePressTokens(sample, { faders: quotePressFadersFromText(sample) });
const b = quotePressTokens(sample, { faders: quotePressFadersFromText(sample) });
assert.equal(a.compositionId, b.compositionId, 'tokens must be deterministic');
assert.notEqual(
  quotePressTokens(sample, { faders: { heat: 0, grain: 0, pace: 0, ink: 0 } }).compositionId,
  quotePressTokens(sample, { faders: { heat: 100, grain: 100, pace: 100, ink: 100 } }).compositionId,
  'fader changes should change composition'
);

assert.ok(QUOTE_PRESS_SPACE > 100_000_000, 'combo space should exceed 100M base axes');

const slots = sanitizeQuotePressSlots([
  {
    id: 'x',
    faders: { heat: 10, grain: 20, pace: 30, ink: 40 },
    lockedAt: '2026-01-01T00:00:00.000Z',
    label: 'Test',
  },
  { id: 'bad' },
]);
assert.equal(slots.length, 1);

const sceneHome = readFileSync(new URL('../src/components/scene/scene-home.tsx', import.meta.url), 'utf8');
assert.match(sceneHome, /Imprint/);
assert.match(sceneHome, /quotePress/);
assert.match(sceneHome, /QuotePressCard/);

const social = readFileSync(new URL('../src/lib/profile/social-client.ts', import.meta.url), 'utf8');
assert.match(social, /quotePress\?:/);

const postCard = readFileSync(new URL('../src/components/profile/post-card.tsx', import.meta.url), 'utf8');
assert.match(postCard, /QuotePressCard/);

assert.equal(identityHash(hashSeed(sample), quotePressFadersFromText(sample)) >>> 0, identityHash(hashSeed(sample), quotePressFadersFromText(sample)) >>> 0);

console.log('Quote press verification passed.');
