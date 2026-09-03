/**
 * Creates Growth ↔ Balanced pricing v2 in Stripe.
 * Prints env lines to add to .env
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

const created = {};

created.PRO_MONTHLY = await createPrice({
  productName: 'AKAsheet Pro Monthly',
  unitAmount: 777,
  recurring: { interval: 'month' },
  nickname: 'Pro Monthly — $7.77/mo · 1,777 residency ink',
  metadata: { tier: 'monthly', residencyRefill: '1777' },
});

created.PRO_YEARLY = await createPrice({
  productName: 'AKAsheet Pro Yearly',
  unitAmount: 6660,
  recurring: { interval: 'year' },
  nickname: 'Pro Yearly — $66.60/yr · 13,500 residency ink',
  metadata: { tier: 'yearly', residencyRefill: '13500' },
});

// Session Pack removed from Ink Store.

created.INK_REFILL = await createPrice({
  productName: 'Permanent Ink — Studio Pack',
  unitAmount: 777,
  nickname: 'Studio Pack — 1,000 ink ($7.77)',
  metadata: { inkAmount: '1000', pack: 'INK_REFILL' },
});

created.INK_ARTIST = await createPrice({
  productName: 'Permanent Ink — Artist Bundle',
  unitAmount: 1777,
  nickname: 'Artist Bundle — 2,500 ink ($17.77)',
  metadata: { inkAmount: '2500', pack: 'INK_ARTIST' },
});

created.INK_VAULT = await createPrice({
  productName: 'Permanent Ink — Studio Vault',
  unitAmount: 3444,
  nickname: 'Studio Vault — 5,000 ink ($34.44)',
  metadata: { inkAmount: '5000', pack: 'INK_VAULT' },
});

console.log('\n# Add to .env (Growth ↔ Balanced pricing v2)\n');
for (const [key, price] of Object.entries(created)) {
  console.log(`STRIPE_PRICE_${key}=${price.id}`);
}
console.log('');
