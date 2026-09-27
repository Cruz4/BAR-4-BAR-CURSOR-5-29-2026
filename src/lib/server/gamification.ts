import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { loadAuthLastSignInMap } from '@/lib/server/auth-last-sign-in';
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
  canPrestigeReset,
  getPrestigeLevel,
  scaleByPrestige,
} from '@/lib/gamification/prestige';
import {
  DEFAULT_GAMIFICATION_SUMMARY,
  normalizeProfilePhotoMode,
  type GamificationSummary,
  type GamificationTrigger,
  type GamificationUnlock,
} from '@/lib/gamification/types';
import type { AdminGamificationRosterEntry } from '@/lib/gamification/admin-roster-types';
import type { AnalyticsEventName } from '@/lib/analytics-events';
import { countLinesWithSource } from '@/lib/gamification/line-attribution';
import {
  LOVE_INK_REWARD_AMOUNT,
  isLoveInkRewardMilestone,
  loveInkRewardDescription,
  loveInkRewardUnlockId,
} from '@/lib/gamification/love-rewards';
import { countNonEmptyLines, rhymeBarsToLines } from '@/lib/lyrics-units';
import { ensureReferralCode } from '@/lib/server/referrals';
import { parseStudioBadge, studioChromeFromSubscriptionStatus } from '@/lib/studio-tier-chrome';
import {
  normalizeVesperfoldSeed,
  sanitizeVesperfoldSlots,
  vesperfoldDataUrl,
  type VesperfoldSlot,
} from '@/lib/profile/vesperfold';
import { sanitizeQuotePressSlots, type QuotePressSlot } from '@/lib/profile/quote-press';
import { artistHomeForPublic, normalizeArtistHomeConfig } from '@/lib/profile/modules';
import type { ArtistHomeSoundIdentity } from '@/lib/profile/sound-identity';
import {
  DISCOVER_HEAT_WINDOW_DAYS,
  DISCOVER_WARM_LIMIT,
  DISCOVER_WARM_PER_OWNER,
} from '@/lib/discover-heat';
import type { PressingConfig } from '@/lib/profile/pressing';
import {
  normalizeDropPrice,
  shareCommerceFlags,
  shareDocCommerceFlags,
} from '@/lib/drop-commerce';
import {
  canonicalDnaShareIds,
  shareDocumentVisibility,
} from '@/lib/release-management';
import { isHouseReleaseCreditedToUser, resolveHouseArtistId } from '@/lib/house-artist-link';
import {
  allocateUniqueProfileSlug,
  assertProfileSlugAvailable,
} from '@/lib/server/profile-slug';
import { canonicalLiveDnaShareIds } from '@/lib/server/dna-visibility';

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
  pressedSongCreatedVerified: false,
  wallImagePostVerified: false,
  quoteReverbVerified: false,
  deepListenerVerified: false,
};

export type GamificationEventMetadata = Record<string, string | number | boolean | null>;

