#!/usr/bin/env node
/**
 * Inspect recent live signups + run a real backend welcome-Ink grant
 * through POST /api/usage/init (same path new artists hit).
 *
 * Usage: node scripts/verify-signup-welcome-ink.mjs
 */
import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIGNUP_INK = 250;
const PREVIEW_HOURS = 48;
const INIT_URL = process.env.WELCOME_INK_INIT_URL?.trim() || 'https://akasheet.com/api/usage/init';

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
loadEnvFile(resolve(root, '.env.local'));

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
  throw new Error('Missing Firebase Admin credentials.');
}

function redactEmail(email) {
  if (!email) return '(none)';
  const [user, domain] = String(email).split('@');
  if (!domain) return '(invalid)';
  const keep = user.slice(0, 2);
  return `${keep}***@${domain}`;
}

function hoursFromNow(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round((ms / (60 * 60 * 1000)) * 10) / 10;
}

function registrySecret() {
  return (
    process.env.IDENTITY_REGISTRY_SECRET?.trim() ||
    process.env.INVITE_GATE_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim()?.slice(0, 32) ||
    'b4b-dev-identity-registry-secret-change-me'
  );
}

function hashIdentityEmail(email) {
  return createHash('sha256')
    .update(`${registrySecret()}:${String(email).trim().toLowerCase()}`)
    .digest('hex');
}

function loadWebApiKey() {
  const fromEnv =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
    process.env.FIREBASE_WEB_API_KEY?.trim() ||
    '';
  if (fromEnv) return fromEnv;
  const clientPath = resolve(root, 'src/lib/firebase/client/firebase.ts');
  if (!existsSync(clientPath)) return '';
  const src = readFileSync(clientPath, 'utf8');
  const match = src.match(/apiKey:\s*'([^']+)'/);
  return match?.[1] || '';
}

async function exchangeCustomToken(apiKey, customToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const body = await res.json();
  if (!res.ok || !body.idToken) {
    throw new Error(`Token exchange failed: ${body.error?.message || res.status}`);
  }
  return body.idToken;
}

async function callUsageInit(idToken, userId) {
  const res = await fetch(INIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ userId }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 400) };
}

function snapshotRow(authUser, userDoc, balanceDoc, registryDoc) {
  const previewAt = userDoc?.proFeaturePreviewExpiresAt || null;
  const resInk = balanceDoc?.residencyBalance ?? null;
  const missingGrant =
    authUser.emailVerified &&
    (resInk === null || resInk < SIGNUP_INK - 5) &&
    !userDoc?.returningIdentity;
  return {
    uid: authUser.uid.slice(0, 8) + '…',
    email: redactEmail(authUser.email),
    created: authUser.metadata.creationTime,
    verified: authUser.emailVerified,
    pendingWelcomeInk: Boolean(userDoc?.pendingWelcomeInk),
    returning: Boolean(userDoc?.returningIdentity),
    previewHours: hoursFromNow(previewAt),
    residency: resInk,
    purchased: balanceDoc?.purchasedBalance ?? null,
    skipped: Boolean(balanceDoc?.signupGrantSkipped),
    reconciled: Boolean(balanceDoc?.welcomeInkReconciled),
    registryWelcome: Boolean(registryDoc?.welcomeInkGrantedAt),
    missingGrant,
  };
}

async function inspectRecentDetail(auth, db, limit = 6) {
  const listed = await auth.listUsers(1000);
  const recent = listed.users
    .filter((u) => !u.disabled)
    .sort((a, b) => new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime))
    .slice(0, limit);

  const rows = [];
  for (const u of recent) {
    const email = u.email || '';
    const [userSnap, balSnap, regSnap] = await Promise.all([
      db.doc(`users/${u.uid}`).get(),
      db.doc(`users/${u.uid}/usage/balance`).get(),
      email
        ? db.doc(`identityRegistry/${hashIdentityEmail(email)}`).get()
        : Promise.resolve({ exists: false, data: () => null }),
    ]);
    const userDoc = userSnap.exists ? userSnap.data() : null;
    const balanceDoc = balSnap.exists ? balSnap.data() : null;
    const rd = regSnap.exists ? regSnap.data() : null;
    const grantedToOther =
      Boolean(rd?.welcomeInkGrantedToUid && rd.welcomeInkGrantedToUid !== u.uid);
    let oldAccount = null;
    if (grantedToOther) {
      try {
        await auth.getUser(rd.welcomeInkGrantedToUid);
        oldAccount = 'auth-exists';
      } catch (e) {
        oldAccount = e.code || 'gone';
      }
    }
    rows.push({
      uid: u.uid.slice(0, 8) + '…',
      created: u.metadata.creationTime,
      provider: (u.providerData || []).map((p) => p.providerId),
      verified: u.emailVerified,
      returning: Boolean(userDoc?.returningIdentity),
      pending: Boolean(userDoc?.pendingWelcomeInk),
      res: balanceDoc?.residencyBalance ?? null,
      skipped: Boolean(balanceDoc?.signupGrantSkipped),
      previewHours: hoursFromNow(userDoc?.proFeaturePreviewExpiresAt),
      registryToOtherUid: grantedToOther,
      oldAccount,
      previewRegToOther: Boolean(
        rd?.proFeaturePreviewGrantedToUid && rd.proFeaturePreviewGrantedToUid !== u.uid
      ),
    });
  }
  return rows;
}

