/**
 * Creates all six Bar 4 Bar prices in Stripe LIVE mode.
 *
 * Prerequisites:
 *   STRIPE_SECRET_KEY=sk_live_... in .env (or exported in shell)
 *
 * Usage:
 *   npm run stripe:create-live-prices
 *   npm run stripe:create-live-prices -- --with-coupon
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

const withCoupon = process.argv.includes('--with-coupon');
const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY. Set sk_live_... in .env before running.');
  process.exit(1);
}

if (!secretKey.startsWith('sk_live_')) {
  console.error(
    'Refusing to run: STRIPE_SECRET_KEY must be a LIVE key (sk_live_...).\n' +
      'Switch Stripe Dashboard to Live mode, copy the secret key, update .env, then retry.\n' +
      'For test prices use: npm run stripe:create-pricing-v2 && npm run stripe:create-yearly-444'
  );
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function findOrCreateProduct(name, metadata = {}) {
  const existing = await stripe.products.list({ limit: 100, active: true });
  const match = existing.data.find((p) => p.name === name);
  if (match) return match.id;
  const product = await stripe.products.create({ name, metadata });
  return product.id;
}

async function createPrice({ productName, unitAmount, recurring, nickname, metadata }) {
  const product = await findOrCreateProduct(productName, metadata);
  const price = await stripe.prices.create({
    product,
    unit_amount: unitAmount,
    currency: 'usd',
    ...(recurring ? { recurring } : {}),
    nickname,
    metadata,
  });
  return price;
}

console.log('\nCreating LIVE Stripe prices (Bar 4 Bar current catalog)...\n');

const created = {};

created.PRO_MONTHLY = await createPrice({
  productName: 'Bar 4 Bar Pro Monthly',
  unitAmount: 777,
  recurring: { interval: 'month' },
  nickname: 'Pro Monthly — $7.77/mo · 1,100 residency ink',
  metadata: { tier: 'monthly', residencyRefill: '1100' },
});

created.PRO_YEARLY = await createPrice({
  productName: 'Bar 4 Bar Pro Yearly',
  unitAmount: 5328,
  recurring: { interval: 'year' },
  nickname: 'Pro Yearly — $4.44/mo · 2,500 residency ink',
  metadata: { tier: 'yearly', residencyRefill: '2500' },
});

created.INK_STARTER = await createPrice({
  productName: 'Permanent Ink — Session Pack',
  unitAmount: 344,
  nickname: 'Session Pack — 280 ink ($3.44)',
  metadata: { inkAmount: '280', pack: 'INK_STARTER' },
});

created.INK_REFILL = await createPrice({
  productName: 'Permanent Ink — Studio Pack',
  unitAmount: 888,
  nickname: 'Studio Pack — 1,000 ink ($8.88)',
  metadata: { inkAmount: '1000', pack: 'INK_REFILL' },
});

created.INK_ARTIST = await createPrice({
  productName: 'Permanent Ink — Artist Bundle',
  unitAmount: 1444,
  nickname: 'Artist Bundle — 1,800 ink ($14.44)',
  metadata: { inkAmount: '1800', pack: 'INK_ARTIST' },
});

created.INK_VAULT = await createPrice({
  productName: 'Permanent Ink — Studio Vault',
  unitAmount: 2444,
  nickname: 'Studio Vault — 4,000 ink ($24.44)',
  metadata: { inkAmount: '4000', pack: 'INK_VAULT' },
});

let couponLine = '';
if (withCoupon) {
  const coupon = await stripe.coupons.create({
    percent_off: 50,
    duration: 'forever',
    name: 'Yearly Pro — 50% off permanent ink',
    metadata: { purpose: 'yearly_ink_discount' },
  });
  couponLine = `STRIPE_COUPON_YEARLY_INK_50=${coupon.id}`;
  console.log(`Created yearly ink coupon: ${coupon.id}\n`);
}

console.log('# Copy into production env (.firebase/.../functions/.env + Google Cloud runtime vars)\n');
console.log('STRIPE_SECRET_KEY=sk_live_...');
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...');
console.log('STRIPE_WEBHOOK_SECRET=whsec_...   # from LIVE webhook endpoint in Stripe Dashboard');
console.log('NEXT_PUBLIC_APP_URL=https://lyricai-studio-otgxn.web.app');
console.log('');
for (const [key, price] of Object.entries(created)) {
  console.log(`STRIPE_PRICE_${key}=${price.id}`);
}
if (couponLine) console.log(couponLine);
console.log('\nThen run: npm run stripe:verify');
console.log('Deploy: npm run build && firebase deploy\n');