/** Remove other publicProfiles docs for this user (stale vanity renames). */
async function pruneOtherPublicProfilesForUser(
  db: Awaited<ReturnType<typeof getDb>>,
  uid: string,
  keepSlug: string | undefined
): Promise<void> {
  const snap = await db.collection('publicProfiles').where('userId', '==', uid).get();
  for (const docSnap of snap.docs) {
    if (keepSlug && docSnap.id === keepSlug) continue;
    try {
      await docSnap.ref.collection('assets').doc('avatar').delete();
    } catch {
      /* ignore */
    }
    await docSnap.ref.delete();
  }
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
    qualifiedListenWeekSongIds: Array.isArray(raw.qualifiedListenWeekSongIds)
      ? raw.qualifiedListenWeekSongIds.filter((id): id is string => typeof id === 'string').slice(-50)
      : [],
    monthlyChallengeProgress: raw.monthlyChallengeProgress || {},
    personalBests: { ...DEFAULT_GAMIFICATION_SUMMARY.personalBests, ...(raw.personalBests || {}) },
    starMarkUseStar: Boolean(raw.starMarkUseStar),
    starMarkSeed: normalizeVesperfoldSeed(raw.starMarkSeed ?? 0),
    starMarkSlots: sanitizeVesperfoldSlots(raw.starMarkSlots),
    quotePressSlots: sanitizeQuotePressSlots(raw.quotePressSlots),
    starMarkPinnedSlotId:
      typeof raw.starMarkPinnedSlotId === 'string' && raw.starMarkPinnedSlotId.trim()
        ? raw.starMarkPinnedSlotId.trim().slice(0, 64)
        : null,
    prestigeLevel: getPrestigeLevel({ prestigeLevel: raw.prestigeLevel }),
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
    dnaImportWeekCount: 0,
    friendshipWeekCount: 0,
    wallPostWeekCount: 0,
    shareCreatedWeekCount: 0,
    qualifiedListenWeekCount: 0,
    qualifiedListenSongWeekCount: 0,
    qualifiedListenWeekSongIds: [],
    quoteReverbWeekCount: 0,
    galleryPostWeekCount: 0,
    creatorListenerWeekCount: 0,
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
  metadata: GamificationEventMetadata,
  prestigeLevel = 0
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

  const minLines = rhymeBarsToLines(
    scaleByPrestige(ACHIEVEMENT_THRESHOLDS.trackCompleteMinBars, prestigeLevel)
  );

  return {
    // Always overwritten by the caller with the real value — included here only
    // to satisfy AchievementVerifyContext's required shape for this partial ctx.
    ...EMPTY_VERIFY_CTX,
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
  focusAlbumId?: string,
  prestigeLevel = 0
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
  const minLines = rhymeBarsToLines(
    scaleByPrestige(ACHIEVEMENT_THRESHOLDS.trackCompleteMinBars, prestigeLevel)
  );
  const qualifyMin = scaleByPrestige(ACHIEVEMENT_THRESHOLDS.albumQualifyMinTracks, prestigeLevel);

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
    await pruneOtherPublicProfilesForUser(db, uid, undefined);
    return;
  }

  const badgeIds = Object.keys(summary.unlockedAchievements);
  const profilePhotoMode = normalizeProfilePhotoMode(summary.profilePhotoMode);
  const albumCoverUrls =
    profilePhotoMode === 'initials'
      ? []
      : await getPublicAlbumCoverUrls(uid, summary.profileCollageAlbumIds);
  // Custom hero photos stay on the private summary doc — mirroring the data URL
  // into publicProfiles blows past Firestore's 1MB limit next to Artist Home banners.
  const artistHomeSnap = await db.doc(`users/${uid}/gamification/artistHome`).get();
  const artistHome = artistHomeSnap.exists
    ? artistHomeForPublic(normalizeArtistHomeConfig(artistHomeSnap.data()))
    : null;
  const userSnap = await db.doc(`users/${uid}`).get();
  const studioBadge = studioChromeFromSubscriptionStatus(
    typeof userSnap.data()?.subscriptionStatus === 'string'
      ? userSnap.data()?.subscriptionStatus
      : null
  );
  await db.doc(`publicProfiles/${summary.profileSlug}`).set(
    {
      userId: uid,
      displayName,
      displayNameLower: displayName.trim().toLowerCase(),
      rankId: summary.rankId,
      xp: summary.xp,
      prestigeLevel: getPrestigeLevel(summary),
      currentStreak: summary.currentStreak,
      longestStreak: summary.longestStreak,
      badgeIds,
      albumCoverUrls,
      profilePhotoMode,
      // Full custom hero stays off the main public doc (size) — see syncPublicAvatarAsset.
      profilePhotoUrl: FieldValue.delete(),
      starMarkUseStar: Boolean(summary.starMarkUseStar),
      starMarkSeed: normalizeVesperfoldSeed(summary.starMarkSeed ?? 0),
      studioBadge,
      ...(summary.profileCollageAlbumIds?.length
        ? { profileCollageAlbumIds: summary.profileCollageAlbumIds }
        : { profileCollageAlbumIds: FieldValue.delete() }),
      ...(artistHome ? { artistHome } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  await syncPublicAvatarAsset(summary.profileSlug, summary);
  await pruneOtherPublicProfilesForUser(db, uid, summary.profileSlug);
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
  let verifiedShareCreatedClaim = false;
  let verifiedPressedSongClaim = false;

  if (trigger === 'wall_post_created' || trigger === 'quote_reverb_created' || trigger === 'share_created') {
    const isPostTrigger = trigger === 'wall_post_created' || trigger === 'quote_reverb_created';
    const sourceId = String(isPostTrigger ? metadata.postId || '' : metadata.shareId || '').trim();
    if (!sourceId) return { unlocks: [], summary, xpGain: 0 };
    const sourceRef = db.collection(isPostTrigger ? 'posts' : 'shares').doc(sourceId);
    const sourceSnap = await sourceRef.get();
    const source = sourceSnap.data() || {};
    if (!sourceSnap.exists || source.ownerId !== userId) {
      return { unlocks: [], summary, xpGain: 0 };
    }
    if (isPostTrigger) {
      verifyCtx.wallImagePostVerified = typeof source.imageUrl === 'string' && source.imageUrl.length > 0;
      verifyCtx.quoteReverbVerified = source.isReverb === true && typeof source.text === 'string' && source.text.trim().length > 0;
    } else {
      const payload = source.data && typeof source.data === 'object' ? source.data as Record<string, unknown> : {};
      const flags = shareDocCommerceFlags(source.type === 'album' ? 'album' : 'track', {
        dropAudio: payload.dropAudio,
        dropPrice: payload.dropPrice,
      });
      verifyCtx.pressedSongCreatedVerified = source.type !== 'album' && flags.hasDropAudio;
    }

    const claim = async (claimId: string): Promise<boolean> => {
      const claimRef = db.doc(`users/${userId}/gamificationEvents/${claimId}`);
      try {
        await claimRef.create({ trigger, sourceId, createdAt: timestamp });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/already exists|ALREADY_EXISTS|6/i.test(message)) return false;
        throw error;
      }
    };

    if (trigger === 'share_created') {
      verifiedShareCreatedClaim = await claim(`share_created_${sourceId}`);
      verifiedPressedSongClaim = verifyCtx.pressedSongCreatedVerified
        ? await claim(`pressed_song_created_${sourceId}`)
        : false;
      if (!verifiedShareCreatedClaim && !verifiedPressedSongClaim) {
        return { unlocks: [], summary, xpGain: 0 };
      }
    } else if (!(await claim(`${trigger}_${sourceId}`))) {
      return { unlocks: [], summary, xpGain: 0 };
    }
  }

  if (trigger === 'qualified_listen') {
    const shareId = String(metadata.shareId || '').trim();
    if (shareId) {
      const progress = await db.doc(`users/${userId}/musicProgress/${shareId}`).get();
      verifyCtx.deepListenerVerified = Number(progress.data()?.qualifiedListeningDays || 0) >= 50;
    }
  }

  summary = resetWeekCounters(summary, weekKey);
  summary = resetMonthCounters(summary, getMonthKey(now));
  summary = resetDayBarCounter(summary, dayKey);

  let generatedLinesOnTrackVerified = 0;
  const prestige = getPrestigeLevel(summary);
  if (trigger === 'track_saved') {
    const trackCtx = await loadTrackVerifyContext(userId, metadata, prestige);
    generatedLinesOnTrackVerified = trackCtx.generatedLinesOnTrackVerified;
    const portfolioCtx = await loadPortfolioVerifyContext(
      userId,
      String(metadata.albumId || ''),
      prestige
    );
    verifyCtx = {
      ...trackCtx,
      ...portfolioCtx,
      tourCompletedVerified: Boolean(user.lyricsTutorialCompletedAt),
    };
  } else if (trigger === 'session_start') {
    const portfolioCtx = await loadPortfolioVerifyContext(userId, undefined, prestige);
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

  if (trigger === 'dna_imported') {
    summary.lifetimeDnaImports = (summary.lifetimeDnaImports || 0) + 1;
    summary.dnaImportWeekCount = (summary.dnaImportWeekCount || 0) + 1;
    xpGain += 20;
  }

  if (trigger === 'friendship_accepted') {
    summary.lifetimeFriendshipsAccepted = (summary.lifetimeFriendshipsAccepted || 0) + 1;
    summary.friendshipWeekCount = (summary.friendshipWeekCount || 0) + 1;
    xpGain += 15;
  }

  if (trigger === 'wall_post_created') {
    summary.lifetimeWallPosts = (summary.lifetimeWallPosts || 0) + 1;
    summary.wallPostWeekCount = (summary.wallPostWeekCount || 0) + 1;
    xpGain += 10;
    if (verifyCtx.wallImagePostVerified) {
      summary.lifetimeGalleryPosts = (summary.lifetimeGalleryPosts || 0) + 1;
      summary.galleryPostWeekCount = (summary.galleryPostWeekCount || 0) + 1;
    }
  }

  if (trigger === 'quote_reverb_created' && verifyCtx.quoteReverbVerified) {
    summary.lifetimeQuoteReverbs = (summary.lifetimeQuoteReverbs || 0) + 1;
    summary.quoteReverbWeekCount = (summary.quoteReverbWeekCount || 0) + 1;
  }

  if (trigger === 'share_created') {
    if (verifiedShareCreatedClaim) {
      summary.lifetimeSharesCreated = (summary.lifetimeSharesCreated || 0) + 1;
      summary.shareCreatedWeekCount = (summary.shareCreatedWeekCount || 0) + 1;
      xpGain += 15;
    }
    if (verifiedPressedSongClaim) {
      summary.lifetimePressedSongs = (summary.lifetimePressedSongs || 0) + 1;
    }
  }

  if (trigger === 'paid_support') {
    summary.lifetimePaidSupports = (summary.lifetimePaidSupports || 0) + 1;
  }

  if (trigger === 'qualified_listen') {
    const shareId = String(metadata.shareId || '').trim();
    summary.lifetimeQualifiedListeningDays = (summary.lifetimeQualifiedListeningDays || 0) + 1;
    summary.qualifiedListenWeekCount = (summary.qualifiedListenWeekCount || 0) + 1;
    const songs = new Set(summary.qualifiedListenWeekSongIds || []);
    if (shareId) songs.add(shareId);
    summary.qualifiedListenWeekSongIds = [...songs].slice(-50);
    summary.qualifiedListenSongWeekCount = summary.qualifiedListenWeekSongIds.length;
  }

  if (trigger === 'creator_sale') {
    summary.lifetimeFirstDropSales = (summary.lifetimeFirstDropSales || 0) + 1;
  }

  if (trigger === 'creator_qualified_listener') {
    summary.lifetimeCreatorQualifiedListeners = (summary.lifetimeCreatorQualifiedListeners || 0) + 1;
    summary.creatorListenerWeekCount = (summary.creatorListenerWeekCount || 0) + 1;
  }

  if (trigger === 'dna_drop_imported_by_other') {
    summary.lifetimeDnaImportsReceived = (summary.lifetimeDnaImportsReceived || 0) + 1;
    xpGain += 25;
  }

  if (trigger === 'love_received') {
    summary.lifetimeLovesReceived = (summary.lifetimeLovesReceived || 0) + 1;
    if (summary.loveXpDayKey !== dayKey) {
      summary.loveXpDayKey = dayKey;
      summary.loveXpToday = 0;
    }
    const loveXpCap = 50;
    const loveXpGrant = (summary.loveXpToday || 0) < loveXpCap ? 5 : 0;
    summary.loveXpToday = (summary.loveXpToday || 0) + loveXpGrant;
    xpGain += loveXpGrant;
    if (isLoveInkRewardMilestone(summary.lifetimeLovesReceived)) {
      unlocks.push({
        id: loveInkRewardUnlockId(summary.lifetimeLovesReceived),
        title: `+${LOVE_INK_REWARD_AMOUNT} Ink`,
        description: loveInkRewardDescription(summary.lifetimeLovesReceived),
        inkReward: LOVE_INK_REWARD_AMOUNT,
        xpReward: 0,
      });
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
    const dbAlloc = await getDb();
    summary.profileSlug = await allocateUniqueProfileSlug(dbAlloc, displayName, userId);
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
    /** Vanity Artist Home path: /{profileSlug} */
    profileSlug?: string;
    /** When claiming a marketing prospect, pass its id so the reserved slug can bind. */
    allowProspectId?: string;
    profilePhotoMode?: 'collage' | 'custom' | 'initials';
    profilePhotoUrl?: string | null;
    /** Ordered album IDs for collage (max 9). Pass `null` or `[]` to clear (auto covers). */
    profileCollageAlbumIds?: string[] | null;
    starMarkUseStar?: boolean;
    starMarkSeed?: number;
    starMarkSlots?: VesperfoldSlot[] | null;
    starMarkPinnedSlotId?: string | null;
    quotePressSlots?: QuotePressSlot[] | null;
  }
): Promise<GamificationSummary> {
  const db = await getDb();
  const snap = await db.doc(`users/${userId}/gamification/summary`).get();
  const summary = mergeSummary((snap.data() as Partial<GamificationSummary>) || {});
  const previousSlug = summary.profileSlug;

  if (typeof settings.publicProfile === 'boolean') {
    summary.publicProfile = settings.publicProfile;
  }
  if (typeof settings.leaderboardHidden === 'boolean') {
    summary.leaderboardHidden = settings.leaderboardHidden;
  }
  // Display name no longer rewrites the vanity URL — artists set the link explicitly.
  if (typeof settings.profileSlug === 'string') {
    const claimed = await assertProfileSlugAvailable(db, settings.profileSlug, userId, {
      allowProspectId: settings.allowProspectId,
    });
    summary.profileSlug = claimed;
  }
  if (
    settings.profilePhotoMode === 'collage' ||
    settings.profilePhotoMode === 'custom' ||
    settings.profilePhotoMode === 'initials'
  ) {
    summary.profilePhotoMode = settings.profilePhotoMode;
  }
  if (settings.profilePhotoUrl === null) {
    delete summary.profilePhotoUrl;
    // Clearing the URL alone (no mode) falls back to initials; explicit mode wins.
    if (settings.profilePhotoMode === undefined) {
      summary.profilePhotoMode = 'initials';
    }
  } else if (typeof settings.profilePhotoUrl === 'string' && settings.profilePhotoUrl.trim()) {
    summary.profilePhotoUrl = settings.profilePhotoUrl.trim();
    summary.profilePhotoMode = 'custom';
  }
  if (summary.profilePhotoMode === 'initials') {
    delete summary.profilePhotoUrl;
  }
  if (typeof settings.starMarkUseStar === 'boolean') {
    summary.starMarkUseStar = settings.starMarkUseStar;
  }
  if (settings.starMarkSeed !== undefined) {
    summary.starMarkSeed = normalizeVesperfoldSeed(settings.starMarkSeed);
  }
  if (settings.starMarkSlots === null) {
    summary.starMarkSlots = [];
    summary.starMarkPinnedSlotId = null;
  } else if (Array.isArray(settings.starMarkSlots)) {
    summary.starMarkSlots = sanitizeVesperfoldSlots(settings.starMarkSlots);
    if (
      summary.starMarkPinnedSlotId &&
      !summary.starMarkSlots.some((s) => s.id === summary.starMarkPinnedSlotId)
    ) {
      summary.starMarkPinnedSlotId = null;
    }
  }
  if (settings.starMarkPinnedSlotId === null) {
    summary.starMarkPinnedSlotId = null;
  } else if (typeof settings.starMarkPinnedSlotId === 'string') {
    const pin = settings.starMarkPinnedSlotId.trim().slice(0, 64);
    const slots = summary.starMarkSlots || [];
    if (pin && slots.some((s) => s.id === pin)) {
      summary.starMarkPinnedSlotId = pin;
    } else {
      summary.starMarkPinnedSlotId = null;
    }
  }
  // Pinned vault star wins until unlocked — survives logout via summary doc.
  if (summary.starMarkPinnedSlotId) {
    const pinned = (summary.starMarkSlots || []).find((s) => s.id === summary.starMarkPinnedSlotId);
    if (pinned) {
      summary.starMarkSeed = normalizeVesperfoldSeed(pinned.seed);
      summary.starMarkUseStar = true;
    } else {
      summary.starMarkPinnedSlotId = null;
    }
  }
  if (settings.quotePressSlots === null) {
    summary.quotePressSlots = [];
  } else if (Array.isArray(settings.quotePressSlots)) {
    summary.quotePressSlots = sanitizeQuotePressSlots(settings.quotePressSlots);
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
    summary.profileSlug = await allocateUniqueProfileSlug(db, String(name), userId);
  }

  // Going live with a legacy uid-suffixed link? Prefer a clean name if free.
  if (
    summary.publicProfile &&
    summary.profileSlug &&
    typeof settings.profileSlug !== 'string' &&
    settings.publicProfile === true
  ) {
    const { looksLikeLegacyUidSlug } = await import('@/lib/profile/profile-slug');
    if (looksLikeLegacyUidSlug(summary.profileSlug, userId)) {
      const userSnap = await db.doc(`users/${userId}`).get();
      const name = settings.displayName || userSnap.data()?.displayName || 'Artist';
      const clean = await allocateUniqueProfileSlug(db, String(name), userId);
      if (clean && clean !== summary.profileSlug && !looksLikeLegacyUidSlug(clean, userId)) {
        summary.profileSlug = clean;
      }
    }
  }

  summary.updatedAt = new Date().toISOString();
  const summaryRef = db.doc(`users/${userId}/gamification/summary`);
  const deleteFields: Record<string, unknown> = {};
  if (settings.profilePhotoUrl === null || summary.profilePhotoMode === 'initials') {
    deleteFields.profilePhotoUrl = FieldValue.delete();
  }
  // Persist mode explicitly so initials isn't overwritten by the null-URL collage default.
  if (
    settings.profilePhotoMode === 'collage' ||
    settings.profilePhotoMode === 'custom' ||
    settings.profilePhotoMode === 'initials'
  ) {
    deleteFields.profilePhotoMode = settings.profilePhotoMode;
  }
  if (clearCollageIds || summary.profilePhotoMode === 'initials') {
    deleteFields.profileCollageAlbumIds = FieldValue.delete();
    delete summary.profileCollageAlbumIds;
  }
  if (settings.starMarkPinnedSlotId === null) {
    deleteFields.starMarkPinnedSlotId = FieldValue.delete();
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

  // Extra prune if slug changed while already public.
  if (previousSlug && summary.profileSlug && previousSlug !== summary.profileSlug) {
    await pruneOtherPublicProfilesForUser(db, userId, summary.profileSlug);
  }

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
  const [usersSnap, lastSignIn] = await Promise.all([
    db.collection('users').get(),
    loadAuthLastSignInMap(),
  ]);
  const entries = await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const profile = userDoc.data() || {};
      const storedLastSignIn =
        typeof profile.lastSignInAt === 'string' && profile.lastSignInAt.trim()
          ? profile.lastSignInAt.trim()
          : null;
      const lastSignInAt = lastSignIn[userDoc.id] || storedLastSignIn;
      const base = {
        displayName: String(profile.displayName || 'Artist'),
        email: String(profile.email || ''),
        status: String(profile.status || 'active'),
        lastSignInAt,
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
            publicProfile: false,
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
          publicProfile: Boolean(data.publicProfile),
          profileSlug:
            typeof data.profileSlug === 'string' && data.profileSlug.trim()
              ? data.profileSlug.trim()
              : undefined,
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
  const { resolvePublicProfileSlugDoc, migrateUserProfileSlugToUnderscore } = await import(
    '@/lib/server/profile-slug'
  );

  const resolved = await resolvePublicProfileSlugDoc(db, slug);
  if (!resolved) return null;

  // Best-effort migrate hyphen / uid-suffix vanity links to underscore form.
  let liveSlug = resolved.slug;
  try {
    if (!resolved.userId) throw new Error('skip migrate for prospect');
    const migrated = await migrateUserProfileSlugToUnderscore(db, resolved.userId, {
      displayName:
        typeof resolved.data.displayName === 'string' ? resolved.data.displayName : undefined,
      currentSlugHint: resolved.slug,
    });
    if (migrated) liveSlug = migrated;
  } catch {
    /* keep resolved slug */
  }

  let snap = await db.doc(`publicProfiles/${liveSlug}`).get();
  if (!snap.exists && liveSlug !== resolved.slug) {
    snap = await db.doc(`publicProfiles/${resolved.slug}`).get();
    if (snap.exists) liveSlug = resolved.slug;
  }
  if (!snap.exists) return null;
  const data = snap.data()!;
  const userId = String(data.userId || resolved.userId || '');
  const prospectId = typeof data.prospectId === 'string' ? data.prospectId.trim() : '';
  if (!userId) {
    return {
      ...data,
      slug: liveSlug,
      albumCoverUrls: [],
      liveDnaDrops: [],
      ...(prospectId ? { prospectId, prospectStatus: data.prospectStatus } : {}),
      ...(Array.isArray(data.prospectWallPosts) ? { prospectWallPosts: data.prospectWallPosts } : {}),
    };
  }

  const [albumMeta, liveDnaDrops, referralCode, summarySnap, userSnap] = await Promise.all([
    getPublicAlbumMeta(userId),
    getLiveDnaDropsForUser(userId),
    ensureReferralCode(db, userId).catch(() => null),
    db.doc(`users/${userId}/gamification/summary`).get(),
    db.doc(`users/${userId}`).get(),
  ]);

  const summary = mergeSummary((summarySnap.data() as Partial<GamificationSummary>) || {});
  const claimedSlug =
    typeof summary.profileSlug === 'string' && summary.profileSlug.trim()
      ? summary.profileSlug.trim()
      : '';
  if (claimedSlug && claimedSlug !== liveSlug) {
    const claimedSnap = await db.doc(`publicProfiles/${claimedSlug}`).get();
    if (claimedSnap.exists) liveSlug = claimedSlug;
  }

  const profilePhotoMode = normalizeProfilePhotoMode(summary.profilePhotoMode);
  const profilePhotoUrl =
    profilePhotoMode === 'custom' && typeof summary.profilePhotoUrl === 'string'
      ? summary.profilePhotoUrl
      : null;

  let albumCoverUrls =
    profilePhotoMode === 'initials' ? ([] as string[]) : albumMeta.coverUrls;
  if (
    profilePhotoMode !== 'initials' &&
    Array.isArray(summary.profileCollageAlbumIds) &&
    summary.profileCollageAlbumIds.length > 0
  ) {
    const picked: string[] = [];
    for (const id of summary.profileCollageAlbumIds.slice(0, MAX_COLLAGE_ALBUMS)) {
      const url = albumMeta.coverByAlbumId.get(id);
      if (url) picked.push(url);
    }
    if (picked.length > 0) albumCoverUrls = picked;
  }

  // Retroactive: "collage" with nothing to show → treat as stock initials star.
  const effectivePhotoMode =
    profilePhotoMode === 'collage' && albumCoverUrls.length === 0
      ? 'initials'
      : profilePhotoMode;

  let artistHome = enrichAlbumRoomsWithLiveCovers(data.artistHome, albumMeta);
  const featuredTrack = (
    artistHome && typeof artistHome === 'object' &&
    (artistHome as { featured?: { featuredTrack?: { shareId?: unknown } } }).featured?.featuredTrack
  ) as { shareId?: unknown } | undefined;
  const featuredShareId = typeof featuredTrack?.shareId === 'string' ? featuredTrack.shareId.trim() : '';
  if (featuredShareId) {
    const featuredShare = await db.doc(`shares/${featuredShareId}`).get();
    if (!featuredShare.exists || !shareDocumentVisibility((featuredShare.data() || {}) as Record<string, unknown>).releaseLive) {
      const home = artistHome as Record<string, unknown>;
      const featured = home.featured as Record<string, unknown>;
      const { featuredTrack: _hidden, ...publicFeatured } = featured;
      artistHome = { ...home, featured: publicFeatured };
      // Self-heal both saved copies so a router-cached profile cannot keep
      // retrying an offline featured release and showing an error toast.
      try {
        const canonicalRef = db.doc(`users/${userId}/gamification/artistHome`);
        const canonicalSnap = await canonicalRef.get();
        const canonicalShareId = canonicalSnap.data()?.featured?.featuredTrack?.shareId;
        const cleanup = db.batch();
        cleanup.update(snap.ref, {
          'artistHome.featured.featuredTrack': FieldValue.delete(),
          updatedAt: new Date().toISOString(),
        });
        if (canonicalShareId === featuredShareId) {
          cleanup.update(canonicalRef, {
            'featured.featuredTrack': FieldValue.delete(),
            updatedAt: new Date().toISOString(),
          });
        }
        await cleanup.commit();
      } catch {
        /* response is already clean; persistence can retry on the next load */
      }
    }
  }

  const liveBadge = studioChromeFromSubscriptionStatus(
    typeof userSnap.data()?.subscriptionStatus === 'string'
      ? userSnap.data()?.subscriptionStatus
      : null
  );
  if (parseStudioBadge(data.studioBadge) !== liveBadge) {
    await db
      .doc(`publicProfiles/${liveSlug}`)
      .set({ studioBadge: liveBadge }, { merge: true })
      .catch(() => undefined);
  }

  const {
    profileViewCount: _profileViewCount,
    profileViewCountUpdatedAt: _profileViewCountUpdatedAt,
    views: _views,
    pageViews: _pageViews,
    profilePageViews: _profilePageViews,
    legacyPageLoads: _legacyPageLoads,
    legacyProfileViews: _legacyProfileViews,
    ...publicProfileFields
  } = data as Record<string, unknown>;

  return {
    ...publicProfileFields,
    slug: liveSlug,
    requestedSlug: slug,
    artistHome,
    albumCoverUrls: effectivePhotoMode === 'initials' ? [] : albumCoverUrls,
    profilePhotoMode: effectivePhotoMode,
    profilePhotoUrl: effectivePhotoMode === 'custom' ? profilePhotoUrl : null,
    // Prefer live summary stats — older publicProfiles docs may omit xp/streaks.
    xp: typeof summary.xp === 'number' ? summary.xp : Number(data.xp) || 0,
    currentStreak:
      typeof summary.currentStreak === 'number'
        ? summary.currentStreak
        : Number(data.currentStreak) || 0,
    longestStreak:
      typeof summary.longestStreak === 'number'
        ? summary.longestStreak
        : Number(data.longestStreak) || 0,
    rankId: summary.rankId || data.rankId,
    starMarkUseStar: Boolean(summary.starMarkUseStar),
    starMarkSeed: normalizeVesperfoldSeed(summary.starMarkSeed ?? 0),
    liveDnaDrops,
    unlockedAchievements: summary.unlockedAchievements || {},
    lifetimeBarsWritten: summary.lifetimeBarsWritten || 0,
    lifetimeLinesGenerated: summary.lifetimeLinesGenerated || 0,
    studioBadge: liveBadge,
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
  /** Set on track drops that also sit under a live album DNA drop. */
  albumTitle?: string;
  /** Parent album DNA share id when this track is nested under that album. */
  albumShareId?: string;
  /** Vault track id for album snapshot ?track= links. */
  trackId?: string;
  /** 0-based position in the parent album tracklist (set order). */
  trackIndex?: number;
  /** Live track count on album cards. */
  trackCount?: number;
  hasDropAudio?: boolean;
  releaseLive?: boolean;
  dnaLive?: boolean;
  houseRelease?: boolean;
  dropPriceSummary?: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  firstBuyerName?: string;
};

type LiveDnaDropDraft = LiveDnaDropSummary & { updatedAt: string };

/** Active public music releases and lyric DNA pages for an Artist Home. */
export async function getLiveDnaDropsForUser(userId: string): Promise<LiveDnaDropSummary[]> {
  if (!userId) return [];
  const db = await getDb();
  const snap = await db.collection('shares').where('ownerId', '==', userId).get();

  const byShareId = new Map<string, LiveDnaDropDraft>();
  const shareDocsById = new Map(snap.docs.map((doc) => [doc.id, doc]));
  const canonicalDnaIds = canonicalDnaShareIds(
    snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  );

  for (const doc of snap.docs) {
    const data = doc.data();
    const visibility = shareDocumentVisibility(data as Record<string, unknown>);
    const dnaLive = visibility.dnaLive && canonicalDnaIds.has(doc.id);
    if (!visibility.releaseLive && !dnaLive) continue;
    const creditedHouseArtist = resolveHouseArtistId(data as Record<string, unknown>);
    if (data.houseRelease === true && creditedHouseArtist && creditedHouseArtist !== userId) {
      continue;
    }
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

    const payload = (data?.data ?? {}) as {
      dropAudio?: unknown;
      dropPrice?: unknown;
      tracks?: Array<{ dropAudio?: unknown; dropPrice?: unknown }>;
    };
    // Album hubs inherit nested-track audio in shareCommerceFlags — don't label
    // the album card itself as a First Drop. Fans should open the track.
    const flags =
      type === 'album'
        ? shareCommerceFlags({ dropAudio: payload.dropAudio, dropPrice: payload.dropPrice })
        : shareCommerceFlags(payload);
    const entry: LiveDnaDropDraft = {
      shareId: doc.id,
      title: title.slice(0, 120),
      type,
      updatedAt,
      ...(type === 'track' && visibility.releaseLive && flags.hasDropAudio ? { hasDropAudio: true } : {}),
      ...(visibility.releaseLive ? { releaseLive: true } : {}),
      ...(dnaLive ? { dnaLive: true } : {}),
      ...(visibility.releaseLive && data.houseRelease === true ? { houseRelease: true } : {}),
      ...(flags.dropPriceSummary ? { dropPriceSummary: flags.dropPriceSummary } : {}),
      ...(Number(data.playCount) > 0 ? { playCount: Number(data.playCount) } : {}),
      ...(Number(data.previewCount) > 0 ? { previewCount: Number(data.previewCount) } : {}),
      ...(Number(data.purchaseCount) > 0 ? { purchaseCount: Number(data.purchaseCount) } : {}),
      ...(typeof data.firstBuyerName === 'string' && data.firstBuyerName.trim()
        ? { firstBuyerName: data.firstBuyerName.trim().slice(0, 80) }
        : {}),
    };

    if (type === 'album') {
      const tracks = Array.isArray(data?.data?.tracks) ? data.data.tracks : [];
      entry.trackCount = tracks.length;
    }

    byShareId.set(doc.id, entry);
  }

  // Same scan as /api/profile/house-releases so a linked artist sees the drop
  // without a composite houseRelease+houseArtistId index.
  const linkedHouseSnap = await db.collection('shares').where('houseRelease', '==', true).get();
  for (const doc of linkedHouseSnap.docs) {
    const share = (doc.data() || {}) as Record<string, unknown>;
    if (!isHouseReleaseCreditedToUser(share, userId)) continue;
    const existing = byShareId.get(doc.id);
    if (existing) {
      byShareId.set(doc.id, {
        ...existing,
        houseRelease: true,
        ...(existing.releaseLive || shareDocumentVisibility(share).releaseLive
          ? { releaseLive: true }
          : {}),
      });
      continue;
    }
    shareDocsById.set(doc.id, doc);
    const data = doc.data();
    const visibility = shareDocumentVisibility(data as Record<string, unknown>);
    if (!visibility.releaseLive) continue;
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
    const payload = (data?.data ?? {}) as {
      dropAudio?: unknown;
      dropPrice?: unknown;
      tracks?: Array<{ dropAudio?: unknown; dropPrice?: unknown }>;
    };
    const flags =
      type === 'album'
        ? shareCommerceFlags({ dropAudio: payload.dropAudio, dropPrice: payload.dropPrice })
        : shareCommerceFlags(payload);
    const entry: LiveDnaDropDraft = {
      shareId: doc.id,
      title: title.slice(0, 120),
      type,
      updatedAt,
      ...(type === 'track' && flags.hasDropAudio ? { hasDropAudio: true } : {}),
      releaseLive: true,
      houseRelease: true,
      ...(flags.dropPriceSummary ? { dropPriceSummary: flags.dropPriceSummary } : {}),
      ...(Number(data.playCount) > 0 ? { playCount: Number(data.playCount) } : {}),
      ...(Number(data.previewCount) > 0 ? { previewCount: Number(data.previewCount) } : {}),
      ...(Number(data.purchaseCount) > 0 ? { purchaseCount: Number(data.purchaseCount) } : {}),
      ...(typeof data.firstBuyerName === 'string' && data.firstBuyerName.trim()
        ? { firstBuyerName: data.firstBuyerName.trim().slice(0, 80) }
        : {}),
    };
    if (type === 'album') {
      const tracks = Array.isArray(data?.data?.tracks) ? data.data.tracks : [];
      entry.trackCount = tracks.length;
    }
    byShareId.set(doc.id, entry);
  }

  // Nest live tracks under their album DNA so the Drop Shelf can group them.
  for (const doc of snap.docs) {
    const data = doc.data();
    const visibility = shareDocumentVisibility(data as Record<string, unknown>);
    if (!visibility.dnaLive || !canonicalDnaIds.has(doc.id)) continue;
    if (data.type !== 'album') continue;
    const albumShareId = doc.id;
    const albumTitle =
      typeof data?.data?.title === 'string' && data.data.title.trim()
        ? data.data.title.trim().slice(0, 120)
        : 'Untitled album';
    const albumUpdatedAt =
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : typeof data.createdAt === 'string'
          ? data.createdAt
          : '';
    const tracks = Array.isArray(data?.data?.tracks) ? data.data.tracks : [];

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      if (!track || typeof track !== 'object') continue;
      const shareId =
        typeof (track as { shareId?: unknown }).shareId === 'string'
          ? (track as { shareId: string }).shareId.trim()
          : '';
      const trackId =
        typeof (track as { id?: unknown }).id === 'string'
          ? (track as { id: string }).id.trim()
          : '';
      if (!shareId) continue;
      const linkedShare = shareDocsById.get(shareId);
      if (
        !linkedShare ||
        !canonicalDnaIds.has(linkedShare.id) ||
        !shareDocumentVisibility(linkedShare.data() as Record<string, unknown>).dnaLive
      ) continue;

      const trackTitle =
        typeof (track as { title?: unknown }).title === 'string' &&
        (track as { title: string }).title.trim()
          ? (track as { title: string }).title.trim().slice(0, 120)
          : 'Untitled track';

      const existing = byShareId.get(shareId);
      if (existing) {
        byShareId.set(shareId, {
          ...existing,
          type: 'track',
          albumTitle: existing.albumTitle || albumTitle,
          albumShareId,
          ...(trackId ? { trackId } : {}),
          trackIndex,
          updatedAt: existing.updatedAt || albumUpdatedAt,
        });
      } else {
        byShareId.set(shareId, {
          shareId,
          title: trackTitle,
          type: 'track',
          albumTitle,
          albumShareId,
          ...(trackId ? { trackId } : {}),
          trackIndex,
          updatedAt: albumUpdatedAt,
        });
      }
    }
  }

  return [...byShareId.values()]
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'album' ? -1 : 1;
      // Nested tracks keep album set order; otherwise newest first.
      if (
        a.type === 'track' &&
        b.type === 'track' &&
        a.albumShareId &&
        a.albumShareId === b.albumShareId
      ) {
        const ai = typeof a.trackIndex === 'number' ? a.trackIndex : Number.POSITIVE_INFINITY;
        const bi = typeof b.trackIndex === 'number' ? b.trackIndex : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 48)
    .map(({ shareId, title, type, albumTitle, albumShareId, trackId, trackIndex, trackCount, hasDropAudio, releaseLive, dnaLive, houseRelease, dropPriceSummary, playCount, previewCount, purchaseCount, firstBuyerName }) => ({
      shareId,
      title,
      type,
      ...(albumTitle ? { albumTitle } : {}),
      ...(albumShareId ? { albumShareId } : {}),
      ...(trackId ? { trackId } : {}),
      ...(typeof trackIndex === 'number' ? { trackIndex } : {}),
      ...(typeof trackCount === 'number' ? { trackCount } : {}),
      ...(hasDropAudio ? { hasDropAudio: true } : {}),
      ...(releaseLive ? { releaseLive: true } : {}),
      ...(dnaLive ? { dnaLive: true } : {}),
      ...(houseRelease ? { houseRelease: true } : {}),
      ...(dropPriceSummary ? { dropPriceSummary } : {}),
      ...(playCount ? { playCount } : {}),
      ...(previewCount ? { previewCount } : {}),
      ...(purchaseCount ? { purchaseCount } : {}),
      ...(firstBuyerName ? { firstBuyerName } : {}),
    }));
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
  studioBadge?: 'pro' | 'free';
};

/** Find live public Artist Homes by display name (prefix) or exact slug. */
export async function searchPublicArtists(
  rawQuery: string,
  opts: { limit?: number; excludeUserId?: string } = {}
): Promise<PublicArtistSearchHit[]> {
  const needle = rawQuery.trim().toLowerCase().slice(0, 48);
  if (needle.length < 1) return [];
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
      studioBadge: parseStudioBadge(data.studioBadge),
    });
  };

  // Exact slug hit (profile URLs / typed slugs).
  const slugCandidate = needle.replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '');
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

  const hits = Array.from(byUserId.values()).slice(0, limit);
  const liveBadges = await liveStudioBadgesByUserIds(
    db,
    hits.map((hit) => hit.userId)
  );
  const stamped = hits.map((hit) => ({
    ...hit,
    studioBadge: liveBadges.get(hit.userId) || hit.studioBadge || 'free',
  }));
  void persistPublicStudioBadges(
    db,
    stamped.map((hit) => ({
      slug: hit.slug,
      badge: hit.studioBadge || 'free',
      current: byUserId.get(hit.userId)?.studioBadge,
    }))
  );
  return stamped;
}

// ---------------------------------------------------------------------------
// Scene home Discover stream — light public summaries, no heavy payloads.
// ---------------------------------------------------------------------------

/**
 * Public feed/Discover avatar lives on a small subdoc so the main
 * publicProfiles/{slug} doc stays under Firestore’s size limit (Artist Home
 * banners + full custom hero don’t fit together).
 * Sources: generative Vesperfold, or custom photo upload. No collage —
 * missing asset → client shows stock initials star.
 */
async function syncPublicAvatarAsset(
  slug: string,
  summary: GamificationSummary
): Promise<void> {
  const db = await getDb();
  const avatarRef = db.doc(`publicProfiles/${slug}/assets/avatar`);
  if (summary.starMarkUseStar) {
    const seed = normalizeVesperfoldSeed(summary.starMarkSeed ?? 0);
    await avatarRef.set({
      url: vesperfoldDataUrl(seed, 128),
      source: 'vesperfold',
      starMarkSeed: seed,
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  // Feed chip: custom upload only. No collage fallback — stock = initials star.
  const custom =
    summary.profilePhotoMode === 'custom' &&
    typeof summary.profilePhotoUrl === 'string' &&
    summary.profilePhotoUrl.trim().length > 0
      ? summary.profilePhotoUrl.trim()
      : null;
  if (!custom) {
    try {
      await avatarRef.delete();
    } catch {
      /* ignore */
    }
    return;
  }
  await avatarRef.set({
    url: custom,
    source: 'custom',
    updatedAt: new Date().toISOString(),
  });
}

/** Resolve feed avatar: generative star, custom photo, or undefined (stock initials). */
export async function resolvePublicAvatar(
  slug: string,
  data: Record<string, unknown>
): Promise<string | undefined> {
  const db = await getDb();
  const avatarSnap = await db.doc(`publicProfiles/${slug}/assets/avatar`).get();
  if (avatarSnap.exists) {
    const url = avatarSnap.data()?.url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }

  const mode = data.profilePhotoMode === 'custom' ? 'custom' : 'collage';
  const userId = typeof data.userId === 'string' ? data.userId : '';

  if (data.starMarkUseStar === true) {
    const seed = normalizeVesperfoldSeed(
      typeof data.starMarkSeed === 'number' ? data.starMarkSeed : 0
    );
    const url = vesperfoldDataUrl(seed, 128);
    try {
      await db.doc(`publicProfiles/${slug}/assets/avatar`).set({
        url,
        source: 'vesperfold',
        starMarkSeed: seed,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    }
    return url;
  }

  if (mode === 'custom' && userId) {
    // Backfill for artists who set a custom photo before assets/avatar existed.
    const summarySnap = await db.doc(`users/${userId}/gamification/summary`).get();
    const summary = mergeSummary((summarySnap.data() as Partial<GamificationSummary>) || {});
    const photo =
      summary.profilePhotoMode === 'custom' && typeof summary.profilePhotoUrl === 'string'
        ? summary.profilePhotoUrl.trim()
        : '';
    if (photo) {
      try {
        await db.doc(`publicProfiles/${slug}/assets/avatar`).set({
          url: photo,
          source: 'custom',
          updatedAt: new Date().toISOString(),
        });
      } catch {
        /* ignore backfill write failures */
      }
      return photo;
    }
  }

  // No custom photo / generative star → client shows stock initials star.
  return undefined;
}

/** Resolve feed/Discover avatar for a public slug (custom photo preferred). */
export async function getPublicArtistAvatar(slug: string): Promise<string | undefined> {
  const clean = slug.trim();
  if (!clean) return undefined;
  const db = await getDb();
  const snap = await db.doc(`publicProfiles/${clean}`).get();
  if (!snap.exists) return undefined;
  return resolvePublicAvatar(clean, snap.data() as Record<string, unknown>);
}

export type PublicArtistAvatarChip = {
  avatarUrl: string | null;
  starMarkUseStar: boolean;
  starMarkSeed: number | null;
  slug: string;
  studioBadge: 'pro' | 'free';
};

/** Lightweight feed chip payload — avoids full getPublicProfile on every avatar hit. */
export async function getPublicArtistAvatarChip(
  rawSlug: string
): Promise<PublicArtistAvatarChip | null> {
  const clean = rawSlug.trim();
  if (!clean) return null;
  const db = await getDb();
  const { resolvePublicProfileSlugDoc } = await import('@/lib/server/profile-slug');
  const resolved = await resolvePublicProfileSlugDoc(db, clean);
  if (!resolved) return null;

  const { slug, data, userId } = resolved;
  const starMarkUseStar = data.starMarkUseStar === true;
  const starMarkSeed = starMarkUseStar
    ? normalizeVesperfoldSeed(typeof data.starMarkSeed === 'number' ? data.starMarkSeed : 0)
    : null;
  const cachedBadge = parseStudioBadge(data.studioBadge);

  const [avatarUrl, userSnap] = await Promise.all([
    resolvePublicAvatar(slug, data),
    userId ? db.doc(`users/${userId}`).get() : Promise.resolve(null),
  ]);

  const liveBadge = userSnap?.exists
    ? studioChromeFromSubscriptionStatus(
        typeof userSnap.data()?.subscriptionStatus === 'string'
          ? String(userSnap.data()?.subscriptionStatus)
          : null
      )
    : undefined;

  return {
    avatarUrl: avatarUrl ?? null,
    starMarkUseStar,
    starMarkSeed,
    slug,
    studioBadge: liveBadge || cachedBadge || 'free',
  };
}

/** Live Pro/Visitor chrome from user docs — not the denormalized publicProfiles field. */
async function liveStudioBadgesByUserIds(
  db: Awaited<ReturnType<typeof getDb>>,
  userIds: string[]
): Promise<Map<string, 'pro' | 'free'>> {
  const out = new Map<string, 'pro' | 'free'>();
  const unique = [...new Set(userIds.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snaps = await db.getAll(...chunk.map((id) => db.doc(`users/${id}`)));
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const status =
        typeof snap.data()?.subscriptionStatus === 'string'
          ? String(snap.data()?.subscriptionStatus)
          : null;
      out.set(snap.id, studioChromeFromSubscriptionStatus(status));
    }
  }
  return out;
}

async function persistPublicStudioBadges(
  db: Awaited<ReturnType<typeof getDb>>,
  rows: Array<{ slug?: string; badge: 'pro' | 'free'; current?: unknown }>
): Promise<void> {
  const writes = rows.filter(
    (row) => row.slug && parseStudioBadge(row.current) !== row.badge
  );
  if (!writes.length) return;
  await Promise.all(
    writes.map((row) =>
      db
        .doc(`publicProfiles/${row.slug}`)
        .set({ studioBadge: row.badge }, { merge: true })
        .catch(() => undefined)
    )
  );
}

/** Batch-resolve public slug + avatar for a set of user ids. */
async function resolvePublicAvatarsByUserIds(
  userIds: string[]
): Promise<
  Map<
    string,
    {
      slug?: string;
      displayName?: string;
      avatarUrl?: string;
      starMarkUseStar?: boolean;
      starMarkSeed?: number;
      studioBadge?: 'pro' | 'free';
      soundIdentity?: ArtistHomeSoundIdentity;
      pressing?: PressingConfig;
    }
  >
> {
  const out = new Map<
    string,
    {
      slug?: string;
      displayName?: string;
      avatarUrl?: string;
      starMarkUseStar?: boolean;
      starMarkSeed?: number;
      studioBadge?: 'pro' | 'free';
      soundIdentity?: ArtistHomeSoundIdentity;
      pressing?: PressingConfig;
    }
  >();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return out;
  const db = await getDb();
  const { needsVanitySlugUpgrade } = await import('@/lib/profile/profile-slug');

  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snap = await db.collection('publicProfiles').where('userId', 'in', chunk).get();
    const byUser = new Map<string, typeof snap.docs>();
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const userId = typeof data.userId === 'string' ? data.userId : '';
      if (!userId) continue;
      const list = byUser.get(userId) || [];
      list.push(docSnap);
      byUser.set(userId, list);
    }

    await Promise.all(
      [...byUser.entries()].map(async ([userId, docs]) => {
        const ranked = [...docs].sort((a, b) => {
          const aBad = needsVanitySlugUpgrade(a.id) ? 1 : 0;
          const bBad = needsVanitySlugUpgrade(b.id) ? 1 : 0;
          if (aBad !== bBad) return aBad - bBad;
          const aAt = String((a.data() as Record<string, unknown>)?.updatedAt || '');
          const bAt = String((b.data() as Record<string, unknown>)?.updatedAt || '');
          return bAt.localeCompare(aAt);
        });
        const best = ranked[0]!;
        const data = best.data() as Record<string, unknown>;
        const artistHome = normalizeArtistHomeConfig(data.artistHome);
        const soundIdentity = artistHome.featured.soundIdentity;
        const avatarUrl = await resolvePublicAvatar(best.id, data);
        const useStar = data.starMarkUseStar === true;
        const displayName =
          typeof data.displayName === 'string' && data.displayName.trim()
            ? data.displayName.trim()
            : undefined;
        out.set(userId, {
          slug: best.id,
          displayName,
          avatarUrl,
          starMarkUseStar: useStar,
          starMarkSeed: useStar
            ? normalizeVesperfoldSeed(
                typeof data.starMarkSeed === 'number' ? data.starMarkSeed : 0
              )
            : undefined,
          studioBadge: parseStudioBadge(data.studioBadge),
          ...(soundIdentity ? { soundIdentity } : {}),
          pressing: artistHome.theme,
        });
      })
    );
  }

  const liveBadges = await liveStudioBadgesByUserIds(db, [...out.keys()]);
  const persist: Array<{ slug?: string; badge: 'pro' | 'free'; current?: unknown }> = [];
  for (const [userId, meta] of out) {
    const live = liveBadges.get(userId);
    if (!live) continue;
    persist.push({ slug: meta.slug, badge: live, current: meta.studioBadge });
    out.set(userId, { ...meta, studioBadge: live });
  }
  void persistPublicStudioBadges(db, persist);

  return out;
}

export type DiscoverArtistSummary = {
  userId: string;
  slug: string;
  displayName: string;
  avatarUrl?: string;
  starMarkSeed?: number;
  starMarkUseStar?: boolean;
  studioBadge?: 'pro' | 'free';
  rankId?: string;
  xp?: number;
  soundIdentity?: ArtistHomeSoundIdentity;
  pressing?: PressingConfig;
  updatedAt: string;
};

/** Recently live / updated Artist Homes. */
export async function listRecentPublicProfiles(
  opts: { limit?: number; excludeUserId?: string } = {}
): Promise<DiscoverArtistSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 48);
  const db = await getDb();
  const { needsVanitySlugUpgrade } = await import('@/lib/profile/profile-slug');
  const snap = await db
    .collection('publicProfiles')
    .orderBy('updatedAt', 'desc')
    .limit(limit + 12)
    .get();
  const rows: Array<{
    userId: string;
    slug: string;
    displayName: string;
    data: Record<string, unknown>;
    rankId?: string;
    xp?: number;
    updatedAt: string;
  }> = [];
  const seenUsers = new Set<string>();
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (!userId || (opts.excludeUserId && userId === opts.excludeUserId)) continue;
    if (seenUsers.has(userId)) continue;
    if (needsVanitySlugUpgrade(docSnap.id)) continue;
    seenUsers.add(userId);
    rows.push({
      userId,
      slug: docSnap.id,
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : docSnap.id,
      data,
      rankId: typeof data.rankId === 'string' ? data.rankId : undefined,
      xp: typeof data.xp === 'number' ? data.xp : undefined,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    });
    if (rows.length >= limit) break;
  }
  const liveBadges = await liveStudioBadgesByUserIds(
    db,
    rows.map((row) => row.userId)
  );
  const artists = await Promise.all(
    rows.map(async (row) => {
      const avatarUrl = await resolvePublicAvatar(row.slug, row.data);
      const useStar = row.data.starMarkUseStar === true;
      const seed =
        typeof row.data.starMarkSeed === 'number'
          ? normalizeVesperfoldSeed(row.data.starMarkSeed)
          : undefined;
      const studioBadge =
        liveBadges.get(row.userId) || parseStudioBadge(row.data.studioBadge) || 'free';
      const artistHome = normalizeArtistHomeConfig(row.data.artistHome);
      const soundIdentity = artistHome.featured.soundIdentity;
      return {
        userId: row.userId,
        slug: row.slug,
        displayName: row.displayName,
        avatarUrl,
        starMarkUseStar: useStar,
        starMarkSeed: useStar ? seed : undefined,
        studioBadge,
        rankId: row.rankId,
        xp: row.xp,
        ...(soundIdentity ? { soundIdentity } : {}),
        pressing: artistHome.theme,
        updatedAt: row.updatedAt,
      };
    })
  );
  void persistPublicStudioBadges(
    db,
    artists.map((artist, i) => ({
      slug: artist.slug,
      badge: artist.studioBadge || 'free',
      current: rows[i]?.data.studioBadge,
    }))
  );
  return artists;
}

export type DiscoverShareSummary = {
  shareId: string;
  type: 'album' | 'track';
  title: string;
  ownerId?: string;
  ownerName: string;
  ownerSlug?: string;
  avatarUrl?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  studioBadge?: 'pro' | 'free';
  updatedAt: string;
  hasDropAudio?: boolean;
  releaseLive?: boolean;
  dnaLive?: boolean;
  houseRelease?: boolean;
  dropPriceSummary?: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  firstBuyerName?: string;
  soundIdentity?: ArtistHomeSoundIdentity;
  pressing?: PressingConfig;
};

/** Recent live music releases and lyric DNA pages — heavy payload stripped. */
export async function listRecentShareSummaries(
  opts: { limit?: number; excludeOwnerId?: string } = {}
): Promise<DiscoverShareSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 40);
  const db = await getDb();
  const snap = await db
    .collection('shares')
    .orderBy('updatedAt', 'desc')
    .limit(Math.max(48, limit * 3))
    .get();
  const canonicalDnaIds = canonicalDnaShareIds(
    snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  );
  const rows: Array<{
    shareId: string;
    type: 'album' | 'track';
    title: string;
    ownerId: string;
    ownerName: string;
    updatedAt: string;
    hasDropAudio?: boolean;
    releaseLive?: boolean;
    dnaLive?: boolean;
    houseRelease?: boolean;
    dropPriceSummary?: string;
    dropPrice?: ReturnType<typeof normalizeDropPrice>;
    playCount?: number;
    previewCount?: number;
    purchaseCount?: number;
    firstBuyerName?: string;
  }> = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const visibility = shareDocumentVisibility(data);
    const dnaLive = visibility.dnaLive && canonicalDnaIds.has(doc.id);
    if (!visibility.releaseLive && !dnaLive) continue;
    const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
    if (opts.excludeOwnerId && ownerId === opts.excludeOwnerId) continue;
    const type = data.type === 'album' ? ('album' as const) : ('track' as const);
    const payload = (data.data ?? {}) as Record<string, unknown>;
    const flags = shareDocCommerceFlags(type, {
      dropAudio: payload.dropAudio,
      dropPrice: payload.dropPrice,
    });
    const hasDropAudio = visibility.releaseLive && type === 'track' && (flags.hasDropAudio || data.hasDropAudio === true);
    const priced = normalizeDropPrice(payload.dropPrice);
    const title =
      typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim().slice(0, 120)
        : type === 'album'
          ? 'Untitled album'
          : 'Untitled track';
    rows.push({
      shareId: doc.id,
      type,
      title,
      ownerId,
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
      ...(hasDropAudio ? { hasDropAudio: true } : {}),
      ...(visibility.releaseLive ? { releaseLive: true } : {}),
      ...(dnaLive ? { dnaLive: true } : {}),
      ...(visibility.releaseLive && data.houseRelease === true ? { houseRelease: true } : {}),
      dropPriceSummary: flags.dropPriceSummary || (typeof data.dropPriceSummary === 'string' ? data.dropPriceSummary : undefined),
      ...(priced ? { dropPrice: priced } : {}),
      playCount: Number(data.playCount) > 0 ? Number(data.playCount) : undefined,
      previewCount: Number(data.previewCount) > 0 ? Number(data.previewCount) : undefined,
      purchaseCount: Number(data.purchaseCount) > 0 ? Number(data.purchaseCount) : undefined,
      firstBuyerName:
        typeof data.firstBuyerName === 'string' && data.firstBuyerName.trim()
          ? data.firstBuyerName.trim().slice(0, 80)
          : undefined,
    });
  }
  const sale = rows.filter((r) => r.releaseLive);
  const rest = rows.filter((r) => !r.releaseLive);
  const pinned = [...sale, ...rest].slice(0, limit);
  const avatars = await resolvePublicAvatarsByUserIds(pinned.map((r) => r.ownerId));
  return pinned.map((r) => {
    const meta = avatars.get(r.ownerId);
    return {
      shareId: r.shareId,
      type: r.type,
      title: r.title,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerSlug: meta?.slug,
      avatarUrl: meta?.avatarUrl,
      starMarkUseStar: meta?.starMarkUseStar,
      starMarkSeed: meta?.starMarkSeed,
      studioBadge: meta?.studioBadge,
      updatedAt: r.updatedAt,
      hasDropAudio: r.hasDropAudio,
      releaseLive: r.releaseLive,
      dnaLive: r.dnaLive,
      houseRelease: r.houseRelease,
      dropPriceSummary: r.dropPriceSummary,
      dropPrice: r.dropPrice,
      playCount: r.playCount,
      previewCount: r.previewCount,
      purchaseCount: r.purchaseCount,
      firstBuyerName: r.firstBuyerName,
      soundIdentity: meta?.soundIdentity,
      pressing: meta?.pressing,
    };
  });
}

