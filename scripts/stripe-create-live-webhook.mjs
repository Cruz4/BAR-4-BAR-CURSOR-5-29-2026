/**
 * List or create LIVE Stripe webhook for AKAsheet production URL.
 *
 * Prerequisites: STRIPE_SECRET_KEY=sk_live_... in .env
 *
 * Usage:
 *   npm run stripe:create-live-webhook          # list only
 *   npm run stripe:create-live-webhook -- --create
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');
const WEBHOOK_URL = 'https://akasheet.com/api/stripe/webhook';

const EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'account.updated',
  'charge.dispute.created',
  'payout.failed',
  'radar.early_fraud_warning.created',
];

function loadEnv() {
  if (!existsSync(envPath)) return;
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

function setEnvKey(key, value) {
  let text = readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    text = text.trimEnd() + '\n' + line + '\n';
  }
  writeFileSync(envPath, text.endsWith('\n') ? text : text + '\n', 'utf8');
}

loadEnv();

const create = process.argv.includes('--create');
const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!secretKey?.startsWith('sk_live_')) {
  console.error('Set STRIPE_SECRET_KEY=sk_live_... in .env (Live mode) before running.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const ours = existing.data.filter((e) => e.url === WEBHOOK_URL);

console.log(`\nLive webhooks for ${WEBHOOK_URL}: ${ours.length}\n`);
for (const e of ours) {
  console.log(`  ${e.id}  status=${e.status}  events=${e.enabled_events.length}`);
  for (const ev of EVENTS) {
    if (!e.enabled_events.includes(ev)) console.log(`    missing event: ${ev}`);
  }
}

if (!create) {
  if (ours.length === 0) {
    console.log('\nNo live endpoint yet. Create one:');
    console.log('  npm run stripe:create-live-webhook -- --create\n');
    console.log('Or in Dashboard (Live mode ON): Developers → Webhooks → Add endpoint');
    console.log(`  URL: ${WEBHOOK_URL}`);
    console.log('  Events:', EVENTS.join(', '));
  }
  process.exit(0);
}

if (ours.length > 0) {
  console.error('\nEndpoint already exists. Reveal signing secret in Dashboard → Webhooks → that endpoint.');
  console.error('Do not run --create again (you would get a duplicate endpoint).');
  process.exit(1);
}

const endpoint = await stripe.webhookEndpoints.create({
  url: WEBHOOK_URL,
  enabled_events: EVENTS,
  description: 'AKAsheet production (live)',
});

const whsec = endpoint.secret;
if (!whsec) {
  console.error('Created endpoint but no secret returned. Reveal in Dashboard:', endpoint.id);
  process.exit(1);
}

setEnvKey('STRIPE_WEBHOOK_SECRET', whsec);
console.log('\nCreated live webhook:', endpoint.id);
console.log('Updated .env → STRIPE_WEBHOOK_SECRET (live whsec_)');
console.log('\nNext:');
console.log('  1. Copy STRIPE_WEBHOOK_SECRET to .firebase/lyricai-studio-otgxn/functions/.env');
console.log('  2. npm run stripe:webhook-env');
console.log('  3. npm run deploy:live\n');
