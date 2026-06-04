/**
 * Creates Pro Yearly at $53.28/yr ($4.44/mo effective).
 * Prints STRIPE_PRICE_PRO_YEARLY=... for .env
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
let productId = products.data.find((p) => p.name === 'Bar 4 Bar Pro Yearly')?.id;
if (!productId) {
  const product = await stripe.products.create({
    name: 'Bar 4 Bar Pro Yearly',
    metadata: { tier: 'yearly' },
  });
  productId = product.id;
}

const price = await stripe.prices.create({
  product: productId,
  unit_amount: 5328,
  currency: 'usd',
  recurring: { interval: 'year' },
  nickname: 'Pro Yearly — $4.44/mo · 3,444 residency ink',
  metadata: { tier: 'yearly', residencyRefill: '3444' },
});

console.log('\nPro Yearly price created ($53.28/yr):\n');
console.log(`STRIPE_PRICE_PRO_YEARLY=${price.id}\n`);
console.log('Add to .env and Firebase hosting secrets, then run: npm run stripe:verify');
