#!/usr/bin/env node
/**
 * If STRIPE_WEBHOOK_SECRET_TEST is missing, copy STRIPE_WEBHOOK_SECRET into .env
 * so sandbox and legacy vars match after you paste the Dashboard whsec_ into STRIPE_WEBHOOK_SECRET.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

if (!existsSync(envPath)) {
  console.error('No .env file found.');
  process.exit(1);
}

let text = readFileSync(envPath, 'utf8');
const get = (key) => {
  const m = text.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};

const live = get('STRIPE_WEBHOOK_SECRET');
const test = get('STRIPE_WEBHOOK_SECRET_TEST');

if (!live) {
  console.error('STRIPE_WEBHOOK_SECRET is not set in .env');
  process.exit(1);
}

if (test) {
  console.log('STRIPE_WEBHOOK_SECRET_TEST already set — no change.');
  process.exit(0);
}

const line = `STRIPE_WEBHOOK_SECRET_TEST=${live}`;
text = text.trimEnd() + '\n' + line + '\n';
writeFileSync(envPath, text, 'utf8');
console.log('Added STRIPE_WEBHOOK_SECRET_TEST (copied from STRIPE_WEBHOOK_SECRET).');
console.log('If sandbox webhooks still fail, replace BOTH with the whsec_ from Dashboard → Test mode → b4b-b4b → Reveal.');
