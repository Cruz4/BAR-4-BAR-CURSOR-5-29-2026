/**
 * Backfill Neural Operation Stream rows for existing achievement unlocks.
 * Usage: npx tsx scripts/backfill-achievement-ops-logs.ts
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ACHIEVEMENTS, getAchievement } from '../src/lib/gamification/achievements';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path: string) {
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

const db = getFirestore();

function unlockKey(userId: string, achievementId: string) {
  return `${userId}::${achievementId}`;
}
function titleKey(userId: string, title: string) {
  return `${userId}::title:${title.trim().toLowerCase()}`;
}

async function main() {
  const logsCol = db.collection('system').doc('logs').collection('entries');
  const existingKeys = new Set<string>();
  const existingSnap = await logsCol.where('type', '==', 'achievement').get();
  for (const doc of existingSnap.docs) {
    const data = doc.data() || {};
    const userId = String(data.userId || '');
    if (!userId) continue;
    const achievementId = typeof data.achievementId === 'string' ? data.achievementId.trim() : '';
    if (achievementId) existingKeys.add(unlockKey(userId, achievementId));
    const action = typeof data.action === 'string' ? data.action : '';
    if (action.startsWith('Achievement: ')) {
      existingKeys.add(titleKey(userId, action.slice('Achievement: '.length)));
    }
  }

  const usersSnap = await db.collection('users').get();
  let unlocksSeen = 0;
  let logsWritten = 0;
  let skippedExisting = 0;

  let batch = db.batch();
  let batchCount = 0;
  const flush = async () => {
    if (batchCount === 0) return;
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  };

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const profile = userDoc.data() || {};
    const userName =
      (typeof profile.displayName === 'string' && profile.displayName.trim()) ||
      (typeof profile.email === 'string' && profile.email.trim()) ||
      'Artist';

    const gamSnap = await db.doc(`users/${userId}/gamification/summary`).get();
    if (!gamSnap.exists) continue;
    const unlocked = (gamSnap.data()?.unlockedAchievements || {}) as Record<string, string>;

    for (const [achievementId, unlockedAtRaw] of Object.entries(unlocked)) {
      unlocksSeen += 1;
      const def = getAchievement(achievementId) || ACHIEVEMENTS.find((a) => a.id === achievementId);
      const title = def?.title || achievementId;
      const inkReward = Math.max(0, Number(def?.inkReward) || 0);
      const xpReward = Math.max(0, Number(def?.xpReward) || 0);

      if (
        existingKeys.has(unlockKey(userId, achievementId)) ||
        existingKeys.has(titleKey(userId, title))
      ) {
        skippedExisting += 1;
        continue;
      }

      const unlockedAt =
        typeof unlockedAtRaw === 'string' && unlockedAtRaw.trim()
          ? unlockedAtRaw.trim()
          : new Date().toISOString();

      const detailParts: string[] = [];
      if (inkReward > 0) detailParts.push(`+${inkReward} Ink`);
      if (xpReward > 0) detailParts.push(`+${xpReward} XP`);
      if (def?.description) detailParts.push(def.description);
      else detailParts.push(achievementId);

      const ref = logsCol.doc();
      batch.set(ref, {
        timestamp: unlockedAt,
        unlockedAt,
        userId,
        userName,
        action: `Achievement: ${title}`,
        usdCost: 0,
        inkUsed: inkReward,
        inkDelta: inkReward,
        type: 'achievement',
        achievementId,
        backfilled: true,
        details: detailParts.join(' · '),
      });
      batchCount += 1;
      logsWritten += 1;
      existingKeys.add(unlockKey(userId, achievementId));
      existingKeys.add(titleKey(userId, title));
      if (batchCount >= 400) await flush();
    }
  }

  await flush();

  console.log(
    JSON.stringify(
      {
        ok: true,
        usersScanned: usersSnap.size,
        unlocksSeen,
        logsWritten,
        skippedExisting,
        existingAchievementLogs: existingSnap.size,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