export type DiscoverPostSummary = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  text: string;
  embedUrl?: string;
  embedProvider?: string;
  imageUrl?: string;
  isReverb?: boolean;
  sourceKind?: 'post' | 'song' | 'dna';
  reverbPostId?: string;
  reverbOwnerId?: string;
  reverbOwnerName?: string;
  reverbOwnerSlug?: string;
  reverbText?: string;
  reverbEmbedUrl?: string;
  reverbImageUrl?: string;
  createdAt: string;
  pressing?: PressingConfig;
  /** Verified Love / reply / Reverb / view total. Present when the post has heat. */
  discoverHeat?: number;
  lastEngagedAt?: string;
  soundIdentity?: ArtistHomeSoundIdentity;
};

function discoverPostFromDoc(
  id: string,
  data: Record<string, unknown>,
  warm: boolean
): (DiscoverPostSummary & { warm: boolean }) | null {
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  if (!ownerId) return null;
  const discoverHeat = Math.max(0, Math.floor(Number(data.discoverHeat) || 0));
  const lastEngagedAt = typeof data.lastEngagedAt === 'string' ? data.lastEngagedAt : '';
  return {
    id,
    ownerId,
    ownerName: String(data.ownerName || 'Artist'),
    ownerSlug: typeof data.ownerSlug === 'string' ? data.ownerSlug : undefined,
    text: String(data.text || ''),
    embedUrl: typeof data.embedUrl === 'string' ? data.embedUrl : undefined,
    embedProvider: typeof data.embedProvider === 'string' ? data.embedProvider : undefined,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    ...(data.isReverb === true ? { isReverb: true } : {}),
    ...(data.sourceKind === 'post' || data.sourceKind === 'song' || data.sourceKind === 'dna'
      ? { sourceKind: data.sourceKind }
      : {}),
    ...(typeof data.reverbPostId === 'string' ? { reverbPostId: data.reverbPostId } : {}),
    ...(typeof data.reverbOwnerId === 'string' ? { reverbOwnerId: data.reverbOwnerId } : {}),
    ...(typeof data.reverbOwnerName === 'string' ? { reverbOwnerName: data.reverbOwnerName } : {}),
    ...(typeof data.reverbOwnerSlug === 'string' ? { reverbOwnerSlug: data.reverbOwnerSlug } : {}),
    ...(typeof data.reverbText === 'string' ? { reverbText: data.reverbText } : {}),
    ...(typeof data.reverbEmbedUrl === 'string' ? { reverbEmbedUrl: data.reverbEmbedUrl } : {}),
    ...(typeof data.reverbImageUrl === 'string' ? { reverbImageUrl: data.reverbImageUrl } : {}),
    createdAt: String(data.createdAt || ''),
    ...(discoverHeat > 0 ? { discoverHeat } : {}),
    ...(lastEngagedAt ? { lastEngagedAt } : {}),
    warm,
  };
}

