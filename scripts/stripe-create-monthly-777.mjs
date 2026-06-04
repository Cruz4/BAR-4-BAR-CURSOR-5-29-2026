/**
 * Creates Pro Monthly at $7.77/mo (1,777 residency ink).
 * Prints STRIPE_PRICE_PRO_MONTHLY=... for .env
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const products = await stripe.products.list({ limit: 100, active: true });
let productId = products.data.find((p) => p.name === 'Bar 4 Bar Pro Monthly')?.id;
if (!productId) {
  const product = await stripe.products.create({
    name: 'Bar 4 Bar Pro Monthly',
    metadata: { tier: 'monthly' },
  });
  productId = product.id;
}

const price = await stripe.prices.create({
  product: productId,
  unit_amount: 777,
  currency: 'usd',
  recurring: { interval: 'month' },
  nickname: 'Pro Monthly — $7.77/mo · 1,777 residency ink',
  metadata: { tier: 'monthly', residencyRefill: '1777' },
});

console.log('\nPro Monthly price created ($7.77/mo):\n');
console.log(`STRIPE_PRICE_PRO_MONTHLY=${price.id}\n`);
console.log('Add to .env and Firebase hosting secrets, then run: npm run stripe:verify');
