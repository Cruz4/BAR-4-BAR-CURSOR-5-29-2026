/**
 * Creates Starter Pack II ($8.88 / 5000 ink) if missing.
 * Prints STRIPE_PRICE_INK_REFILL=... for .env
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
const starterId = process.env.STRIPE_PRICE_INK_STARTER || 'price_1TKAenR1AVjROqp39ARyvFug';

const starter = await stripe.prices.retrieve(starterId, { expand: ['product'] });
const productId =
  typeof starter.product === 'string' ? starter.product : starter.product.id;

const price = await stripe.prices.create({
  product: productId,
  unit_amount: 888,
  currency: 'usd',
  nickname: 'Starter Pack II — 5000 Permanent Ink',
  metadata: { inkAmount: '5000', pack: 'INK_REFILL' },
});

console.log('\nCreated price for Starter Pack II ($8.88):\n');
console.log(`STRIPE_PRICE_INK_REFILL=${price.id}\n`);
console.log('Add this line to your .env and Firebase hosting secrets, then run: npm run stripe:verify');
