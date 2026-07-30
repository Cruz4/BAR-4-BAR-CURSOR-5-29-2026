import { getDb } from '@/lib/firebase/server';
import { ACHIEVEMENTS, getAchievement } from '@/lib/gamification/achievements';

export type AchievementOpsBackfillResult = {
  usersScanned: number;
  unlocksSeen: number;
  logsWritten: number;
  skippedExisting: number;
};

function unlockKey(userId: string, achievementId: string) {
  return `${userId}::${achievementId}`;
}

function titleKey(userId: string, title: string) {
  return `${userId}::title:${title.trim().toLowerCase()}`;
}

/**
 * Write Neural Operation Stream rows for achievements already unlocked.
 * Does NOT re-grant Ink — display-only backfill for ops history.
 */
export async function backfillAchievementOpsLogs(): Promise<AchievementOpsBackfillResult> {
  const db = await getDb();
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

  const batchSize = 400;
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

      // timestamp = when the artist unlocked it (not when backfill ran)
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

      if (batchCount >= batchSize) await flush();
    }
  }

  await flush();

  return {
    usersScanned: usersSnap.size,
    unlocksSeen,
    logsWritten,
    skippedExisting,
  };
}
