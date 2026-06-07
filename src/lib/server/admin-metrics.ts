import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  PRO_MONTHLY_PRICE_AMOUNT,
  PRO_YEARLY_PRICE_AMOUNT,
} from '@/lib/studio-tiers';
import { FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT, SIGNUP_INK, FREE_MONTHLY_RESIDENCY_INK } from '@/lib/subscription';
import type {
  AdminMetricsSnapshot,
  DailyCount,
  SignupAttributionRow,
  SignupAttributionStats,
} from '@/lib/admin-metrics-types';
import { marketingRefLabel, normalizeMarketingRef } from '@/lib/marketing-attribution';

export type { AdminMetricsSnapshot, DailyCount } from '@/lib/admin-metrics-types';

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function buildDailyCounts(dates: Date[], days = 30): DailyCount[] {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function computeAdminMetrics(): Promise<AdminMetricsSnapshot> {
  if (!hasAdminFirestoreCredentials()) {
    return emptyMetrics('Firebase Admin credentials required to load metrics.');
  }

  const db = await getDb();
  const now = new Date();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  const d90 = daysAgo(90);

  const [usersSnap, eventsSnap, logsSnap, marketingSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('analytics_events').orderBy('timestamp', 'desc').limit(500).get(),
    db.collection('system').doc('logs').collection('entries').orderBy('timestamp', 'desc').limit(1000).get(),
    db.doc('studioMetrics/marketing').get(),
  ]);

  const marketing = marketingSnap.data() || {};
  const adSpend30d = Number(marketing.adSpend30d || 0);
  const adSpend90d = Number(marketing.adSpend90d || 0);
  const notes = String(marketing.notes || '');

  const users = usersSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((u) => u.status !== 'blocked');

  const signupDates: Date[] = [];
  let activatedUsers = 0;
  let totalHoursToFirstAi = 0;
  let firstAiCount = 0;
  let totalHoursToFirstLine = 0;
  let firstLineCount = 0;
  let trackEditorOpens = 0;
  let pricingPageViews = 0;
  let checkoutStarts = 0;
  let checkoutCompletions = 0;
  let usersWith7DayReturn = 0;
  let activeLast7Days = 0;
  let activeLast30Days = 0;
  let usersAtAlbumLimit = 0;
  let usersAtTrackLimit = 0;
  let usersLowInk = 0;
  let freeLimitHitEvents = 0;
  let upgradeClickEvents = 0;
  let activeProMonthly = 0;
  let activeProYearly = 0;

  type AttributionBucket = {
    signupsTotal: number;
    signupsLast7Days: number;
    signupsLast30Days: number;
    signupsLast90Days: number;
    activated: number;
    proActive: number;
  };
  const attributionByRef = new Map<string, AttributionBucket>();

  const bumpAttribution = (refKey: string, patch: Partial<AttributionBucket>) => {
    const existing = attributionByRef.get(refKey) || {
      signupsTotal: 0,
      signupsLast7Days: 0,
      signupsLast30Days: 0,
      signupsLast90Days: 0,
      activated: 0,
      proActive: 0,
    };
    attributionByRef.set(refKey, {
      signupsTotal: existing.signupsTotal + (patch.signupsTotal || 0),
      signupsLast7Days: existing.signupsLast7Days + (patch.signupsLast7Days || 0),
      signupsLast30Days: existing.signupsLast30Days + (patch.signupsLast30Days || 0),
      signupsLast90Days: existing.signupsLast90Days + (patch.signupsLast90Days || 0),
      activated: existing.activated + (patch.activated || 0),
      proActive: existing.proActive + (patch.proActive || 0),
    });
  };

  const summarySnaps = await Promise.all(
    users.map((u) => db.doc(`users/${u.id}/analytics/summary`).get())
  );

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const summary = summarySnaps[i].data() || {};

    const createdAt =
      parseDate(u.createdAt) ||
      parseDate(summary.signupAt) ||
      null;
    if (createdAt) signupDates.push(createdAt);

    const rawAttribution =
      typeof (u as { signupAttribution?: unknown }).signupAttribution === 'string'
        ? (u as { signupAttribution: string }).signupAttribution
        : null;
    const refKey = rawAttribution?.trim()
      ? normalizeMarketingRef(rawAttribution) || rawAttribution.trim().toLowerCase()
      : 'organic';
    bumpAttribution(refKey, {
      signupsTotal: 1,
      signupsLast7Days: createdAt && createdAt >= d7 ? 1 : 0,
      signupsLast30Days: createdAt && createdAt >= d30 ? 1 : 0,
      signupsLast90Days: createdAt && createdAt >= d90 ? 1 : 0,
    });

    const firstAiAt = parseDate(summary.firstAiAt);
    if (firstAiAt && createdAt) {
      activatedUsers += 1;
      totalHoursToFirstAi += hoursBetween(createdAt, firstAiAt);
      firstAiCount += 1;
      bumpAttribution(refKey, { activated: 1 });
    }

    const firstLineAt = parseDate(summary.firstGenerateNextLineAt);
    if (firstLineAt && createdAt) {
      totalHoursToFirstLine += hoursBetween(createdAt, firstLineAt);
      firstLineCount += 1;
    }

    if (summary.firstTrackEditorAt) trackEditorOpens += 1;
    pricingPageViews += Number(summary.pricingViews || 0);
    checkoutStarts += Number(summary.checkoutStarts || 0);
    checkoutCompletions += Number(summary.checkoutCompletions || 0);
    freeLimitHitEvents += Number(summary.freeLimitHits || 0);

    const lastActive = parseDate(summary.lastActiveAt);
    if (lastActive) {
      if (lastActive >= d7) activeLast7Days += 1;
      if (lastActive >= d30) activeLast30Days += 1;
    }

    const sessionDates: string[] = summary.sessionDates || [];
    if (createdAt && sessionDates.length >= 2) {
      const signupDay = createdAt.toISOString().slice(0, 10);
      const returnedWithin7 = sessionDates.some((day) => {
        if (day <= signupDay) return false;
        const diff = (new Date(day).getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 7;
      });
      if (returnedWithin7) usersWith7DayReturn += 1;
    }

    if (u.subscriptionStatus === 'active') {
      if (u.subscriptionTier === 'yearly') activeProYearly += 1;
      else activeProMonthly += 1;
      bumpAttribution(refKey, { proActive: 1 });
    }

    if (!u.subscriptionStatus || u.subscriptionStatus !== 'active') {
      const albumsSnap = await db.collection('users').doc(u.id).collection('albums').get();
      const albumCount = albumsSnap.size;
      let trackCount = 0;
      for (const albumDoc of albumsSnap.docs) {
        const tracksSnap = await albumDoc.ref.collection('tracks').get();
        trackCount += tracksSnap.size;
      }
      if (albumCount >= FREE_ALBUM_LIMIT) usersAtAlbumLimit += 1;
      if (trackCount >= FREE_TRACK_LIMIT) usersAtTrackLimit += 1;

      const balSnap = await db.doc(`users/${u.id}/usage/balance`).get();
      const bal = balSnap.data();
      const totalInk = (bal?.residencyBalance || 0) + (bal?.purchasedBalance || 0);
      const lowThreshold = Math.min(50, Math.floor((SIGNUP_INK + FREE_MONTHLY_RESIDENCY_INK) * 0.15));
      if (totalInk <= lowThreshold) usersLowInk += 1;
    }
  }

  for (const doc of eventsSnap.docs) {
    const data = doc.data();
    if (data.event === 'upgrade_click') upgradeClickEvents += 1;
  }

  let achievementUnlockEvents = 0;
  let streakMilestoneEvents = 0;
  let shareCardGenerated = 0;
  let shareCardOpened = 0;
  let leaderboardViews = 0;
  for (const doc of eventsSnap.docs) {
    const ev = String(doc.data().event || '');
    if (ev === 'achievement_unlocked') achievementUnlockEvents += 1;
    if (ev === 'streak_milestone') streakMilestoneEvents += 1;
    if (ev === 'share_card_generated') shareCardGenerated += 1;
    if (ev === 'share_card_opened') shareCardOpened += 1;
    if (ev === 'leaderboard_view') leaderboardViews += 1;
  }

  const gamSnaps = await Promise.all(
    users.map((u) => db.doc(`users/${u.id}/gamification/summary`).get())
  );
  let usersWithAchievements = 0;
  let streakSum = 0;
  let streakCount = 0;
  for (const snap of gamSnaps) {
    const g = snap.data() || {};
    if (g.unlockedAchievements && Object.keys(g.unlockedAchievements).length > 0) {
      usersWithAchievements += 1;
    }
    if (typeof g.currentStreak === 'number' && g.currentStreak > 0) {
      streakSum += g.currentStreak;
      streakCount += 1;
    }
  }
  const avgStreakActiveUsers =
    streakCount > 0 ? Math.round((streakSum / streakCount) * 10) / 10 : 0;

  const signupsLast7 = signupDates.filter((d) => d >= d7).length;
  const signupsLast30 = signupDates.filter((d) => d >= d30).length;
  const signupsLast90 = signupDates.filter((d) => d >= d90).length;

  let inkPackRevenue30d = 0;
  let inkPackRevenue90d = 0;
  let subscriptionRevenue30d = 0;
  let payingUsers = new Set<string>();

  for (const doc of logsSnap.docs) {
    const log = doc.data();
    if (log.type !== 'transaction') continue;
    const ts = parseDate(log.timestamp);
    if (!ts) continue;
    const gross = parseFloat(String(log.details || '').replace(/[^\d.]/g, '')) || Math.abs(log.usdCost || 0);
    const action = String(log.action || '');
    if (ts >= d30) {
      if (action === 'Ink Pack Purchase') inkPackRevenue30d += gross;
      if (action === 'Pro Membership') subscriptionRevenue30d += gross;
    }
    if (ts >= d90 && action === 'Ink Pack Purchase') inkPackRevenue90d += gross;
    if (log.userId) payingUsers.add(log.userId);
  }

  const estimatedMrr =
    activeProMonthly * PRO_MONTHLY_PRICE_AMOUNT + activeProYearly * PRO_YEARLY_PRICE_AMOUNT;

  const totalSignups = users.length;
  const activationRatePercent =
    totalSignups > 0 ? Math.round((activatedUsers / totalSignups) * 1000) / 10 : 0;
  const sevenDayReturnRatePercent =
    totalSignups > 0 ? Math.round((usersWith7DayReturn / totalSignups) * 1000) / 10 : 0;

  const pricingToCheckoutRatePercent =
    pricingPageViews > 0 ? Math.round((checkoutStarts / pricingPageViews) * 1000) / 10 : 0;
  const checkoutToPaidRatePercent =
    checkoutStarts > 0 ? Math.round((checkoutCompletions / checkoutStarts) * 1000) / 10 : 0;
  const signupToPaidRatePercent =
    totalSignups > 0
      ? Math.round(((activeProMonthly + activeProYearly) / totalSignups) * 1000) / 10
      : 0;

  const totalSignupsForAttribution = users.length;
  const attributionRows: SignupAttributionRow[] = Array.from(attributionByRef.entries())
    .map(([ref, bucket]) => ({
      ref,
      label: marketingRefLabel(ref),
      signupsTotal: bucket.signupsTotal,
      signupsLast7Days: bucket.signupsLast7Days,
      signupsLast30Days: bucket.signupsLast30Days,
      signupsLast90Days: bucket.signupsLast90Days,
      activated: bucket.activated,
      activationRatePercent:
        bucket.signupsTotal > 0
          ? Math.round((bucket.activated / bucket.signupsTotal) * 1000) / 10
          : 0,
      proActive: bucket.proActive,
      shareOfSignupsPercent:
        totalSignupsForAttribution > 0
          ? Math.round((bucket.signupsTotal / totalSignupsForAttribution) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => {
      if (a.ref === 'organic') return 1;
      if (b.ref === 'organic') return -1;
      return b.signupsTotal - a.signupsTotal;
    });

  const organicSignups = attributionByRef.get('organic')?.signupsTotal || 0;
  const signupAttribution: SignupAttributionStats = {
    taggedSignups: totalSignupsForAttribution - organicSignups,
    organicSignups,
    byRef: attributionRows,
  };

  const recentEvents = eventsSnap.docs.slice(0, 25).map((doc) => {
    const data = doc.data();
    return {
      timestamp: String(data.timestamp || ''),
      event: String(data.event || ''),
      userId: String(data.userId || ''),
      userName: data.userName ? String(data.userName) : null,
      metadata: (data.metadata as Record<string, unknown>) || {},
    };
  });

  return {
    generatedAt: now.toISOString(),
    funnel: {
      totalSignups,
      signupsLast7Days: signupsLast7,
      signupsLast30Days: signupsLast30,
      signupsLast90Days: signupsLast90,
      signupsByDay: buildDailyCounts(signupDates, 30),
      activatedUsers,
      activationRatePercent,
      avgHoursToFirstAi: firstAiCount > 0 ? Math.round((totalHoursToFirstAi / firstAiCount) * 10) / 10 : null,
      avgHoursToFirstGenerateNextLine:
        firstLineCount > 0 ? Math.round((totalHoursToFirstLine / firstLineCount) * 10) / 10 : null,
      trackEditorOpens,
      pricingPageViews,
      checkoutStarts,
      checkoutCompletions,
      pricingToCheckoutRatePercent,
      checkoutToPaidRatePercent,
      signupToPaidRatePercent,
    },
    retention: {
      usersWith7DayReturn,
      sevenDayReturnRatePercent,
      activeLast7Days,
      activeLast30Days,
    },
    monetization: {
      activeProMonthly,
      activeProYearly,
      estimatedMrr: Math.round(estimatedMrr * 100) / 100,
      inkPackRevenue30d: Math.round(inkPackRevenue30d * 100) / 100,
      inkPackRevenue90d: Math.round(inkPackRevenue90d * 100) / 100,
      subscriptionRevenue30d: Math.round(subscriptionRevenue30d * 100) / 100,
      totalRevenue30d: Math.round((inkPackRevenue30d + subscriptionRevenue30d) * 100) / 100,
      totalRevenue90d: Math.round((inkPackRevenue90d + subscriptionRevenue30d) * 100) / 100,
      avgRevenuePerPayingUser:
        payingUsers.size > 0
          ? Math.round(((inkPackRevenue90d + subscriptionRevenue30d) / payingUsers.size) * 100) / 100
          : 0,
    },
    freeTierPressure: {
      usersAtAlbumLimit,
      usersAtTrackLimit,
      usersLowInk,
      freeLimitHitEvents,
      upgradeClickEvents,
    },
    acquisition: {
      adSpend30d,
      adSpend90d,
      costPerSignup: adSpend30d > 0 && signupsLast30 > 0 ? Math.round((adSpend30d / signupsLast30) * 100) / 100 : null,
      costPerActivatedUser:
        adSpend30d > 0 && activatedUsers > 0
          ? Math.round((adSpend30d / activatedUsers) * 100) / 100
          : null,
      notes,
    },
    signupAttribution,
    recentEvents,
    gamification: {
      usersWithAchievements,
      achievementUnlockEvents,
      streakMilestoneEvents,
      shareCardGenerated,
      shareCardOpened,
      leaderboardViews,
      avgStreakActiveUsers,
    },
  };
}

function emptyMetrics(notes: string): AdminMetricsSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    funnel: {
      totalSignups: 0,
      signupsLast7Days: 0,
      signupsLast30Days: 0,
      signupsLast90Days: 0,
      signupsByDay: [],
      activatedUsers: 0,
      activationRatePercent: 0,
      avgHoursToFirstAi: null,
      avgHoursToFirstGenerateNextLine: null,
      trackEditorOpens: 0,
      pricingPageViews: 0,
      checkoutStarts: 0,
      checkoutCompletions: 0,
      pricingToCheckoutRatePercent: 0,
      checkoutToPaidRatePercent: 0,
      signupToPaidRatePercent: 0,
    },
    retention: {
      usersWith7DayReturn: 0,
      sevenDayReturnRatePercent: 0,
      activeLast7Days: 0,
      activeLast30Days: 0,
    },
    monetization: {
      activeProMonthly: 0,
      activeProYearly: 0,
      estimatedMrr: 0,
      inkPackRevenue30d: 0,
      inkPackRevenue90d: 0,
      subscriptionRevenue30d: 0,
      totalRevenue30d: 0,
      totalRevenue90d: 0,
      avgRevenuePerPayingUser: 0,
    },
    freeTierPressure: {
      usersAtAlbumLimit: 0,
      usersAtTrackLimit: 0,
      usersLowInk: 0,
      freeLimitHitEvents: 0,
      upgradeClickEvents: 0,
    },
    acquisition: { adSpend30d: 0, adSpend90d: 0, costPerSignup: null, costPerActivatedUser: null, notes },
    signupAttribution: { taggedSignups: 0, organicSignups: 0, byRef: [] },
    recentEvents: [],
    gamification: {
      usersWithAchievements: 0,
      achievementUnlockEvents: 0,
      streakMilestoneEvents: 0,
      shareCardGenerated: 0,
      shareCardOpened: 0,
      leaderboardViews: 0,
      avgStreakActiveUsers: 0,
    },
  };
}
