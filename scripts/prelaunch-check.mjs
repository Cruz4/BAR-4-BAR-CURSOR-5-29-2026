#!/usr/bin/env node
/**
 * Runs automated pre-launch checks. Full tracked checklist: docs/PRE_LAUNCH_CHECKLIST.md
 */
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checklist = resolve(root, 'docs/PRE_LAUNCH_CHECKLIST.md');

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

console.log('\n=== Bar 4 Bar pre-launch check ===\n');
console.log(`Tracked checklist: ${checklist}\n`);

const run = (label, script) => {
  console.log(`--- ${label} ---`);
  const r = spawnSync('npm', ['run', script], { cwd: root, stdio: 'inherit', shell: true });
  console.log(r.status === 0 ? `✓ ${label}\n` : `✗ ${label} (exit ${r.status})\n`);
  return r.status === 0;
};

let ok = true;
ok = run('stripe:webhook-env', 'stripe:webhook-env') && ok;
ok = run('stripe:verify', 'stripe:verify') && ok;

const required = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_INK_REFILL',
];
const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.log('✗ Missing env:', missing.join(', '));
  ok = false;
} else {
  console.log('✓ Core Stripe env keys present');
}

const sk = process.env.STRIPE_SECRET_KEY || '';
if (sk.startsWith('sk_test_')) {
  console.log('\nNote: STRIPE_SECRET_KEY is TEST mode — use sk_live_ before Phase E (live cutover).');
}
if (!process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim() && sk.startsWith('sk_test_')) {
  console.log('Warning: STRIPE_WEBHOOK_SECRET_TEST not set (sandbox webhooks may fail).');
}

console.log('\nManual blockers still required (see checklist):');
console.log('  - End-to-end test checkout on production URL');
console.log('  - Webhook HTTP 200 in Stripe Dashboard');
console.log('  - Legal pages review');
console.log('  - One live purchase after going Live\n');

process.exit(ok ? 0 : 1);
