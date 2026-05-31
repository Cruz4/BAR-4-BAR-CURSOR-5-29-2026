import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { getAchievement } from '@/lib/gamification/achievements';
import { getDayKey, getMonthKey, getWeekKey } from '@/lib/gamification/challenges';
import { rankFromXp } from '@/lib/gamification/ranks';
import { computeStreakFromSessionDates } from '@/lib/gamification/streak';
import {
  DEFAULT_GAMIFICATION_SUMMARY,
  type GamificationSummary,
  type GamificationTrigger,
  type GamificationUnlock,
} from '@/lib/gamification/types';
import type { AnalyticsEventName } from '@/lib/analytics-events';

export const MAX_BONUS_INK_PER_MONTH = 150;
export const MAX_DAILY_XP = 500;

export type GamificationEventMetadata = Record<string, string | number | boolean | null>;

function slugify(name: string, uid: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `${base || 'artist'}-${uid.slice(0, 6)}`;
}

function countNonEmptyBars(sections: unknown): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((acc: number, s: any) => {
    const bars = s?.bars;
    if (!Array.isArray(bars)) return acc;
    return acc + bars.filter((b: any) => String(b?.text || '').trim().length > 0).length;
  }, 0);
}

function mergeSummary(existing: Partial<GamificationSummary>): GamificationSummary {
  return {
    ...DEFAULT_GAMIFICATION_SUMMARY,
    ...existing,
    unlockedAchievements: existing.unlockedAchievements || {},
    weeklyChallengeProgress: existing.weeklyChallengeProgress || {},
    monthlyChallengeProgress: existing.monthlyChallengeProgress || {},
    personalBests: { ...DEFAULT_GAMIFICATION_SUMMARY.personalBests, ...(existing.personalBests || {}) },
  };
}

function resetWeekCounters(summary: GamificationSummary, weekKey: string): GamificationSummary {
  if (summary.weeklyChallengeWeekKey === weekKey) return summary;
  return {
    ...summary,
    weeklyChallengeWeekKey: weekKey,
    weeklyChallengeProgress: {},
    generateNextLineWeekCount: 0,
    tracksCompletedWeekCount: 0,
    dnaFilledWeekCount: 0,
  };
}

function resetMonthCounters(summary: GamificationSummary, monthKey: string): GamificationSummary {
  if (summary.monthlyChallengeMonthKey === monthKey) return summary;
  return {
    ...summary,
    monthlyChallengeMonthKey: monthKey,
    monthlyChallengeProgress: {},
    generateNextLineMonthCount: 0,
    tracksCompletedMonthCount: 0,
  };
}

function resetDayBarCounter(summary: GamificationSummary, dayKey: string): GamificationSummary {
  if (summary.barsWrittenDayKey === dayKey) return summary;
  return { ...summary, barsWrittenDayKey: dayKey, barsWrittenToday: 0 };
}

function resetBonusMonth(summary: GamificationSummary, monthKey: string): GamificationSummary {
  if (summary.bonusInkMonthKey === monthKey) return summary;
  return { ...summary, bonusInkMonthKey: monthKey, bonusInkGrantedThisMonth: 0 };
}