/** Recent public wall posts — only from owners with a live Artist Home. */
export async function listRecentPublicPosts(
  opts: { limit?: number; excludeOwnerId?: string; heatMix?: boolean } = {}
): Promise<DiscoverPostSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 40);
  const db = await getDb();
  // Post ids are lexicographically newest-first, so document-id order = recency.
  // Pull extra so we can drop posts whose owner no longer has a live profile.
  const snap = await db.collection('posts').limit(Math.max(120, limit * 4)).get();
  const warmSnap = opts.heatMix
    ? await db
        .collection('posts')
        .where(
          'lastEngagedAt',
          '>=',
          new Date(Date.now() - DISCOVER_HEAT_WINDOW_DAYS * 86_400_000).toISOString()
        )
        .orderBy('lastEngagedAt', 'desc')
        .limit(DISCOVER_WARM_LIMIT + limit)
        .get()
        .catch((error) => {
          console.warn('[discover-heat] warm posts', error);
          return null;
        })
    : null;
  const seen = new Set<string>();
  const candidates: Array<DiscoverPostSummary & { warm: boolean }> = [];
  const pushDoc = (id: string, data: Record<string, unknown>, warm: boolean) => {
    if (seen.has(id)) return;
    if (opts.excludeOwnerId && data.ownerId === opts.excludeOwnerId) return;
    if (warm && Math.floor(Number(data.discoverHeat) || 0) <= 0) return;
    const post = discoverPostFromDoc(id, data, warm);
    if (!post) return;
    seen.add(id);
    candidates.push(post);
  };
  for (const doc of snap.docs) {
    pushDoc(doc.id, doc.data() as Record<string, unknown>, false);
    if (!opts.heatMix && candidates.length >= limit * 3) break;
  }
  for (const doc of warmSnap?.docs || []) {
    pushDoc(doc.id, doc.data() as Record<string, unknown>, true);
  }

  const dnaSourceIds = candidates
    .filter((post) => post.sourceKind === 'dna' && post.reverbPostId)
    .map((post) => post.reverbPostId!);
  const liveDnaSourceIds = await canonicalLiveDnaShareIds(db, dnaSourceIds);
  const publicCandidates = candidates.filter(
    (post) => post.sourceKind !== 'dna' || !post.reverbPostId || liveDnaSourceIds.has(post.reverbPostId)
  );

  const ownerIds = publicCandidates.flatMap((p) =>
    [p.ownerId, p.reverbOwnerId].filter((id): id is string => Boolean(id))
  );
  const live = await resolvePublicAvatarsByUserIds(ownerIds);

  const out: DiscoverPostSummary[] = [];
  const ownerCounts = new Map<string, number>();
  let recentCount = 0;
  let warmCount = 0;
  for (const p of publicCandidates) {
    const ownerMeta = live.get(p.ownerId);
    if (!ownerMeta?.slug) continue; // no live Artist Home
    const ownerCount = ownerCounts.get(p.ownerId) || 0;
    if (p.warm) {
      if (ownerCount >= DISCOVER_WARM_PER_OWNER || warmCount >= DISCOVER_WARM_LIMIT) continue;
    } else if (recentCount >= limit) {
      continue;
    }
    const reverbMeta = p.reverbOwnerId ? live.get(p.reverbOwnerId) : undefined;
    const { warm, ...post } = p;
    void warm;
    out.push({
      ...post,
      ownerSlug: ownerMeta.slug,
      ownerName: ownerMeta.displayName || p.ownerName,
      ...(reverbMeta?.slug ? { reverbOwnerSlug: reverbMeta.slug } : {}),
      ...(reverbMeta?.displayName ? { reverbOwnerName: reverbMeta.displayName } : {}),
      pressing: ownerMeta.pressing,
      ...(opts.heatMix && ownerMeta.soundIdentity ? { soundIdentity: ownerMeta.soundIdentity } : {}),
    });
    ownerCounts.set(p.ownerId, ownerCount + 1);
    if (p.warm) warmCount += 1;
    else recentCount += 1;
  }
  return out;
}

