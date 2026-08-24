import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import {
  EMERGING_FORMULA,
  EMERGING_WINDOW_DAYS,
  emergingReasons,
  emergingScore,
  emptyEmergingSignals,
  type EmergingRankingResponse,
  type EmergingSignals,
} from '@/lib/emerging-ranking';

function count(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function daysThrough(at = new Date()): string[] {
  const through = new Date(at);
  through.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: EMERGING_WINDOW_DAYS }, (_, index) => {
    const day = new Date(through);
    day.setUTCDate(day.getUTCDate() - (EMERGING_WINDOW_DAYS - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

function signalsFrom(data: Record<string, unknown>): EmergingSignals {
  return {
    qualifiedListeners: count(data.qualifiedListeners),
    repeatListeners: count(data.repeatListeners),
    follows: count(data.follows),
    innerCircleJoins: count(data.innerCircleJoins),
    convertedShares: count(data.convertedShares),
    purchaseConversions: count(data.purchaseConversions),
  };
}

function addSignals(target: EmergingSignals, next: EmergingSignals): void {
  for (const field of Object.keys(target) as Array<keyof EmergingSignals>) {
    target[field] += next[field];
  }
}

export async function getEmergingRanking(
  db: Firestore,
  at = new Date()
): Promise<EmergingRankingResponse> {
  const days = daysThrough(at);
  const daySnapshots = await Promise.all(
    days.map((day) => db.collection(`emergingSignals/${day}/entries`).get())
  );
  const totals = new Map<string, EmergingSignals>();
  for (const snap of daySnapshots) {
    for (const doc of snap.docs) {
      const current = totals.get(doc.id) || emptyEmergingSignals();
      addSignals(current, signalsFrom(doc.data()));
      totals.set(doc.id, current);
    }
  }

  const ranked = [...totals.entries()]
    .map(([userId, signals]) => ({ userId, signals, score: emergingScore(signals) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
    .slice(0, 100);

  const summaries = ranked.length
    ? await db.getAll(...ranked.map((row) => db.doc(`users/${row.userId}/gamification/summary`)))
    : [];
  const eligible = ranked.flatMap((row, index) => {
    const summary = summaries[index]?.data() || {};
    const eligible =
      summary.leaderboardHidden !== true &&
      summary.publicProfile === true &&
      typeof summary.profileSlug === 'string' &&
      summary.profileSlug.trim().length > 0;
    return eligible ? [{ ...row, profileSlug: String(summary.profileSlug).trim() }] : [];
  });
  const profiles = eligible.length
    ? await db.getAll(...eligible.map((row) => db.doc(`publicProfiles/${row.profileSlug}`)))
    : [];

  const entries = eligible.flatMap((row, index) => {
    const profile = profiles[index];
    const data = profile?.data() || {};
    if (!profile?.exists || data.userId !== row.userId) return [];
    return [{
      userId: row.userId,
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim().slice(0, 120)
          : 'Music Fan',
      profileSlug: row.profileSlug,
      score: row.score,
      signals: row.signals,
      reasons: emergingReasons(row.signals),
    }];
  }).slice(0, 50);

  return {
    window: { days: 7, from: days[0], through: days.at(-1) || days[0] },
    entries,
    formula: EMERGING_FORMULA,
    integrity: {
      leaderboardOptInRequired: true,
      liveProfileRequired: true,
      paymentAmountAffectsRank: false,
      inkAffectsRank: false,
      subscriptionTierAffectsRank: false,
      sponsoredPlacementAffectsRank: false,
    },
  };
}
