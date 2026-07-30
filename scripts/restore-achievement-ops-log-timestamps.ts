/**
 * Restore achievement ops-log timestamps to the real unlock time.
 * Prefers unlockedAt on the log, else looks up users/.../gamification/summary.
 *
 * Usage: npx tsx scripts/restore-achievement-ops-log-timestamps.ts
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

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

async function main() {
  const db = getFirestore();
  const logsCol = db.collection('system').doc('logs').collection('entries');
  const snap = await logsCol.where('type', '==', 'achievement').get();
  console.log('found', snap.size, 'achievement logs');

  const summaryCache = new Map<string, Record<string, string>>();

  async function unlockTimeFromSummary(userId: string, achievementId: string): Promise<string | null> {
    if (!summaryCache.has(userId)) {
      const gamSnap = await db.doc(`users/${userId}/gamification/summary`).get();
      const unlocked = (gamSnap.data()?.unlockedAchievements || {}) as Record<string, string>;
      summaryCache.set(userId, unlocked);
    }
    const unlocked = summaryCache.get(userId) || {};
    const raw = unlocked[achievementId];
    return isIsoDate(raw) ? raw : null;
  }

  let batch = db.batch();
  let n = 0;
  let updated = 0;
  let missing = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const userId = String(data.userId || '');
    const achievementId = typeof data.achievementId === 'string' ? data.achievementId.trim() : '';

    let unlockTime: string | null = isIsoDate(data.unlockedAt) ? data.unlockedAt : null;
    if (!unlockTime && userId && achievementId) {
      unlockTime = await unlockTimeFromSummary(userId, achievementId);
    }
    if (!unlockTime) {
      missing += 1;
      continue;
    }

    if (data.timestamp === unlockTime && data.unlockedAt === unlockTime) continue;

    batch.update(doc.ref, {
      timestamp: unlockTime,
      unlockedAt: unlockTime,
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

  console.log(JSON.stringify({ ok: true, updated, missing, total: snap.size }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