async function inspectRecent(auth, db, limit = 12) {
  const listed = await auth.listUsers(1000);
  const recent = listed.users
    .filter((u) => !u.disabled)
    .sort((a, b) => new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime))
    .slice(0, limit);

  const rows = [];
  for (const u of recent) {
    const email = u.email || '';
    const [userSnap, balSnap, regSnap] = await Promise.all([
      db.doc(`users/${u.uid}`).get(),
      db.doc(`users/${u.uid}/usage/balance`).get(),
      email ? db.doc(`identityRegistry/${hashIdentityEmail(email)}`).get() : Promise.resolve({ exists: false, data: () => null }),
    ]);
    rows.push(
      snapshotRow(
        u,
        userSnap.exists ? userSnap.data() : null,
        balSnap.exists ? balSnap.data() : null,
        regSnap.exists ? regSnap.data() : null
      )
    );
  }
  return rows;
}

async function deleteProbe(auth, db, uid, email) {
  try {
    await db.doc(`users/${uid}/usage/balance`).delete();
  } catch {
    /* ignore */
  }
  try {
    const ledger = await db.collection(`users/${uid}/usage/ledger`).listDocuments();
    await Promise.all(ledger.map((d) => d.delete()));
  } catch {
    /* ignore */
  }
  try {
    await db.doc(`users/${uid}`).delete();
  } catch {
    /* ignore */
  }
  if (email) {
    try {
      await db.doc(`identityRegistry/${hashIdentityEmail(email)}`).delete();
    } catch {
      /* ignore */
    }
  }
  try {
    await auth.deleteUser(uid);
  } catch {
    /* ignore */
  }
}

async function probeGrant(auth, db, apiKey, { emailVerified }) {
  const stamp = Date.now();
  const email = `inkprobe.${stamp}.${randomBytes(3).toString('hex')}@akasheet.com`;
  const password = `Tmp!${randomBytes(12).toString('hex')}`;
  const user = await auth.createUser({
    email,
    password,
    emailVerified,
    displayName: 'Ink Probe (delete me)',
  });
  const uid = user.uid;
  const result = {
    emailVerified,
    uid: uid.slice(0, 8) + '…',
    email: redactEmail(email),
  };

  try {
    const customToken = await auth.createCustomToken(uid);
    const idToken = await exchangeCustomToken(apiKey, customToken);
    const init = await callUsageInit(idToken, uid);
    result.initStatus = init.status;
    result.initOk = init.ok;
    result.initBody = init.json || init.text;

    const [userSnap, balSnap] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.doc(`users/${uid}/usage/balance`).get(),
    ]);
    const userDoc = userSnap.exists ? userSnap.data() : null;
    const balanceDoc = balSnap.exists ? balSnap.data() : null;
    result.residency = balanceDoc?.residencyBalance ?? null;
    result.purchased = balanceDoc?.purchasedBalance ?? null;
    result.skipped = Boolean(balanceDoc?.signupGrantSkipped);
    result.pendingWelcomeInk = Boolean(userDoc?.pendingWelcomeInk);
    result.previewHours = hoursFromNow(userDoc?.proFeaturePreviewExpiresAt);
    result.previewAt = userDoc?.proFeaturePreviewExpiresAt || null;

    const gotInk = (result.residency || 0) >= SIGNUP_INK - 5;
    const gotPreview =
      result.previewHours != null &&
      result.previewHours > PREVIEW_HOURS - 2 &&
      result.previewHours <= PREVIEW_HOURS + 2;
    result.pass = emailVerified ? gotInk && gotPreview : result.residency === 0 && result.pendingWelcomeInk;
    result.expected = emailVerified
      ? `${SIGNUP_INK} residency + ~${PREVIEW_HOURS}h preview`
      : '0 ink pending verify';
  } finally {
    await deleteProbe(auth, db, uid, email);
  }

  return result;
}

async function main() {
  const sa = loadServiceAccount();
  if (!getApps().length) {
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const auth = getAuth();
  const db = getFirestore();
  const apiKey = loadWebApiKey();
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY');

  console.log('== Recent signups (live) ==');
  const recent = await inspectRecent(auth, db, 12);
  console.log(JSON.stringify(recent, null, 2));
  const missing = recent.filter((r) => r.missingGrant);
  console.log(`missingGrantCount=${missing.length}`);

  console.log('== Recent signup identity detail ==');
  console.log(JSON.stringify(await inspectRecentDetail(auth, db, 6), null, 2));

  if (process.argv.includes('--inspect-only')) return;

  console.log(`\n== Live POST ${INIT_URL} (verified new user) ==`);
  const verified = await probeGrant(auth, db, apiKey, { emailVerified: true });
  console.log(JSON.stringify(verified, null, 2));

  console.log('\n== Live POST (unverified new user) ==');
  const unverified = await probeGrant(auth, db, apiKey, { emailVerified: false });
  console.log(JSON.stringify(unverified, null, 2));

  const ok = verified.pass === true;
  if (!ok) {
    console.error('\nFAIL: verified new user did not receive 250 Ink + 48h preview.');
    process.exitCode = 1;
  } else {
    console.log('\nPASS: verified new user received welcome Ink + 48h preview.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