async function grantBonusInk(uid: string, amount: number, summary: GamificationSummary): Promise<number> {
  if (amount <= 0) return 0;
  const monthKey = getMonthKey();
  summary = resetBonusMonth(summary, monthKey);
  const remaining = MAX_BONUS_INK_PER_MONTH - (summary.bonusInkGrantedThisMonth || 0);
  const grant = Math.min(amount, remaining);
  if (grant <= 0) return 0;

  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const data = snap.data() || { residencyBalance: 0, purchasedBalance: 0 };
    const pur = (data.purchasedBalance || 0) + grant;
    tx.set(
      balanceRef,
      {
        purchasedBalance: pur,
        balance: (data.residencyBalance || 0) + pur,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  summary.bonusInkGrantedThisMonth = (summary.bonusInkGrantedThisMonth || 0) + grant;
  summary.bonusInkMonthKey = monthKey;
  return grant;
}

function tryUnlock(
  summary: GamificationSummary,
  achievementId: string,
  isPro: boolean,
  unlocks: GamificationUnlock[]
): GamificationSummary {
  if (summary.unlockedAchievements[achievementId]) return summary;
  const def = getAchievement(achievementId);
  if (!def) return summary;
  if (def.proOnly && !isPro) return summary;

  summary.unlockedAchievements = {
    ...summary.unlockedAchievements,
    [achievementId]: new Date().toISOString(),
  };
  unlocks.push({
    id: def.id,
    title: def.title,
    description: def.description,
    inkReward: def.inkReward,
    proOnly: def.proOnly,
  });
  return summary;
}

async function syncLeaderboardEntry(
  uid: string,
  summary: GamificationSummary,
  displayName: string
): Promise<void> {
  const db = await getDb();
  if (summary.leaderboardHidden) return;
  const weekKey = getWeekKey();
  await db.doc(`leaderboard_weekly/${weekKey}/entries/${uid}`).set(
    {
      userId: uid,
      displayName,
      xp: summary.xp,
      barsWritten7d: summary.barsWritten7d,
      currentStreak: summary.currentStreak,
      tracksCompleted30d: summary.tracksCompleted30d,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function syncPublicProfile(
  uid: string,
  summary: GamificationSummary,
  displayName: string
): Promise<void> {
  const db = await getDb();
  if (!summary.publicProfile || !summary.profileSlug) {
    const snap = await db.collection('publicProfiles').where('userId', '==', uid).limit(1).get();
    for (const doc of snap.docs) await doc.ref.delete();
    return;
  }

  const badgeIds = Object.keys(summary.unlockedAchievements);
  await db.doc(`publicProfiles/${summary.profileSlug}`).set(
    {
      userId: uid,
      displayName,
      rankId: summary.rankId,
      xp: summary.xp,
      currentStreak: summary.currentStreak,
      longestStreak: summary.longestStreak,
      badgeIds,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function processGamificationEvent(
  userId: string,
  trigger: GamificationTrigger,
  metadata: GamificationEventMetadata = {},
  userName?: string
): Promise<{ unlocks: GamificationUnlock[]; summary: GamificationSummary }> {
  if (!hasAdminFirestoreCredentials()) {
    return { unlocks: [], summary: DEFAULT_GAMIFICATION_SUMMARY };
  }

  const db = await getDb();
  const now = new Date();
  const weekKey = getWeekKey(now);
  const dayKey = getDayKey(now);
  const timestamp = now.toISOString();

  const [gamSnap, analyticsSnap, userSnap] = await Promise.all([
    db.doc(`users/${userId}/gamification/summary`).get(),
    db.doc(`users/${userId}/analytics/summary`).get(),
    db.doc(`users/${userId}`).get(),
  ]);

  let summary = mergeSummary((gamSnap.data() as Partial<GamificationSummary>) || {});
  const analytics = analyticsSnap.data() || {};
  const user = userSnap.data() || {};
  const isPro = user.subscriptionStatus === 'active';
  const displayName = String(userName || user.displayName || 'Artist');
  const unlocks: GamificationUnlock[] = [];

  summary = resetWeekCounters(summary, weekKey);
  summary = resetMonthCounters(summary, getMonthKey(now));
  summary = resetDayBarCounter(summary, dayKey);
  summary = resetBonusMonth(summary, getMonthKey(now));

  let xpGain = 0;
  const sessionDates: string[] = analytics.sessionDates || [];

  if (trigger === 'session_start' && !sessionDates.includes(dayKey)) {
    sessionDates.push(dayKey);
    summary.lifetimeStudioSessions = (summary.lifetimeStudioSessions || 0) + 1;
  }

  summary.currentStreak = computeStreakFromSessionDates(sessionDates, now);
  if (summary.currentStreak > (summary.personalBests.longestStreak || 0)) {
    summary.personalBests.longestStreak = summary.currentStreak;
  }
  if (summary.currentStreak > summary.longestStreak) {
    summary.longestStreak = summary.currentStreak;
  }

  if (trigger === 'smart_structure_used') {
    xpGain += 15;
    summary = tryUnlock(summary, 'first_paste', isPro, unlocks);
  }

  if (trigger === 'tour_complete') {
    summary = tryUnlock(summary, 'tour_graduate', isPro, unlocks);
  }

  if (trigger === 'rhyme_pulse_on') {
    summary = tryUnlock(summary, 'rhyme_pulse_on', isPro, unlocks);
  }

  if (trigger === 'dna_preset_saved') {
    summary = tryUnlock(summary, 'vault_strain', isPro, unlocks);
  }

  if (trigger === 'share_created') {
    summary = tryUnlock(summary, 'share_drop', isPro, unlocks);
  }

  if (trigger === 'album_limit_hit') {
    summary = tryUnlock(summary, 'second_album', isPro, unlocks);
  }

  if (trigger === 'ai_action') {
    const action = String(metadata.actionName || '');
    if (action === 'generateNextLine') {
      if (!analytics.firstGenerateNextLineAt) {
        summary = tryUnlock(summary, 'first_next_bar', isPro, unlocks);
      }
      summary.generateNextLineWeekCount = (summary.generateNextLineWeekCount || 0) + 1;
      summary.generateNextLineMonthCount = (summary.generateNextLineMonthCount || 0) + 1;
      summary.lifetimeGenerateNextLine = (summary.lifetimeGenerateNextLine || 0) + 1;
      if (summary.lastGenerateNextLineDayKey !== dayKey) {
        xpGain += 10;
        summary.lastGenerateNextLineDayKey = dayKey;
      }
    }
  }

  if (trigger === 'track_saved') {
    const barCount = Number(metadata.barCount || 0);
    const prevBarCount = Number(metadata.prevBarCount || 0);
    const delta = Math.max(0, barCount - prevBarCount);
    if (delta > 0) {
      xpGain += Math.min(delta * 5, 50);
      summary.barsWrittenToday = (summary.barsWrittenToday || 0) + delta;
      summary.barsWritten7d = (summary.barsWritten7d || 0) + delta;
      summary.lifetimeBarsWritten = (summary.lifetimeBarsWritten || 0) + delta;
      summary.weeklyChallengeProgress = {
        ...summary.weeklyChallengeProgress,
        barsWeek: (summary.weeklyChallengeProgress.barsWeek || 0) + delta,
      };
      summary.monthlyChallengeProgress = {
        ...summary.monthlyChallengeProgress,
        barsMonth: (summary.monthlyChallengeProgress.barsMonth || 0) + delta,
      };
      if (summary.barsWrittenToday > (summary.personalBests.barsInDay || 0)) {
        summary.personalBests.barsInDay = summary.barsWrittenToday;
      }
      const sessionBars = Number(metadata.sessionBarCount || barCount);
      if (sessionBars > (summary.personalBests.barsInSession || 0)) {
        summary.personalBests.barsInSession = sessionBars;
      }
      if (sessionBars >= 16) {
        summary = tryUnlock(summary, 'bars_16_session', isPro, unlocks);
      }
    }

    if (metadata.trackComplete === true) {
      xpGain += 25;
      summary.tracksCompletedWeekCount = (summary.tracksCompletedWeekCount || 0) + 1;
      summary.tracksCompletedMonthCount = (summary.tracksCompletedMonthCount || 0) + 1;
      summary.tracksCompleted30d = (summary.tracksCompleted30d || 0) + 1;
      summary.lifetimeTracksCompleted = (summary.lifetimeTracksCompleted || 0) + 1;
      summary = tryUnlock(summary, 'track_complete', isPro, unlocks);
    }

    const albumTrackCount = Number(metadata.albumTrackCount || 0);
    if (albumTrackCount >= 3) {
      summary = tryUnlock(summary, 'album_builder', isPro, unlocks);
    }
  }

  if (summary.currentStreak >= 3) summary = tryUnlock(summary, 'streak_3', isPro, unlocks);
  if (summary.currentStreak >= 7) summary = tryUnlock(summary, 'streak_7', isPro, unlocks);
  if (summary.currentStreak >= 30) summary = tryUnlock(summary, 'streak_30', isPro, unlocks);

  if (analytics.firstGenerateNextLineAt && !summary.unlockedAchievements.first_next_bar) {
    summary = tryUnlock(summary, 'first_next_bar', isPro, unlocks);
  }

  xpGain = Math.min(xpGain, MAX_DAILY_XP);
  summary.xp = (summary.xp || 0) + xpGain;
  const rank = rankFromXp(summary.xp, isPro);
  summary.rankId = rank.id;

  if (!summary.profileSlug && displayName) {
    summary.profileSlug = slugify(displayName, userId);
  }

  for (const u of unlocks) {
    const def = getAchievement(u.id);
    if (def?.inkReward) {
      await grantBonusInk(userId, def.inkReward, summary);
    }
    await recordGamificationAnalytics(userId, 'achievement_unlocked', { achievementId: u.id }, displayName);
  }

  if (summary.currentStreak === 3 || summary.currentStreak === 7 || summary.currentStreak === 30) {
    await recordGamificationAnalytics(
      userId,
      'streak_milestone',
      { streak: summary.currentStreak },
      displayName
    );
  }

  summary.updatedAt = timestamp;
  await db.doc(`users/${userId}/gamification/summary`).set(summary, { merge: true });
  await syncLeaderboardEntry(userId, summary, displayName);
  await syncPublicProfile(userId, summary, displayName);

  return { unlocks, summary };
}

export async function processGamificationFromAnalytics(
  userId: string,
  event: AnalyticsEventName,
  metadata: GamificationEventMetadata = {},
  userName?: string
): Promise<void> {
  if (event === 'session_start') {
    await processGamificationEvent(userId, 'session_start', metadata, userName);
    return;
  }
  if (event === 'ai_action') {
    await processGamificationEvent(userId, 'ai_action', metadata, userName);
  }
}

export async function updateGamificationSettings(
  userId: string,
  settings: { publicProfile?: boolean; leaderboardHidden?: boolean; displayName?: string }
): Promise<GamificationSummary> {
  const db = await getDb();
  const snap = await db.doc(`users/${userId}/gamification/summary`).get();
  let summary = mergeSummary((snap.data() as Partial<GamificationSummary>) || {});

  if (typeof settings.publicProfile === 'boolean') {
    summary.publicProfile = settings.publicProfile;
  }
  if (typeof settings.leaderboardHidden === 'boolean') {
    summary.leaderboardHidden = settings.leaderboardHidden;
  }
  if (settings.displayName) {
    summary.profileSlug = slugify(settings.displayName, userId);
  }

  summary.updatedAt = new Date().toISOString();
  await db.doc(`users/${userId}/gamification/summary`).set(summary, { merge: true });

  const userSnap = await db.doc(`users/${userId}`).get();
  const displayName = settings.displayName || userSnap.data()?.displayName || 'Artist';
  await syncPublicProfile(userId, summary, displayName);
  if (!summary.leaderboardHidden) {
    await syncLeaderboardEntry(userId, summary, displayName);
  }

  return summary;
}

export async function recordGamificationAnalytics(
  userId: string,
  event: string,
  metadata: GamificationEventMetadata = {},
  userName?: string
): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;
  try {
    const db = await getDb();
    await db.collection('analytics_events').add({
      userId,
      userName: userName || null,
      event,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[recordGamificationAnalytics]', (e as Error).message);
  }
}

export async function getLeaderboardSnapshot(weekKey = getWeekKey(), userId?: string) {
  const db = await getDb();
  const snap = await db
    .collection(`leaderboard_weekly/${weekKey}/entries`)
    .orderBy('barsWritten7d', 'desc')
    .limit(50)
    .get();

  const streakSnap = await db
    .collection(`leaderboard_weekly/${weekKey}/entries`)
    .orderBy('currentStreak', 'desc')
    .limit(50)
    .get();

  const tracksSnap = await db
    .collection(`leaderboard_weekly/${weekKey}/entries`)
    .orderBy('tracksCompleted30d', 'desc')
    .limit(50)
    .get();

  const xpSnap = await db
    .collection(`leaderboard_weekly/${weekKey}/entries`)
    .orderBy('xp', 'desc')
    .limit(50)
    .get();

  const mapEntry = (doc: { id: string; data: () => Record<string, unknown> }) => ({
    userId: doc.id,
    ...doc.data(),
  });

  const barsWritten7d = snap.docs.map(mapEntry);
  const longestStreak = streakSnap.docs.map(mapEntry);
  const tracksCompleted30d = tracksSnap.docs.map(mapEntry);
  const xp = xpSnap.docs.map(mapEntry);

  const findUserRank = (rows: { userId: string }[], valueKey: string) => {
    if (!userId) return null;
    const idx = rows.findIndex((r) => r.userId === userId);
    if (idx === -1) return null;
    const row = rows[idx] as Record<string, unknown>;
    return {
      rank: idx + 1,
      total: rows.length,
      value: Number(row[valueKey] || 0),
    };
  };

  return {
    weekKey,
    barsWritten7d,
    longestStreak,
    tracksCompleted30d,
    xp,
    userRanks: userId
      ? {
          barsWritten7d: findUserRank(barsWritten7d, 'barsWritten7d'),
          longestStreak: findUserRank(longestStreak, 'currentStreak'),
          tracksCompleted30d: findUserRank(tracksCompleted30d, 'tracksCompleted30d'),
          xp: findUserRank(xp, 'xp'),
        }
      : undefined,
  };
}

export async function getPublicProfile(slug: string) {
  const db = await getDb();
  const snap = await db.doc(`publicProfiles/${slug}`).get();
  if (!snap.exists) return null;
  return snap.data();
}

export { countNonEmptyBars, slugify };
