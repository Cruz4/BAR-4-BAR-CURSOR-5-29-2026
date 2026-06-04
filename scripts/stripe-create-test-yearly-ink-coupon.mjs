/**
 * Creates 50% off forever coupon for Yearly Pro ink packs (TEST mode).
 * Prints STRIPE_COUPON_YEARLY_INK_50=... for .env
 *
 * Usage: npm run stripe:create-test-yearly-ink-coupon
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!secretKey?.startsWith('sk_test_')) {
  console.error('Set STRIPE_SECRET_KEY=sk_test_... in .env (Test mode) before running.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const existing = await stripe.coupons.list({ limit: 100 });
const match = existing.data.find(
  (c) => c.percent_off === 50 && c.duration === 'forever' && c.metadata?.purpose === 'yearly_ink_discount'
);

const coupon =
  match ??
  (await stripe.coupons.create({
    percent_off: 50,
    duration: 'forever',
    name: 'Yearly Pro — 50% off permanent ink',
    metadata: { purpose: 'yearly_ink_discount' },
  }));

console.log('\n# Add to .env and .firebase/lyricai-studio-otgxn/functions/.env\n');
console.log(`STRIPE_COUPON_YEARLY_INK_50=${coupon.id}\n`);
console.log('Then: npm run deploy:live\n');
