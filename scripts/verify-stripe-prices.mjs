/**
 * Verifies configured Stripe price IDs exist and are the correct type (recurring vs one-time).
 * Usage: node scripts/verify-stripe-prices.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

loadEnv();

const env = (key, fallback) => process.env[key]?.trim() || fallback;

const PRICES = {
  PRO_MONTHLY: { id: env('STRIPE_PRICE_PRO_MONTHLY', 'price_1TcEHIR1AVjROqp3n5ARXBOo'), expect: 'recurring', amount: 777 },
  PRO_YEARLY: { id: env('STRIPE_PRICE_PRO_YEARLY', 'price_1TcDtcR1AVjROqp3yy51oUYx'), expect: 'recurring', amount: 5328 },
  INK_REFILL: { id: env('STRIPE_PRICE_INK_REFILL', 'price_1TcDYlR1AVjROqp3dVwsVof0'), expect: 'one_time', amount: 777 },
  INK_ARTIST: { id: env('STRIPE_PRICE_INK_ARTIST', 'price_1TcDYlR1AVjROqp3Rt3UjuTN'), expect: 'one_time', amount: 1111 },
  INK_VAULT: { id: env('STRIPE_PRICE_INK_VAULT', 'price_1TcDYmR1AVjROqp3S0hy1WOd'), expect: 'one_time', amount: 1944 },
};

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const stripe = new Stripe(key);
let failed = 0;

console.log('Verifying Stripe prices...\n');

for (const [name, { id, expect, amount }] of Object.entries(PRICES)) {
  try {
    const price = await stripe.prices.retrieve(id);
    const kind = price.type;
    const ok = kind === expect && price.unit_amount === amount;
    console.log(`${ok ? '✓' : '✗'} ${name}: ${id} (${kind}, $${((price.unit_amount || 0) / 100).toFixed(2)}, active=${price.active})`);
    if (!ok || !price.active) failed++;
  } catch (e) {
    console.log(`✗ ${name}: ${id} — ${e.message}`);
    failed++;
  }
}

console.log(failed ? `\n${failed} issue(s). Fix before go-live.` : '\nAll prices OK.');
process.exit(failed ? 1 : 0);
