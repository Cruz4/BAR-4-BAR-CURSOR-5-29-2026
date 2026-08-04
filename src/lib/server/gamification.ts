import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { inkBalanceFirestorePatch, normalizeInkPools } from '@/lib/ink-balance';
import { getAchievement, ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { getDayKey, getMonthKey, getWeekKey } from '@/lib/gamification/challenges';
import { rankFromXp } from '@/lib/gamification/ranks';
import { computeStreakFromSessionDates } from '@/lib/gamification/streak';
import {
  canUnlockAchievement,
  type AchievementVerifyContext,
} from '@/lib/gamification/achievement-verification';
import { ACHIEVEMENT_THRESHOLDS } from '@/lib/gamification/achievement-thresholds';
import {
  DEFAULT_GAMIFICATION_SUMMARY,
  type GamificationSummary,
  type GamificationTrigger,
  type GamificationUnlock,
} from '@/lib/gamification/types';
import type { AdminGamificationRosterEntry } from '@/lib/gamification/admin-roster-types';
import type { AnalyticsEventName } from '@/lib/analytics-events';
import { countLinesWithSource } from '@/lib/gamification/line-attribution';
import { countNonEmptyLines, rhymeBarsToLines } from '@/lib/lyrics-units';
import { ensureReferralCode } from '@/lib/server/referrals';

export const MAX_DAILY_XP = 500;

const EMPTY_VERIFY_CTX: AchievementVerifyContext = {
  tourCompletedVerified: false,
  trackCompleteVerified: false,
  barsOnTrackVerified: 0,
  writtenLinesOnTrackVerified: 0,
  albumTrackCountVerified: 0,
  lifetimeCompletedTracksVerified: 0,
  qualifyingAlbumCountVerified: 0,
  albumCompletedTracksVerified: 0,
  maxBarsOnAnyTrackVerified: 0,
};

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
  return countNonEmptyLines(sections as Parameters<typeof countNonEmptyLines>[0]);
}

