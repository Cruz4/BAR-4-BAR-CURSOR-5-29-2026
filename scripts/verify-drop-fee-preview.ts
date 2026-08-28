import assert from 'node:assert/strict';
import {
  DROP_MID_FEE_FROM_CENTS,
  DROP_PAID_MIN_CENTS,
  DROP_STANDARD_FEE_FROM_CENTS,
  DROP_STRIPE_PROCESSING_FIXED_CENTS,
  dropArtistNetCents,
  dropFeePreview,
  dropPlatformFeeCents,
  dropPlatformFeePercent,
  dropStripeProcessingEstimateCents,
} from '../src/lib/drop-commerce';

/** Fee tiers: 25% below $3, 15% from $3–$4.99, 10% from $5 up. */
const cases: Array<{ cents: number; feePct: number }> = [
  { cents: DROP_PAID_MIN_CENTS, feePct: 25 }, // $1.99
  { cents: 299, feePct: 25 },
  { cents: DROP_MID_FEE_FROM_CENTS, feePct: 15 }, // $3.00
  { cents: 499, feePct: 15 },
  { cents: DROP_STANDARD_FEE_FROM_CENTS, feePct: 10 }, // $5.00
  { cents: 777, feePct: 10 },
];

for (const { cents, feePct } of cases) {
  assert.equal(
    dropPlatformFeePercent(cents),
    feePct,
    `platform fee % at ${cents}¢ should be ${feePct}`
  );
  const fee = dropPlatformFeeCents(cents);
  const net = dropArtistNetCents(cents);
  assert.equal(fee + net, cents, `fee + artist net must equal buyer pays at ${cents}¢`);
  assert.equal(
    net,
    cents - fee,
    `artist net is buyer pays minus platform fee only at ${cents}¢`
  );
}

// Artist net must NOT subtract the 30¢ Stripe fixed fee (or the % estimate).
for (const cents of [199, 299, 300, 499, 500, 777]) {
  const preview = dropFeePreview(cents);
  const stripeEstimate = dropStripeProcessingEstimateCents(preview.buyerPaysCents);
  assert.ok(stripeEstimate >= DROP_STRIPE_PROCESSING_FIXED_CENTS, 'stripe estimate includes 30¢');
  assert.equal(
    preview.artistNetCents,
    preview.buyerPaysCents - preview.platformFeeCents,
    'artist net ignores Stripe processing'
  );
  assert.notEqual(
    preview.artistNetCents,
    preview.buyerPaysCents - preview.platformFeeCents - DROP_STRIPE_PROCESSING_FIXED_CENTS,
    'artist net must not subtract the 30¢ Stripe fixed fee'
  );
  assert.equal(
    preview.stripeProcessingEstimateCents,
    stripeEstimate,
    'stripe estimate is reported separately on the fee preview'
  );
}

console.log('Drop fee preview verification passed.');
