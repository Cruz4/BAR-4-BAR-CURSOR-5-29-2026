#!/usr/bin/env node
/**
 * Validates Stripe webhook env before deploy.
 * Compare secretPrefix output to Stripe Dashboard → Webhooks → endpoint → Reveal (first chars).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, '.env'));
loadEnvFile(resolve(root, '.env.local'));

function prefix(secret) {
  if (!secret) return null;
  return secret.startsWith('whsec_') ? secret.slice(0, 12) + '…' : secret.slice(0, 8) + '…';
}

const live = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const test = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();
const sk = process.env.STRIPE_SECRET_KEY?.trim();

console.log('Stripe webhook env check\n');
console.log('STRIPE_SECRET_KEY:', sk ? (sk.startsWith('sk_live_') ? 'sk_live_…' : 'sk_test_…') : 'MISSING');
console.log('STRIPE_WEBHOOK_SECRET (live/legacy):', live ? prefix(live) : 'not set');
console.log('STRIPE_WEBHOOK_SECRET_TEST (sandbox):', test ? prefix(test) : 'not set');

if (!live && !test) {
  console.error('\nNo webhook secrets. Add at least one:');
  console.error('  STRIPE_WEBHOOK_SECRET_TEST=whsec_…  # AKAsheet sandbox → b4b-b4b → Reveal');
  console.error('  STRIPE_WEBHOOK_SECRET=whsec_…       # Live endpoint when you go live');
  process.exit(1);
}

if (!test && sk?.startsWith('sk_test_')) {
  console.warn('\nWarning: sk_test_ without STRIPE_WEBHOOK_SECRET_TEST.');
  console.warn('Sandbox webhooks need the signing secret from Dashboard (Test mode), not stripe listen.');
}

console.log('\nBefore deploy:');
console.log('1. Stripe Dashboard (Test mode) → Webhooks → b4b-b4b → Reveal signing secret');
console.log('2. Set STRIPE_WEBHOOK_SECRET_TEST to that whsec_ (or STRIPE_WEBHOOK_SECRET if only one endpoint)');
console.log('3. npm run deploy:live  (Firebase copies .env to Cloud Run)');
console.log('4. Resend a failed event in Stripe → expect HTTP 200\n');
