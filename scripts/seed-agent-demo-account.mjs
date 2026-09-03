#!/usr/bin/env node
/**
 * Creates/updates a dedicated agent demo login:
 * - Firebase Auth email/password
 * - Studio Pro (yearly)
 * - 10,000 permanent Ink
 *
 * Credentials are written to .env.local only (gitignored).
 *
 * Usage: node scripts/seed-agent-demo-account.mjs
 * Optional: AGENT_DEMO_EMAIL=... AGENT_DEMO_PASSWORD=... node scripts/seed-agent-demo-account.mjs
 */
import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envLocalPath = resolve(root, '.env.local');
const DEFAULT_EMAIL = 'agent.demo@akasheet.com';
const DEMO_INK = 10_000;
const DEMO_DISPLAY_NAME = 'Agent Demo (Pro)';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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
loadEnvFile(envLocalPath);

function loadServiceAccount() {
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (keyJson) return JSON.parse(keyJson);

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const candidates = [
    credPath ? resolve(root, credPath) : null,
    resolve(root, 'firebase-service-account.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  throw new Error(
    'Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY.'
  );
}

function generatePassword() {
  // Avoid ambiguous chars for agents copying into browsers.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?';
  const bytes = randomBytes(24);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function upsertEnvLocal(updates) {
  let text = existsSync(envLocalPath) ? readFileSync(envLocalPath, 'utf8') : '';
  if (!text.endsWith('\n') && text.length > 0) text += '\n';

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) {
      text = text.replace(re, line);
    } else {
      if (!text.includes('# Agent demo login')) {
        text += `\n# Agent demo login (Pro + 10k Ink) — do not commit\n`;
      }
      text += `${line}\n`;
    }
  }

  writeFileSync(envLocalPath, text, 'utf8');
}

async function main() {
  const email = (process.env.AGENT_DEMO_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.AGENT_DEMO_PASSWORD?.trim() || generatePassword();
  const sa = loadServiceAccount();

  if (!getApps().length) {
    initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID || 'lyricai-studio-otgxn',
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const now = new Date().toISOString();

  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      password,
      emailVerified: true,
      displayName: DEMO_DISPLAY_NAME,
      disabled: false,
    });
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
    user = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: DEMO_DISPLAY_NAME,
    });
    created = true;
  }

  const uid = user.uid;
  await db.doc(`users/${uid}`).set(
    {
      displayName: DEMO_DISPLAY_NAME,
      email,
      role: 'artist',
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionTier: 'yearly',
      emailVerified: true,
      agentDemoAccount: true,
      updatedAt: now,
      ...(created ? { createdAt: now } : {}),
    },
    { merge: true }
  );

  await db.doc(`users/${uid}/usage/balance`).set(
    {
      residencyBalance: 0,
      trialInkBalance: 0,
      purchasedBalance: DEMO_INK,
      balance: DEMO_INK,
      signupGranted: true,
      signupGrantSkipped: false,
      welcomeInkReconciled: true,
      lastRewardReason: 'agent_demo_seed',
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection('system').doc('logs').collection('entries').add({
    timestamp: now,
    userId: uid,
    userName: email,
    action: 'agent_demo_seed',
    inkUsed: 0,
    type: 'admin',
    details: `Seeded Pro yearly + ${DEMO_INK} permanent Ink (${created ? 'created' : 'updated'})`,
  });

  upsertEnvLocal({
    AGENT_DEMO_EMAIL: email,
    AGENT_DEMO_PASSWORD: password,
    AGENT_DEMO_UID: uid,
  });

  console.log('\n=== Agent demo account ready ===\n');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`UID:      ${uid}`);
  console.log(`Tier:     Studio Pro (yearly)`);
  console.log(`Ink:      ${DEMO_INK.toLocaleString()} permanent`);
  console.log(`Auth:     ${created ? 'created' : 'updated'}`);
  console.log(`Saved to: .env.local (AGENT_DEMO_EMAIL / AGENT_DEMO_PASSWORD / AGENT_DEMO_UID)`);
  console.log('\nLogin: http://localhost:9002/login  or  https://akasheet.com/login\n');
}

main().catch((err) => {
  console.error('[seed-agent-demo-account] failed:', err);
  process.exit(1);
});
