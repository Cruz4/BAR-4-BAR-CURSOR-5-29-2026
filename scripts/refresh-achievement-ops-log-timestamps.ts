/**
 * Bump existing achievement ops-log timestamps to "now" so they appear
 * in the recent Neural Operation Stream (they were buried under AI noise).
 *
 * Usage: npx tsx scripts/refresh-achievement-ops-log-timestamps.ts
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
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
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  throw new Error('Missing Firebase Admin credentials.');
}

if (!getApps().length) {
  const sa = loadServiceAccount();
  initializeApp({
    credential: cert(sa),
    projectId: sa.project_id || process.env.GCLOUD_PROJECT || 'lyricai-studio-otgxn',
  });
}

async function main() {
  const db = getFirestore();
  const logsCol = db.collection('system').doc('logs').collection('entries');
  const snap = await logsCol.where('type', '==', 'achievement').get();
  console.log('found', snap.size, 'achievement logs');

  let batch = db.batch();
  let n = 0;
  let updated = 0;
  const now = Date.now();

  for (const [i, doc] of snap.docs.entries()) {
    const data = doc.data() || {};
    const unlockedAt =
      (typeof data.unlockedAt === 'string' && data.unlockedAt) ||
      (typeof data.timestamp === 'string' && data.timestamp) ||
      new Date().toISOString();

    // Stagger by ms so sort order is stable / readable
    const timestamp = new Date(now - (snap.size - i) * 10).toISOString();

    batch.update(doc.ref, {
      timestamp,
      unlockedAt,
      refreshedAt: new Date().toISOString(),
    });
    n += 1;
    updated += 1;
    if (n >= 400) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();

  console.log(JSON.stringify({ ok: true, updated }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
