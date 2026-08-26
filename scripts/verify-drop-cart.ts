import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DROP_CART_MAX_ITEMS,
  dropCartItemKey,
  normalizeDropCart,
  resolveDropCartAmount,
} from '../src/lib/drop-cart';

assert.equal(dropCartItemKey('share-one'), 'share-one:__bundle__');
assert.equal(dropCartItemKey('album', 'track-2'), 'album:track-2');
assert.equal(resolveDropCartAmount({ mode: 'fixed', amountCents: 499 }, 999), 499);
assert.equal(resolveDropCartAmount({ mode: 'pwyw', minCents: 199, suggestedCents: 777 }), 777);
assert.equal(resolveDropCartAmount({ mode: 'pwyw', minCents: 299, suggestedCents: 777 }, 200), 299);
assert.equal(resolveDropCartAmount({ mode: 'pwyw', minCents: 199, suggestedCents: 777 }, 1200), 1200);

const base = {
  shareId: 'song-a',
  title: 'Song A',
  ownerId: 'artist-a',
  scope: 'track' as const,
  price: { mode: 'fixed' as const, amountCents: 299 },
  amountCents: 299,
  detailsHref: '/song/song-a',
};
const normalized = normalizeDropCart([
  base,
  { ...base, amountCents: 999 },
  { title: 'invalid' },
]);
assert.equal(normalized.length, 1);
assert.equal(normalized[0].amountCents, 299);

const oversized = Array.from({ length: DROP_CART_MAX_ITEMS + 5 }, (_, index) => ({
  ...base,
  shareId: `song-${index}`,
  title: `Song ${index}`,
}));
assert.equal(normalizeDropCart(oversized).length, DROP_CART_MAX_ITEMS);

const checkoutRoute = readFileSync(
  new URL('../src/app/api/drops/cart/checkout/route.ts', import.meta.url),
  'utf8'
);
assert.match(checkoutRoute, /\.\.\.\(trackId \? \{ trackId \} : \{\}\)/);
assert.doesNotMatch(checkoutRoute, /^\s*trackId,\s*$/m);

console.log('Drop cart verification passed.');