export type DiscoverRiserSummary = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  avatarUrl?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  studioBadge?: 'pro' | 'free';
  barsWritten7d: number;
  currentStreak: number;
  pressing?: PressingConfig;
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
  const rows: Array<{
    userId: string;
    displayName: string;
    profileSlug?: string;
    barsWritten7d: number;
    currentStreak: number;
  }> = [];
  for (const doc of snap.docs) {
    if (opts.excludeUserId && doc.id === opts.excludeUserId) continue;
    const data = doc.data() as Record<string, unknown>;
    rows.push({
      userId: doc.id,
      displayName: String(data.displayName || 'Artist'),
      profileSlug: typeof data.profileSlug === 'string' ? data.profileSlug : undefined,
      barsWritten7d: Number(data.barsWritten7d || 0),
      currentStreak: Number(data.currentStreak || 0),
    });
    if (rows.length >= limit) break;
  }
  const avatars = await resolvePublicAvatarsByUserIds(rows.map((r) => r.userId));
  return rows.map((r) => {
    const meta = avatars.get(r.userId);
    return {
      ...r,
      // Prefer live publicProfiles slug over baked leaderboard profileSlug.
      profileSlug: meta?.slug || r.profileSlug,
      displayName: meta?.displayName || r.displayName,
      avatarUrl: meta?.avatarUrl,
      starMarkUseStar: meta?.starMarkUseStar,
      starMarkSeed: meta?.starMarkSeed,
      studioBadge: meta?.studioBadge,
      pressing: meta?.pressing,
    };
  });
}

