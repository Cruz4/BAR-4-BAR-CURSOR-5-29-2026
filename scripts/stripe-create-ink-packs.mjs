/**
 * Creates the three permanent ink pack prices ($7.77 / $11.11 / $19.44).
 * Works in test (sk_test_) or live (sk_live_) — uses STRIPE_SECRET_KEY from .env.
 *
 * Usage: npm run stripe:create-ink-packs
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
if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function findOrCreateProduct(name) {
  const existing = await stripe.products.list({ limit: 100, active: true });
  const match = existing.data.find((p) => p.name === name);
  if (match) return match.id;
  const product = await stripe.products.create({ name });
  return product.id;
}

async function createPrice({ productName, unitAmount, nickname, metadata }) {
  const product = await findOrCreateProduct(productName);
  return stripe.prices.create({
    product,
    unit_amount: unitAmount,
    currency: 'usd',
    nickname,
    metadata,
  });
}

const created = {};

created.INK_REFILL = await createPrice({
  productName: 'Permanent Ink — Studio Pack',
  unitAmount: 777,
  nickname: 'Studio Pack — 1,000 ink ($7.77)',
  metadata: { inkAmount: '1000', pack: 'INK_REFILL' },
});

created.INK_ARTIST = await createPrice({
  productName: 'Permanent Ink — Artist Bundle',
  unitAmount: 1111,
  nickname: 'Artist Bundle — 1,800 ink ($11.11)',
  metadata: { inkAmount: '1800', pack: 'INK_ARTIST' },
});

created.INK_VAULT = await createPrice({
  productName: 'Permanent Ink — Studio Vault',
  unitAmount: 1944,
  nickname: 'Studio Vault — 4,500 ink ($19.44)',
  metadata: { inkAmount: '4500', pack: 'INK_VAULT' },
});

const mode = secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
console.log(`\n# Ink packs created (${mode} mode) — paste into .env and functions/.env\n`);
for (const [key, price] of Object.entries(created)) {
  console.log(`STRIPE_PRICE_${key}=${price.id}`);
}
console.log('\nThen run: npm run stripe:verify\n');