function mergeSummary(existing: Partial<GamificationSummary>): GamificationSummary {
  const raw = existing || {};
  const isBrandNew = Object.keys(raw).length === 0;
  return {
    ...DEFAULT_GAMIFICATION_SUMMARY,
    ...raw,
    unlockedAchievements: raw.unlockedAchievements || {},
    weeklyChallengeProgress: raw.weeklyChallengeProgress || {},
    monthlyChallengeProgress: raw.monthlyChallengeProgress || {},
    personalBests: { ...DEFAULT_GAMIFICATION_SUMMARY.personalBests, ...(raw.personalBests || {}) },
    // New accounts default private. Existing docs without the field used the old
    // default (visible) — keep them on the board until they opt out.
    leaderboardHidden:
      typeof raw.leaderboardHidden === 'boolean'
        ? raw.leaderboardHidden
        : isBrandNew
          ? true
          : false,
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

async function grantBonusInk(
  uid: string,
  amount: number,
  details?: string
): Promise<number> {
  if (amount <= 0) return 0;

  const db = await getDb();
  const balanceRef = db.doc(`users/${uid}/usage/balance`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const data = snap.data() || {};
    const pools = normalizeInkPools(data);
    const next = { ...pools, purchasedBalance: pools.purchasedBalance + amount };
    tx.set(balanceRef, inkBalanceFirestorePatch(next), { merge: true });
  });

  const { recordInkLedgerEntry } = await import('@/lib/server/ink-ledger');
  await recordInkLedgerEntry(db, uid, {
    type: 'credit',
    pool: 'permanent',
    amount,
    reason: 'achievement_bonus',
    details,
  });

  return amount;
}

async function loadTrackVerifyContext(
  userId: string,
  metadata: GamificationEventMetadata
): Promise<AchievementVerifyContext & { generatedLinesOnTrackVerified: number }> {
  const trackId = String(metadata.trackId || '');
  const albumId = String(metadata.albumId || '');
  if (!trackId || !albumId) return { ...EMPTY_VERIFY_CTX, generatedLinesOnTrackVerified: 0 };

  const db = await getDb();
  const trackSnap = await db.doc(`users/${userId}/albums/${albumId}/tracks/${trackId}`).get();
  if (!trackSnap.exists) return { ...EMPTY_VERIFY_CTX, generatedLinesOnTrackVerified: 0 };

  const track = trackSnap.data() || {};
  const barsOnTrackVerified = countNonEmptyBars(track.sections);
  const writtenLinesOnTrackVerified = countLinesWithSource(
    track.sections as Parameters<typeof countLinesWithSource>[0],
    'written'
  );
  const generatedLinesOnTrackVerified = countLinesWithSource(
    track.sections as Parameters<typeof countLinesWithSource>[0],
    'generated'
  );
  let albumTrackCountVerified = 0;

  if (albumId !== 'unassigned') {
    const tracksSnap = await db.collection(`users/${userId}/albums/${albumId}/tracks`).get();
    albumTrackCountVerified = tracksSnap.size;
  }

  const minLines = rhymeBarsToLines(ACHIEVEMENT_THRESHOLDS.trackCompleteMinBars);

  return {
    // Always overwritten by the caller with the real value — included here only
    // to satisfy AchievementVerifyContext's required shape for this partial ctx.
    tourCompletedVerified: false,
    trackCompleteVerified:
      track.status === 'complete' && barsOnTrackVerified >= minLines,
    barsOnTrackVerified,
    writtenLinesOnTrackVerified,
    generatedLinesOnTrackVerified,
    albumTrackCountVerified,
    lifetimeCompletedTracksVerified: 0,
    qualifyingAlbumCountVerified: 0,
    albumCompletedTracksVerified: 0,
    maxBarsOnAnyTrackVerified: barsOnTrackVerified,
  };
}

async function loadPortfolioVerifyContext(
  userId: string,
  focusAlbumId?: string
): Promise<
  Pick<
    AchievementVerifyContext,
    | 'lifetimeCompletedTracksVerified'
    | 'qualifyingAlbumCountVerified'
    | 'albumCompletedTracksVerified'
    | 'maxBarsOnAnyTrackVerified'
  >
> {
  const db = await getDb();
  const minLines = rhymeBarsToLines(ACHIEVEMENT_THRESHOLDS.trackCompleteMinBars);
  const qualifyMin = ACHIEVEMENT_THRESHOLDS.albumQualifyMinTracks;

  let lifetimeCompleted = 0;
  let qualifyingAlbums = 0;
  let albumCompleted = 0;
  let maxBars = 0;

  const albumsSnap = await db.collection(`users/${userId}/albums`).get();

  const parts = await Promise.all(
    albumsSnap.docs.map(async (albumDoc) => {
      const albumId = albumDoc.id;
      const isConcept = albumId !== 'unassigned';
      const tracksSnap = await db.collection(`users/${userId}/albums/${albumId}/tracks`).get();

      let completedInAlbum = 0;
      let localMaxBars = 0;
      let localLifetimeCompleted = 0;

      for (const trackDoc of tracksSnap.docs) {
        const track = trackDoc.data() || {};
        const bars = countNonEmptyBars(track.sections);
        if (bars > localMaxBars) localMaxBars = bars;
        if (track.status === 'complete' && bars >= minLines) {
          localLifetimeCompleted += 1;
          completedInAlbum += 1;
        }
      }

      return {
        qualifying: isConcept && tracksSnap.size >= qualifyMin ? 1 : 0,
        lifetimeCompleted: localLifetimeCompleted,
        completedInAlbum: focusAlbumId && albumId === focusAlbumId ? completedInAlbum : 0,
        maxBars: localMaxBars,
      };
    })
  );

  for (const part of parts) {
    qualifyingAlbums += part.qualifying;
    lifetimeCompleted += part.lifetimeCompleted;
    if (part.completedInAlbum > 0) albumCompleted = part.completedInAlbum;
    if (part.maxBars > maxBars) maxBars = part.maxBars;
  }

  return {
    lifetimeCompletedTracksVerified: lifetimeCompleted,
    qualifyingAlbumCountVerified: qualifyingAlbums,
    albumCompletedTracksVerified: albumCompleted,
    maxBarsOnAnyTrackVerified: maxBars,
  };
}

function tryUnlock(
  summary: GamificationSummary,
  achievementId: string,
  isPro: boolean,
  unlocks: GamificationUnlock[],
  analytics: Record<string, unknown>,
  verifyCtx: AchievementVerifyContext,
  trigger?: GamificationTrigger
): GamificationSummary {
  if (summary.unlockedAchievements[achievementId]) return summary;
  const def = getAchievement(achievementId);
  if (!def) return summary;
  if (def.proOnly && !isPro) return summary;
  if (!canUnlockAchievement(achievementId, analytics, verifyCtx, summary, trigger)) return summary;

  const xpReward = def.xpReward ?? 35;
  summary.unlockedAchievements = {
    ...summary.unlockedAchievements,
    [achievementId]: new Date().toISOString(),
  };
  summary.xp = (summary.xp || 0) + xpReward;
  unlocks.push({
    id: def.id,
    title: def.title,
    description: def.description,
    inkReward: def.inkReward,
    xpReward,
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
  const weekKey = getWeekKey();
  const entryRef = db.doc(`leaderboard_weekly/${weekKey}/entries/${uid}`);
  if (summary.leaderboardHidden) {
    await entryRef.delete().catch(() => undefined);
    return;
  }
  await entryRef.set(
    {
      userId: uid,
      displayName,
      xp: summary.xp,
      barsWritten7d: summary.barsWritten7d,
      currentStreak: summary.currentStreak,
      tracksCompleted30d: summary.tracksCompleted30d,
      profileSlug: summary.publicProfile && summary.profileSlug ? summary.profileSlug : null,
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
  const albumCoverUrls = await getPublicAlbumCoverUrls(uid, summary.profileCollageAlbumIds);
  const profilePhotoMode = summary.profilePhotoMode === 'custom' ? 'custom' : 'collage';
  // Custom hero photos stay on the private summary doc — mirroring the data URL
  // into publicProfiles blows past Firestore's 1MB limit next to Artist Home banners.
  const artistHomeSnap = await db.doc(`users/${uid}/gamification/artistHome`).get();
  const artistHome = artistHomeSnap.exists ? artistHomeSnap.data() : null;
  await db.doc(`publicProfiles/${summary.profileSlug}`).set(
    {
      userId: uid,
      displayName,
      displayNameLower: displayName.trim().toLowerCase(),
      rankId: summary.rankId,
      xp: summary.xp,
      currentStreak: summary.currentStreak,
      longestStreak: summary.longestStreak,
      badgeIds,
      albumCoverUrls,
      profilePhotoMode,
      profilePhotoUrl: FieldValue.delete(),
      ...(summary.profileCollageAlbumIds?.length
        ? { profileCollageAlbumIds: summary.profileCollageAlbumIds }
        : { profileCollageAlbumIds: FieldValue.delete() }),
      ...(artistHome ? { artistHome } : {}),
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
): Promise<{ unlocks: GamificationUnlock[]; summary: GamificationSummary; xpGain: number }> {
  if (!hasAdminFirestoreCredentials()) {
    return { unlocks: [], summary: DEFAULT_GAMIFICATION_SUMMARY, xpGain: 0 };
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
  let verifyCtx: AchievementVerifyContext = {
    ...EMPTY_VERIFY_CTX,
    tourCompletedVerified: Boolean(user.lyricsTutorialCompletedAt),
  };

  summary = resetWeekCounters(summary, weekKey);
  summary = resetMonthCounters(summary, getMonthKey(now));
  summary = resetDayBarCounter(summary, dayKey);

  let generatedLinesOnTrackVerified = 0;
  if (trigger === 'track_saved') {
    const trackCtx = await loadTrackVerifyContext(userId, metadata);
    generatedLinesOnTrackVerified = trackCtx.generatedLinesOnTrackVerified;
    const portfolioCtx = await loadPortfolioVerifyContext(
      userId,
      String(metadata.albumId || '')
    );
    verifyCtx = {
      ...trackCtx,
      ...portfolioCtx,
      tourCompletedVerified: Boolean(user.lyricsTutorialCompletedAt),
    };
  } else if (trigger === 'session_start') {
    const portfolioCtx = await loadPortfolioVerifyContext(userId);
    verifyCtx = {
      ...verifyCtx,
      ...portfolioCtx,
    };
  }

  if (
    trigger === 'rhyme_pulse_on' ||
    trigger === 'smart_structure_used' ||
    trigger === 'ai_action'
  ) {
    const freshAnalytics = await db.doc(`users/${userId}/analytics/summary`).get();
    Object.assign(analytics, freshAnalytics.data() || {});
  }

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
  }

  if (trigger === 'tour_complete') {
    verifyCtx.tourCompletedVerified = Boolean(user.lyricsTutorialCompletedAt);
  }

  if (trigger === 'ai_action') {
    const action = String(metadata.actionName || '');
    if (action === 'generateNextLine') {
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
    // Clamp client-claimed deltas to the verified line counts actually present on
    // the track right now — a claimed delta can never legitimately exceed what's
    // really on the document, which closes off spamming this endpoint directly
    // with an inflated writtenLinesDelta/generatedLinesDelta to farm XP, lifetime
    // bar counts, weekly/monthly challenge progress, and personal bests.
    const writtenDelta = Math.max(
      0,
      Math.min(Number(metadata.writtenLinesDelta || 0), verifyCtx.writtenLinesOnTrackVerified)
    );
    const generatedDelta = Math.max(
      0,
      Math.min(Number(metadata.generatedLinesDelta || 0), generatedLinesOnTrackVerified)
    );

    if (writtenDelta > 0) {
      xpGain += Math.min(writtenDelta * 6, 60);
      summary.barsWrittenToday = (summary.barsWrittenToday || 0) + writtenDelta;
      summary.barsWritten7d = (summary.barsWritten7d || 0) + writtenDelta;
      summary.lifetimeBarsWritten = (summary.lifetimeBarsWritten || 0) + writtenDelta;
      summary.weeklyChallengeProgress = {
        ...summary.weeklyChallengeProgress,
        barsWeek: (summary.weeklyChallengeProgress.barsWeek || 0) + writtenDelta,
      };
      summary.monthlyChallengeProgress = {
        ...summary.monthlyChallengeProgress,
        barsMonth: (summary.monthlyChallengeProgress.barsMonth || 0) + writtenDelta,
      };
      if (summary.barsWrittenToday > (summary.personalBests.barsInDay || 0)) {
        summary.personalBests.barsInDay = summary.barsWrittenToday;
      }
    }

    if (generatedDelta > 0) {
      xpGain += Math.min(generatedDelta * 2, 24);
      summary.lifetimeLinesGenerated = (summary.lifetimeLinesGenerated || 0) + generatedDelta;
    }

    // Same verified ceiling — a session can't have more written lines than
    // currently exist (non-empty) on the track document.
    const sessionWritten = Math.max(
      0,
      Math.min(
        Number(metadata.sessionWrittenLineCount || metadata.sessionBarCount || 0),
        verifyCtx.barsOnTrackVerified
      )
    );
    if (sessionWritten > (summary.personalBests.barsInSession || 0)) {
      summary.personalBests.barsInSession = sessionWritten;
    }

    if (verifyCtx.trackCompleteVerified) {
      xpGain += 25;
      summary.tracksCompletedWeekCount = (summary.tracksCompletedWeekCount || 0) + 1;
      summary.tracksCompletedMonthCount = (summary.tracksCompletedMonthCount || 0) + 1;
      summary.tracksCompleted30d = (summary.tracksCompleted30d || 0) + 1;
      summary.lifetimeTracksCompleted = (summary.lifetimeTracksCompleted || 0) + 1;
    }
  }

  for (const achievement of ACHIEVEMENTS) {
    summary = tryUnlock(
      summary,
      achievement.id,
      isPro,
      unlocks,
      analytics,
      verifyCtx,
      trigger
    );
  }

  xpGain = Math.min(xpGain, MAX_DAILY_XP);
  summary.xp = (summary.xp || 0) + xpGain;
  const rank = rankFromXp(summary.xp, isPro);
  summary.rankId = rank.id;

  if (!summary.profileSlug && displayName) {
    summary.profileSlug = slugify(displayName, userId);
  }

  for (const u of unlocks) {
    // Unlock already passed verification in tryUnlock — grant ink from the reward payload
    // (do not re-check canUnlockAchievement; that can skip ink after summary is mutated).
    const inkReward = Math.max(0, Number(u.inkReward) || 0);
    let inkGranted = 0;
    if (inkReward > 0) {
      inkGranted = await grantBonusInk(userId, inkReward, u.title);
    }
    const xpReward = Math.max(0, Number(u.xpReward) || 0);
    await recordGamificationAnalytics(userId, 'achievement_unlocked', { achievementId: u.id }, displayName);

    const detailParts: string[] = [];
    if (inkGranted > 0) detailParts.push(`+${inkGranted} Ink`);
    if (xpReward > 0) detailParts.push(`+${xpReward} XP`);
    if (u.description) detailParts.push(u.description);
    else detailParts.push(u.id);

    const unlockedAt =
      (typeof summary.unlockedAchievements[u.id] === 'string' && summary.unlockedAchievements[u.id]) ||
      timestamp;

    await db.collection('system').doc('logs').collection('entries').add({
      timestamp: unlockedAt,
      unlockedAt,
      userId,
      userName: displayName,
      action: `Achievement: ${u.title}`,
      usdCost: 0,
      inkUsed: inkGranted,
      inkDelta: inkGranted,
      type: 'achievement',
      achievementId: u.id,
      details: detailParts.join(' · '),
    });
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

  const summaryRef = db.doc(`users/${userId}/gamification/summary`);
  const achievementPatch: Record<string, string> = {};
  for (const u of unlocks) {
    achievementPatch[`unlockedAchievements.${u.id}`] =
      summary.unlockedAchievements[u.id] || timestamp;
  }

  await summaryRef.set(
    {
      ...summary,
      ...achievementPatch,
    },
    { merge: true }
  );
  await syncLeaderboardEntry(userId, summary, displayName);
  await syncPublicProfile(userId, summary, displayName);

  return { unlocks, summary, xpGain };
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
  settings: {
    publicProfile?: boolean;
    leaderboardHidden?: boolean;
    displayName?: string;
    profilePhotoMode?: 'collage' | 'custom';
    profilePhotoUrl?: string | null;
    /** Ordered album IDs for collage (max 9). Pass `null` or `[]` to clear (auto covers). */
    profileCollageAlbumIds?: string[] | null;
  }
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
  if (settings.profilePhotoMode === 'collage' || settings.profilePhotoMode === 'custom') {
    summary.profilePhotoMode = settings.profilePhotoMode;
  }
  if (settings.profilePhotoUrl === null) {
    summary.profilePhotoMode = 'collage';
    delete summary.profilePhotoUrl;
  } else if (typeof settings.profilePhotoUrl === 'string' && settings.profilePhotoUrl.trim()) {
    summary.profilePhotoUrl = settings.profilePhotoUrl.trim();
    summary.profilePhotoMode = 'custom';
  }
  let clearCollageIds = false;
  if (settings.profileCollageAlbumIds === null) {
    clearCollageIds = true;
    delete summary.profileCollageAlbumIds;
  } else if (Array.isArray(settings.profileCollageAlbumIds)) {
    const cleaned = await sanitizeCollageAlbumIds(userId, settings.profileCollageAlbumIds);
    if (cleaned.length === 0) {
      clearCollageIds = true;
      delete summary.profileCollageAlbumIds;
    } else {
      summary.profileCollageAlbumIds = cleaned;
    }
  }
  if (summary.publicProfile && !summary.profileSlug) {
    const userSnap = await db.doc(`users/${userId}`).get();
    const name = settings.displayName || userSnap.data()?.displayName || 'Artist';
    summary.profileSlug = slugify(String(name), userId);
  }

  summary.updatedAt = new Date().toISOString();
  const summaryRef = db.doc(`users/${userId}/gamification/summary`);
  const deleteFields: Record<string, unknown> = {};
  if (settings.profilePhotoUrl === null) {
    deleteFields.profilePhotoUrl = FieldValue.delete();
    deleteFields.profilePhotoMode = 'collage';
  }
  if (clearCollageIds) {
    deleteFields.profileCollageAlbumIds = FieldValue.delete();
  }
  if (Object.keys(deleteFields).length > 0) {
    await summaryRef.set(
      {
        ...summary,
        ...deleteFields,
      },
      { merge: true }
    );
  } else {
    await summaryRef.set(summary, { merge: true });
  }

  if (settings.displayName) {
    await db.doc(`users/${userId}`).set({ displayName: settings.displayName }, { merge: true });
  }

  const userSnap = await db.doc(`users/${userId}`).get();
  const displayName = settings.displayName || userSnap.data()?.displayName || 'Artist';
  await syncPublicProfile(userId, summary, displayName);
  await syncLeaderboardEntry(userId, summary, displayName);

  return summary;
}

const MAX_COLLAGE_ALBUMS = 9;

async function sanitizeCollageAlbumIds(userId: string, rawIds: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const raw of rawIds) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || id === 'unassigned' || seen.has(id)) continue;
    seen.add(id);
    candidates.push(id);
    if (candidates.length >= MAX_COLLAGE_ALBUMS) break;
  }
  if (candidates.length === 0) return [];

  const meta = await getPublicAlbumMeta(userId);
  return candidates.filter((id) => meta.coverByAlbumId.has(id));
}

export async function getGamificationSummaryForUser(userId: string): Promise<GamificationSummary> {
  if (!hasAdminFirestoreCredentials()) {
    return DEFAULT_GAMIFICATION_SUMMARY;
  }
  const db = await getDb();
  const snap = await db.doc(`users/${userId}/gamification/summary`).get();
  return mergeSummary((snap.data() as Partial<GamificationSummary>) || {});
}

export type { AdminGamificationRosterEntry } from '@/lib/gamification/admin-roster-types';

export async function getAdminGamificationRoster(): Promise<Record<string, AdminGamificationRosterEntry>> {
  if (!hasAdminFirestoreCredentials()) {
    return {};
  }

  const db = await getDb();
  const usersSnap = await db.collection('users').get();
  const entries = await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const profile = userDoc.data() || {};
      const base = {
        displayName: String(profile.displayName || 'Artist'),
        email: String(profile.email || ''),
        status: String(profile.status || 'active'),
      };

      const gamSnap = await db.doc(`users/${userDoc.id}/gamification/summary`).get();
      if (!gamSnap.exists) {
        return [
          userDoc.id,
          {
            ...base,
            xp: 0,
            rankId: 'open_mic' as const,
            currentStreak: 0,
            longestStreak: 0,
            lifetimeBarsWritten: 0,
            unlockedAchievements: {},
          },
        ] as const;
      }

      const data = gamSnap.data() || {};
      return [
        userDoc.id,
        {
          ...base,
          xp: data.xp || 0,
          rankId: (data.rankId as GamificationSummary['rankId']) || 'open_mic',
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
          lifetimeBarsWritten: data.lifetimeBarsWritten || 0,
          unlockedAchievements: data.unlockedAchievements || {},
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries);
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

  type LeaderboardRow = { userId: string; profileSlug?: string | null; [key: string]: unknown };

  const mapEntry = (doc: { id: string; data: () => Record<string, unknown> }): LeaderboardRow => ({
    userId: doc.id,
    ...doc.data(),
  });

  const enrichWithProfileSlugs = async (rows: LeaderboardRow[]) => {
    const missing = [...new Set(rows.filter((r) => !r.profileSlug).map((r) => r.userId))];
    if (!missing.length) return rows;

    const slugByUserId = new Map<string, string>();
    for (let i = 0; i < missing.length; i += 10) {
      const chunk = missing.slice(i, i + 10);
      const profilesSnap = await db.collection('publicProfiles').where('userId', 'in', chunk).get();
      profilesSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.userId) slugByUserId.set(String(data.userId), doc.id);
      });
    }

    return rows.map((row) => ({
      ...row,
      profileSlug: row.profileSlug || slugByUserId.get(row.userId) || undefined,
    }));
  };

  const [barsWritten7d, longestStreak, tracksCompleted30d, xp] = await Promise.all([
    enrichWithProfileSlugs(snap.docs.map(mapEntry)),
    enrichWithProfileSlugs(streakSnap.docs.map(mapEntry)),
    enrichWithProfileSlugs(tracksSnap.docs.map(mapEntry)),
    enrichWithProfileSlugs(xpSnap.docs.map(mapEntry)),
  ]);

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

export async function resetUserGamificationProgress(
  targetUserId: string,
  adminEmail: string
): Promise<{ clearedAchievements: number; previousXp: number }> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Admin credentials required');
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const [gamSnap, userSnap] = await Promise.all([
    db.doc(`users/${targetUserId}/gamification/summary`).get(),
    db.doc(`users/${targetUserId}`).get(),
  ]);

  if (!userSnap.exists) {
    throw new Error('User not found');
  }

  const existing = mergeSummary((gamSnap.data() as Partial<GamificationSummary>) || {});
  const clearedAchievements = Object.keys(existing.unlockedAchievements || {}).length;
  const previousXp = existing.xp || 0;
  const user = userSnap.data() || {};
  const displayName = String(user.displayName || 'Artist');
  const isPro = user.subscriptionStatus === 'active';

  const resetSummary: GamificationSummary = {
    ...DEFAULT_GAMIFICATION_SUMMARY,
    publicProfile: existing.publicProfile,
    leaderboardHidden: existing.leaderboardHidden,
    profileSlug: existing.profileSlug,
    rankId: rankFromXp(0, isPro).id,
    updatedAt: now,
  };

  await db.doc(`users/${targetUserId}/gamification/summary`).set(resetSummary);

  await db.doc(`users/${targetUserId}/analytics/summary`).set(
    {
      firstGenerateNextLineAt: FieldValue.delete(),
      firstAnalyzeStructureAt: FieldValue.delete(),
      firstRhymePulseAt: FieldValue.delete(),
      updatedAt: now,
    },
    { merge: true }
  );

  await db.doc(`users/${targetUserId}`).set(
    { lyricsTutorialCompletedAt: FieldValue.delete() },
    { merge: true }
  );

  await syncLeaderboardEntry(targetUserId, resetSummary, displayName);
  await syncPublicProfile(targetUserId, resetSummary, displayName);

  await db.collection('system/logs/entries').add({
    action: 'admin_gamification_reset',
    userId: targetUserId,
    userName: adminEmail,
    inkUsed: 0,
    timestamp: now,
    details: `Reset ${clearedAchievements} trophies, XP ${previousXp} → 0`,
  });

  return { clearedAchievements, previousXp };
}

export async function getPublicProfile(slug: string) {
  const db = await getDb();
  const snap = await db.doc(`publicProfiles/${slug}`).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const userId = String(data.userId || '');
  if (!userId) return { ...data, albumCoverUrls: [], liveDnaDrops: [] };

  const [albumMeta, liveDnaDrops, referralCode, summarySnap] = await Promise.all([
    getPublicAlbumMeta(userId),
    getLiveDnaDropsForUser(userId),
    ensureReferralCode(db, userId).catch(() => null),
    db.doc(`users/${userId}/gamification/summary`).get(),
  ]);

  const summary = mergeSummary((summarySnap.data() as Partial<GamificationSummary>) || {});
  const profilePhotoMode = summary.profilePhotoMode === 'custom' ? 'custom' : 'collage';
  const profilePhotoUrl =
    profilePhotoMode === 'custom' && typeof summary.profilePhotoUrl === 'string'
      ? summary.profilePhotoUrl
      : null;

  let albumCoverUrls = albumMeta.coverUrls;
  if (Array.isArray(summary.profileCollageAlbumIds) && summary.profileCollageAlbumIds.length > 0) {
    const picked: string[] = [];
    for (const id of summary.profileCollageAlbumIds.slice(0, MAX_COLLAGE_ALBUMS)) {
      const url = albumMeta.coverByAlbumId.get(id);
      if (url) picked.push(url);
    }
    if (picked.length > 0) albumCoverUrls = picked;
  }

  const artistHome = enrichAlbumRoomsWithLiveCovers(data.artistHome, albumMeta);

  return {
    ...data,
    artistHome,
    albumCoverUrls,
    profilePhotoMode,
    profilePhotoUrl,
    liveDnaDrops,
    ...(referralCode ? { referralCode } : {}),
  };
}

type PublicAlbumMeta = {
  coverUrls: string[];
  coverByAlbumId: Map<string, string>;
  coverByTitle: Map<string, string>;
};

function enrichAlbumRoomsWithLiveCovers(artistHome: unknown, meta: PublicAlbumMeta) {
  if (!artistHome || typeof artistHome !== 'object') return artistHome;
  const home = artistHome as Record<string, unknown>;
  const featured = home.featured;
  if (!featured || typeof featured !== 'object') return artistHome;
  const rooms = (featured as { albumRooms?: unknown }).albumRooms;
  if (!Array.isArray(rooms) || !rooms.length) return artistHome;

  const albumRooms = rooms.map((room) => {
    if (!room || typeof room !== 'object') return room;
    const r = room as Record<string, unknown>;
    const custom =
      typeof r.roomImageUrl === 'string' && r.roomImageUrl.trim() ? r.roomImageUrl.trim() : '';
    // Custom door banner wins — don't replace with the square vinyl cover.
    if (custom) {
      const { coverArtUrl: _drop, ...rest } = r;
      return { ...rest, roomImageUrl: custom };
    }
    const albumId = typeof r.albumId === 'string' ? r.albumId : '';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    const live =
      (albumId && meta.coverByAlbumId.get(albumId)) ||
      (title && meta.coverByTitle.get(title)) ||
      undefined;
    if (live) return { ...r, coverArtUrl: live };
    const { coverArtUrl: _drop, ...rest } = r;
    return rest;
  });

  return {
    ...home,
    featured: {
      ...(featured as object),
      albumRooms,
    },
  };
}

export type LiveDnaDropSummary = {
  shareId: string;
  title: string;
  type: 'album' | 'track';
};

/** Active public DNA Drops for a user (shares collection = live). */
export async function getLiveDnaDropsForUser(userId: string): Promise<LiveDnaDropSummary[]> {
  if (!userId) return [];
  const db = await getDb();
  const snap = await db.collection('shares').where('ownerId', '==', userId).get();
  const drops = snap.docs
    .map((doc) => {
      const data = doc.data();
      const type = data.type === 'album' ? ('album' as const) : ('track' as const);
      const title =
        typeof data?.data?.title === 'string' && data.data.title.trim()
          ? data.data.title.trim()
          : type === 'album'
            ? 'Untitled album'
            : 'Untitled track';
      const updatedAt =
        typeof data.updatedAt === 'string'
          ? data.updatedAt
          : typeof data.createdAt === 'string'
            ? data.createdAt
            : '';
      return {
        shareId: doc.id,
        title: title.slice(0, 120),
        type,
        updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 24)
    .map(({ shareId, title, type }) => ({ shareId, title, type }));
  return drops;
}

async function getPublicAlbumMeta(userId: string): Promise<PublicAlbumMeta> {
  const db = await getDb();
  const albumsSnap = await db.collection(`users/${userId}/albums`).get();
  const coverByAlbumId = new Map<string, string>();
  const coverByTitle = new Map<string, string>();
  const dated: Array<{ url: string; createdAt: string }> = [];

  for (const doc of albumsSnap.docs) {
    if (doc.id === 'unassigned') continue;
    const data = doc.data();
    const url = typeof data.coverArtUrl === 'string' ? data.coverArtUrl.trim() : '';
    if (!url) continue;
    coverByAlbumId.set(doc.id, url);
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (title) coverByTitle.set(title, url);
    dated.push({
      url,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    });
  }

  const coverUrls = dated
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => entry.url);

  return { coverUrls, coverByAlbumId, coverByTitle };
}

export async function getPublicAlbumCoverUrls(
  userId: string,
  collageAlbumIds?: string[] | null
): Promise<string[]> {
  const meta = await getPublicAlbumMeta(userId);
  if (Array.isArray(collageAlbumIds) && collageAlbumIds.length > 0) {
    const urls: string[] = [];
    for (const id of collageAlbumIds.slice(0, MAX_COLLAGE_ALBUMS)) {
      const url = meta.coverByAlbumId.get(id);
      if (url) urls.push(url);
    }
    if (urls.length > 0) return urls;
  }
  return meta.coverUrls;
}

export type PublicArtistSearchHit = {
  userId: string;
  displayName: string;
  slug: string;
  rankId?: string;
  xp?: number;
};

/** Find live public Artist Homes by display name (prefix) or exact slug. */
export async function searchPublicArtists(
  rawQuery: string,
  opts: { limit?: number; excludeUserId?: string } = {}
): Promise<PublicArtistSearchHit[]> {
  const needle = rawQuery.trim().toLowerCase().slice(0, 48);
  if (needle.length < 2) return [];
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 24);
  const db = await getDb();
  const byUserId = new Map<string, PublicArtistSearchHit>();

  const pushDoc = (slug: string, data: Record<string, unknown>) => {
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (!userId || (opts.excludeUserId && userId === opts.excludeUserId)) return;
    if (byUserId.has(userId)) return;
    const displayName =
      typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName.trim()
        : slug;
    byUserId.set(userId, {
      userId,
      displayName,
      slug,
      rankId: typeof data.rankId === 'string' ? data.rankId : undefined,
      xp: typeof data.xp === 'number' ? data.xp : undefined,
    });
  };

  // Exact slug hit (profile URLs / typed slugs).
  const slugCandidate = needle.replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  if (slugCandidate) {
    const exact = await db.doc(`publicProfiles/${slugCandidate}`).get();
    if (exact.exists) pushDoc(exact.id, exact.data() as Record<string, unknown>);
  }

  // Prefix on displayNameLower (written on every public-profile sync).
  try {
    const prefixSnap = await db
      .collection('publicProfiles')
      .where('displayNameLower', '>=', needle)
      .where('displayNameLower', '<=', `${needle}\uf8ff`)
      .limit(limit)
      .get();
    for (const doc of prefixSnap.docs) pushDoc(doc.id, doc.data() as Record<string, unknown>);
  } catch (err) {
    console.warn('[searchPublicArtists] prefix query failed', err);
  }

  // Legacy / contains fallback for profiles missing displayNameLower.
  if (byUserId.size < limit) {
    try {
      const recent = await db
        .collection('publicProfiles')
        .orderBy('updatedAt', 'desc')
        .limit(200)
        .get();
      for (const doc of recent.docs) {
        if (byUserId.size >= limit) break;
        const data = doc.data() as Record<string, unknown>;
        const name = String(data.displayName || '').toLowerCase();
        const lower = String(data.displayNameLower || '');
        if (name.includes(needle) || lower.includes(needle) || doc.id.includes(needle)) {
          pushDoc(doc.id, data);
        }
      }
    } catch (err) {
      console.warn('[searchPublicArtists] fallback scan failed', err);
    }
  }

  return Array.from(byUserId.values()).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Scene home Discover stream — light public summaries, no heavy payloads.
// ---------------------------------------------------------------------------

export type DiscoverArtistSummary = {
  userId: string;
  slug: string;
  displayName: string;
  rankId?: string;
  xp?: number;
  updatedAt: string;
};

/** Recently live / updated Artist Homes. */
export async function listRecentPublicProfiles(
  opts: { limit?: number; excludeUserId?: string } = {}
): Promise<DiscoverArtistSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 24);
  const db = await getDb();
  const snap = await db
    .collection('publicProfiles')
    .orderBy('updatedAt', 'desc')
    .limit(limit + 4)
    .get();
  const out: DiscoverArtistSummary[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (!userId || (opts.excludeUserId && userId === opts.excludeUserId)) continue;
    out.push({
      userId,
      slug: doc.id,
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : doc.id,
      rankId: typeof data.rankId === 'string' ? data.rankId : undefined,
      xp: typeof data.xp === 'number' ? data.xp : undefined,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type DiscoverShareSummary = {
  shareId: string;
  type: 'album' | 'track';
  title: string;
  ownerName: string;
  updatedAt: string;
};

/** Recent live DNA Drops — summary only, heavy `data` payload stripped. */
export async function listRecentShareSummaries(
  opts: { limit?: number; excludeOwnerId?: string } = {}
): Promise<DiscoverShareSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 24);
  const db = await getDb();
  const snap = await db
    .collection('shares')
    .orderBy('updatedAt', 'desc')
    .limit(limit + 4)
    .get();
  const out: DiscoverShareSummary[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
    if (opts.excludeOwnerId && ownerId === opts.excludeOwnerId) continue;
    const type = data.type === 'album' ? ('album' as const) : ('track' as const);
    const payload = (data.data ?? {}) as Record<string, unknown>;
    const title =
      typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim().slice(0, 120)
        : type === 'album'
          ? 'Untitled album'
          : 'Untitled track';
    out.push({
      shareId: doc.id,
      type,
      title,
      ownerName:
        typeof data.ownerName === 'string' && data.ownerName.trim()
          ? data.ownerName.trim()
          : 'Artist',
      updatedAt:
        typeof data.updatedAt === 'string'
          ? data.updatedAt
          : typeof data.createdAt === 'string'
            ? data.createdAt
            : '',
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type DiscoverPostSummary = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  text: string;
  embedUrl?: string;
  embedProvider?: string;
  createdAt: string;
};

/** Recent public wall posts — only from owners with a live Artist Home (ownerSlug set). */
export async function listRecentPublicPosts(
  opts: { limit?: number; excludeOwnerId?: string } = {}
): Promise<DiscoverPostSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 30);
  const db = await getDb();
  // Post ids are lexicographically newest-first, so document-id order = recency.
  const snap = await db.collection('posts').limit(60).get();
  const out: DiscoverPostSummary[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
    const ownerSlug = typeof data.ownerSlug === 'string' ? data.ownerSlug : undefined;
    if (!ownerId || !ownerSlug) continue;
    if (opts.excludeOwnerId && ownerId === opts.excludeOwnerId) continue;
    out.push({
      id: doc.id,
      ownerId,
      ownerName: String(data.ownerName || 'Artist'),
      ownerSlug,
      text: String(data.text || ''),
      embedUrl: typeof data.embedUrl === 'string' ? data.embedUrl : undefined,
      embedProvider: typeof data.embedProvider === 'string' ? data.embedProvider : undefined,
      createdAt: String(data.createdAt || ''),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type DiscoverRiserSummary = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  barsWritten7d: number;
  currentStreak: number;
};

/** Top of this week's bars-written leaderboard, sliced small for the Scene feed. */
export async function listLeaderboardRisers(
  opts: { limit?: number; excludeUserId?: string } = {}
): Promise<DiscoverRiserSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 10);
  const db = await getDb();
  const snap = await db
    .collection(`leaderboard_weekly/${getWeekKey()}/entries`)
    .orderBy('barsWritten7d', 'desc')
    .limit(limit + 3)
    .get();
  const out: DiscoverRiserSummary[] = [];
  for (const doc of snap.docs) {
    if (opts.excludeUserId && doc.id === opts.excludeUserId) continue;
    const data = doc.data() as Record<string, unknown>;
    out.push({
      userId: doc.id,
      displayName: String(data.displayName || 'Artist'),
      profileSlug: typeof data.profileSlug === 'string' ? data.profileSlug : undefined,
      barsWritten7d: Number(data.barsWritten7d || 0),
      currentStreak: Number(data.currentStreak || 0),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export { countNonEmptyBars, slugify };