/**
 * Prestige reset — available after Vault Architect + all lifetime personal milestones.
 * Keeps social lifetime counters; clears writing cycle stats + trophies so scaled
 * ceilings create a fresh climb (never gated on "be prestige N").
 */
export async function prestigeResetForUser(userId: string): Promise<GamificationSummary> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Server unavailable');
  }
  const db = await getDb();
  const [gamSnap, userSnap] = await Promise.all([
    db.doc(`users/${userId}/gamification/summary`).get(),
    db.doc(`users/${userId}`).get(),
  ]);
  const summary = mergeSummary((gamSnap.data() as Partial<GamificationSummary>) || {});
  const isPro = userSnap.data()?.subscriptionStatus === 'active';
  if (!canPrestigeReset(summary, isPro)) {
    throw new Error(
      'Prestige unlocks after Vault Architect plus every personal lifetime milestone.'
    );
  }

  const nextLevel = getPrestigeLevel(summary) + 1;
  const now = new Date().toISOString();
  const reset: GamificationSummary = {
    ...summary,
    prestigeLevel: nextLevel,
    xp: 0,
    rankId: 'open_mic',
    unlockedAchievements: {},
    lifetimeBarsWritten: 0,
    lifetimeLinesGenerated: 0,
    lifetimeTracksCompleted: 0,
    lifetimeGenerateNextLine: 0,
    lifetimeStudioSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    personalBests: { barsInDay: 0, longestStreak: 0, barsInSession: 0 },
    generateNextLineMonthCount: 0,
    tracksCompletedMonthCount: 0,
    monthlyChallengeProgress: {},
    weeklyChallengeProgress: {},
    generateNextLineWeekCount: 0,
    tracksCompletedWeekCount: 0,
    dnaFilledWeekCount: 0,
    dnaImportWeekCount: 0,
    friendshipWeekCount: 0,
    wallPostWeekCount: 0,
    shareCreatedWeekCount: 0,
    barsWrittenToday: 0,
    barsWritten7d: 0,
    tracksCompleted30d: 0,
    updatedAt: now,
  };

  await db.doc(`users/${userId}/gamification/summary`).set(reset);
  const displayName = String(userSnap.data()?.displayName || 'Artist');
  await syncPublicProfile(userId, reset, displayName);
  await syncLeaderboardEntry(userId, reset, displayName);
  return reset;
}

export { countNonEmptyBars };

const RENDER_ACHIEVEMENT_MAP: Record<string, string> = {
  first_playback: 'render_first_playback',
  keeper_take: 'render_keeper_take',
  beat_on_deck: 'render_beat_on_deck',
  surgical_session: 'render_surgical_session',
  session_split: 'render_session_split',
  signature_set: 'render_signature_set',
  sheet_to_stage: 'render_sheet_to_stage',
};

/** Server-verified render workflow trophies (no Ink farming). */
export async function noteRenderAchievement(
  userId: string,
  key: keyof typeof RENDER_ACHIEVEMENT_MAP
): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;
  const achievementId = RENDER_ACHIEVEMENT_MAP[key];
  if (!achievementId) return;
  const db = await getDb();
  await db.doc(`users/${userId}/gamification/renderFlags`).set(
    { [key]: true, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  const userSnap = await db.doc(`users/${userId}`).get();
  const displayName = String(userSnap.data()?.displayName || 'Artist');
  await processGamificationEvent(
    userId,
    'ai_action',
    { renderAchievementKey: key, achievementId },
    displayName
  );
}
