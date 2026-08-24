import 'server-only';

import type { DocumentSnapshot, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { EMERGING_FORMULA } from '@/lib/emerging-ranking';
import {
  MUSIC_CHART_WINDOW_DAYS,
  TRACK_CHART_FORMULA,
  chartRegionLabels,
  emptyTrackChartSignals,
  trackChartReasons,
  trackChartScore,
  type MusicChartsResponse,
  type TrackChartSignals,
} from '@/lib/music-charts';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';
import { getEmergingRanking } from '@/lib/server/emerging-ranking';

type TrackAggregate = {
  shareId: string;
  ownerId: string;
  title: string;
  signals: TrackChartSignals;
  updatedAt?: string;
};

type PublicChartProfile = {
  userId: string;
  slug: string;
  displayName: string;
  genres: string[];
  regions: string[];
};

function count(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function clean(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function daysThrough(at = new Date()): string[] {
  const through = new Date(at);
  through.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: MUSIC_CHART_WINDOW_DAYS }, (_, index) => {
    const day = new Date(through);
    day.setUTCDate(day.getUTCDate() - (MUSIC_CHART_WINDOW_DAYS - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

function addSignals(target: TrackChartSignals, data: Record<string, unknown>): void {
  target.qualifiedListeners += count(data.qualifiedListeners);
  target.completions += count(data.completions);
  target.repeatListeners += count(data.repeatListeners);
  // `purchases` remains the creator-facing sales total. Charts use the
  // owner-excluded proof counter so self-checkouts cannot buy chart position.
  target.purchaseConversions += count(data.organicPurchases);
}

function uniqueLabels(values: Array<string | undefined>, max = 8): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const value of values) {
    const label = clean(value, 80);
    const key = label.toLocaleLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length >= max) break;
  }
  return labels;
}

function profileFromSnapshot(snapshot: DocumentSnapshot): PublicChartProfile | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() as Record<string, unknown>;
  const userId = clean(data.userId, 128);
  if (!userId) return null;
  const identity = normalizeArtistHomeConfig(data.artistHome).featured.soundIdentity;
  return {
    userId,
    slug: snapshot.id,
    displayName: clean(data.displayName, 120) || 'Music Fan',
    genres: uniqueLabels(identity?.genres || []),
    regions: chartRegionLabels(identity?.region),
  };
}

export async function getMusicCharts(
  db: Firestore,
  at = new Date(),
  options: { trackLimit?: number; artistLimit?: number } = {}
): Promise<MusicChartsResponse> {
  const days = daysThrough(at);
  const trackLimit = Math.min(Math.max(Math.floor(options.trackLimit || 100), 1), 100);
  const artistLimit = Math.min(Math.max(Math.floor(options.artistLimit || 50), 1), 50);
  const emerging = await getEmergingRanking(db, at);
  let dailyDocs: QueryDocumentSnapshot[];
  try {
    const dailySnapshot = await db
      .collectionGroup('dropInsightDays')
      .where('day', '>=', days[0])
      .limit(5000)
      .get();
    dailyDocs = dailySnapshot.docs;
  } catch (error) {
    const code = Number((error as { code?: unknown })?.code);
    if (code !== 9) throw error;
    // New deployments remain functional while the collection-group index builds.
    const ownerSnapshots = await Promise.all(
      emerging.entries.map((entry) =>
        db
          .collection('users')
          .doc(entry.userId)
          .collection('dropInsightDays')
          .where('day', '>=', days[0])
          .limit(700)
          .get()
      )
    );
    dailyDocs = ownerSnapshots.flatMap((snapshot) => snapshot.docs);
  }

  const trackTotals = new Map<string, TrackAggregate>();
  for (const snapshot of dailyDocs) {
    const data = snapshot.data() as Record<string, unknown>;
    const shareId = clean(data.shareId, 128);
    const ownerId = clean(data.ownerId, 128);
    if (!shareId || !ownerId) continue;
    const current = trackTotals.get(shareId) || {
      shareId,
      ownerId,
      title: clean(data.title, 120) || 'First Drop',
      signals: emptyTrackChartSignals(),
    };
    addSignals(current.signals, data);
    const updatedAt = clean(data.updatedAt, 40);
    if (updatedAt && (!current.updatedAt || updatedAt > current.updatedAt)) {
      current.updatedAt = updatedAt;
    }
    trackTotals.set(shareId, current);
  }

  const rankedAggregates = [...trackTotals.values()]
    .map((entry) => ({ ...entry, score: trackChartScore(entry.signals) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.shareId.localeCompare(b.shareId))
    .slice(0, 250);

  const shareSnapshots = rankedAggregates.length
    ? await db.getAll(...rankedAggregates.map((entry) => db.doc(`shares/${entry.shareId}`)))
    : [];
  const shareCandidates = rankedAggregates.flatMap((entry, index) => {
    const snapshot = shareSnapshots[index];
    if (!snapshot?.exists) return [];
    const share = snapshot.data() as Record<string, unknown>;
    if (share.type === 'album') return [];
    const ownerId = clean(share.ownerId, 128);
    const payload = share.data && typeof share.data === 'object'
      ? share.data as Record<string, unknown>
      : {};
    if (!ownerId || ownerId !== entry.ownerId || !normalizeDropAudio(payload.dropAudio)?.storagePath) {
      return [];
    }
    return [{ entry, payload, ownerId }];
  });

  const trackOwnerIds = [...new Set(shareCandidates.map((candidate) => candidate.ownerId))];
  const summarySnapshots = trackOwnerIds.length
    ? await db.getAll(...trackOwnerIds.map((userId) => db.doc(`users/${userId}/gamification/summary`)))
    : [];
  const eligibleTrackSlugs = new Map<string, string>();
  for (let index = 0; index < trackOwnerIds.length; index += 1) {
    const summary = summarySnapshots[index]?.data() || {};
    const slug = clean(summary.profileSlug, 120);
    if (summary.publicProfile === true && summary.leaderboardHidden !== true && slug) {
      eligibleTrackSlugs.set(trackOwnerIds[index], slug);
    }
  }

  const profileSlugs = [...new Set([
    ...eligibleTrackSlugs.values(),
    ...emerging.entries.map((entry) => entry.profileSlug),
  ])];
  const profileSnapshots = profileSlugs.length
    ? await db.getAll(...profileSlugs.map((slug) => db.doc(`publicProfiles/${slug}`)))
    : [];
  const profilesBySlug = new Map<string, PublicChartProfile>();
  const profilesByUser = new Map<string, PublicChartProfile>();
  for (const snapshot of profileSnapshots) {
    const profile = profileFromSnapshot(snapshot);
    if (!profile) continue;
    profilesBySlug.set(profile.slug, profile);
    profilesByUser.set(profile.userId, profile);
  }

  const tracks = shareCandidates.flatMap(({ entry, payload, ownerId }) => {
    const slug = eligibleTrackSlugs.get(ownerId);
    const profile = slug ? profilesBySlug.get(slug) : undefined;
    if (!profile || profile.userId !== ownerId) return [];
    const vibe = payload.vibe && typeof payload.vibe === 'object'
      ? payload.vibe as Record<string, unknown>
      : {};
    const genres = uniqueLabels([clean(vibe.genre, 80), ...profile.genres]);
    return [{
      shareId: entry.shareId,
      title: clean(payload.title, 120) || entry.title,
      artistId: ownerId,
      artistName: profile.displayName,
      artistSlug: profile.slug,
      score: entry.score,
      signals: entry.signals,
      reasons: trackChartReasons(entry.signals),
      genres,
      regions: profile.regions,
      ...(entry.updatedAt ? { updatedAt: entry.updatedAt } : {}),
    }];
  }).slice(0, trackLimit);

  const artists = emerging.entries.flatMap((entry) => {
    const profile = profilesByUser.get(entry.userId);
    if (!profile || profile.slug !== entry.profileSlug) return [];
    return [{ ...entry, genres: profile.genres, regions: profile.regions }];
  }).slice(0, artistLimit);

  const genres = uniqueLabels([
    ...tracks.flatMap((entry) => entry.genres),
    ...artists.flatMap((entry) => entry.genres),
  ], 80).sort((a, b) => a.localeCompare(b));
  const regions = uniqueLabels([
    ...tracks.flatMap((entry) => entry.regions),
    ...artists.flatMap((entry) => entry.regions),
  ], 80).sort((a, b) => a.localeCompare(b));

  return {
    window: { days: 7, from: days[0], through: days.at(-1) || days[0] },
    tracks,
    artists,
    filters: { genres, regions },
    formula: { tracks: TRACK_CHART_FORMULA, artists: EMERGING_FORMULA },
    integrity: {
      qualifiedAtPercent: 80,
      ownerActionsExcluded: true,
      dedupedListenerProof: true,
      liveProfileRequired: true,
      leaderboardOptInRequired: true,
      paymentAmountAffectsRank: false,
      inkAffectsRank: false,
      subscriptionTierAffectsRank: false,
      sponsoredPlacementAffectsRank: false,
      publicRegionOnly: true,
    },
  };
}
