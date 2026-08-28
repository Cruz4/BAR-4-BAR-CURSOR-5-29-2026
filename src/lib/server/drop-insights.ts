import 'server-only';

import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type {
  DropInsightDay,
  DropInsightsResponse,
  DropInsightTrack,
} from '@/lib/drop-insights';
import {
  linkDropInsightAlbumNesting,
  partitionDropInsightReleases,
  type DropInsightAlbumNestInput,
} from '@/lib/drop-insights';

function count(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}
function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 1000) / 10);
}

function isoDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function shareTitle(data: Record<string, unknown>, fallback = 'Release'): string {
  const payload = data.data && typeof data.data === 'object'
    ? (data.data as Record<string, unknown>)
    : {};
  return typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim().slice(0, 120)
    : fallback;
}

function shareNestInput(
  shareId: string,
  data: Record<string, unknown>
): DropInsightAlbumNestInput {
  const type = data.type === 'album' ? 'album' : 'track';
  const title = shareTitle(data, type === 'album' ? 'Untitled album' : 'Untitled track');
  const payload = data.data && typeof data.data === 'object'
    ? (data.data as Record<string, unknown>)
    : {};
  const nestedTracks =
    type === 'album' && Array.isArray(payload.tracks)
      ? payload.tracks.flatMap((raw, trackIndex) => {
          if (!raw || typeof raw !== 'object') return [];
          const track = raw as Record<string, unknown>;
          const nestedShareId =
            typeof track.shareId === 'string' ? track.shareId.trim() : '';
          if (!nestedShareId) return [];
          const nestedTitle =
            typeof track.title === 'string' && track.title.trim()
              ? track.title.trim().slice(0, 120)
              : undefined;
          return [{ shareId: nestedShareId, title: nestedTitle, trackIndex }];
        })
      : undefined;
  return {
    shareId,
    type,
    title,
    ...(nestedTracks?.length ? { nestedTracks } : {}),
  };
}

function emptyTrack(
  shareId: string,
  title: string,
  meta?: {
    kind: DropInsightTrack['kind'];
    title: string;
    albumTitle?: string;
    albumShareId?: string;
    trackIndex?: number;
    trackCount?: number;
  }
): DropInsightTrack {
  return {
    shareId,
    title: meta?.title || title,
    kind: meta?.kind || 'song',
    ...(meta?.albumTitle ? { albumTitle: meta.albumTitle } : {}),
    ...(meta?.albumShareId ? { albumShareId: meta.albumShareId } : {}),
    ...(typeof meta?.trackIndex === 'number' ? { trackIndex: meta.trackIndex } : {}),
    ...(typeof meta?.trackCount === 'number' ? { trackCount: meta.trackCount } : {}),
    lifetimePreviewStarts: 0,
    lifetimeFullStarts: 0,
    lifetimePurchases: 0,
    qualifiedListeners: 0,
    repeatListeners: 0,
    completions: 0,
    purchases: 0,
  };
}

async function loadInsightDays(db: Firestore, ownerId: string, sinceDay: string, limit: number) {
  const ref = db.collection('users').doc(ownerId).collection('dropInsightDays');
  try {
    return await ref.where('day', '>=', sinceDay).orderBy('day', 'desc').limit(limit).get();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/FAILED_PRECONDITION|requires an index/i.test(message)) throw error;
    // Keep insights available while a newly deployed Firestore index is building.
    console.warn('[drop-insights] day index is not ready; using bounded compatibility read');
    const fallback = await ref.orderBy(FieldPath.documentId(), 'desc').limit(limit).get();
    const docs = fallback.docs
      .filter((doc) => String(doc.data().day || '') >= sinceDay)
      .sort((a, b) => String(b.data().day || '').localeCompare(String(a.data().day || '')));
    return { ...fallback, docs };
  }
}

export async function getDropInsights(
  db: Firestore,
  ownerId: string,
  requestedDays = 30
): Promise<DropInsightsResponse> {
  const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const sinceDay = since.toISOString().slice(0, 10);

  const [dailySnap, audienceSnap, sharesSnap, salesSnap] = await Promise.all([
    loadInsightDays(db, ownerId, sinceDay, days * 100),
    db
      .collection('users')
      .doc(ownerId)
      .collection('dropAudience')
      .where('lastQualifiedAt', '>=', sinceIso)
      .limit(5000)
      .get(),
    db.collection('shares').where('ownerId', '==', ownerId).get(),
    db
      .collection('users')
      .doc(ownerId)
      .collection('dropEarnings')
      .orderBy('createdAt', 'desc')
      .limit(5000)
      .get(),
  ]);

  const nestInputs = sharesSnap.docs.map((doc) => shareNestInput(doc.id, doc.data()));
  const releaseMeta = linkDropInsightAlbumNesting(nestInputs);

  const shareStats = new Map<
    string,
    { title: string; previewStarts: number; fullStarts: number; purchaseCount: number }
  >();
  for (const doc of sharesSnap.docs) {
    const data = doc.data();
    const meta = releaseMeta.get(doc.id);
    shareStats.set(doc.id, {
      title: meta?.title || shareTitle(data),
      previewStarts: count(data.previewCount),
      fullStarts: count(data.playCount),
      purchaseCount: count(data.purchaseCount),
    });
  }

  const tickSnaps = await Promise.all(
    sharesSnap.docs.map((doc) => doc.ref.collection('spinTicks').limit(1000).get())
  );

  const totals = {
    qualifiedListeners: audienceSnap.size,
    repeatListeners: audienceSnap.docs.filter((doc) => count(doc.data().qualifiedDayCount) >= 2).length,
    completions: 0,
    milestone25: 0,
    purchases: 0,
    repeatBuyers: 0,
    grossCents: 0,
  };
  const sources: Record<string, number> = {};
  const dayRows = new Map<string, DropInsightDay>();
  const trackRows = new Map<string, DropInsightTrack>();

  const ensureTrack = (shareId: string, fallbackTitle: string): DropInsightTrack => {
    const existing = trackRows.get(shareId);
    if (existing) return existing;
    const meta = releaseMeta.get(shareId);
    const stats = shareStats.get(shareId);
    const created = emptyTrack(shareId, fallbackTitle, meta);
    created.lifetimePreviewStarts = stats?.previewStarts || 0;
    created.lifetimeFullStarts = stats?.fullStarts || 0;
    created.lifetimePurchases = stats?.purchaseCount || 0;
    if (stats?.title) created.title = meta?.title || stats.title;
    trackRows.set(shareId, created);
    return created;
  };

  for (const doc of dailySnap.docs) {
    const data = doc.data();
    const day = typeof data.day === 'string' ? data.day : '';
    const shareId = typeof data.shareId === 'string' ? data.shareId : '';
    if (!day || !shareId) continue;
    const qualified = count(data.qualifiedListeners);
    const repeat = count(data.repeatListeners);
    const completions = count(data.completions);
    const purchases = salesSnap.empty ? count(data.purchases) : 0;
    totals.completions += completions;
    totals.milestone25 += count(data.milestone25);
    totals.purchases += purchases;
    if (salesSnap.empty) {
      totals.repeatBuyers += count(data.repeatBuyers);
      totals.grossCents += count(data.grossCents);
    }

    const currentDay = dayRows.get(day) || {
      day,
      recordedStarts: 0,
      qualifiedListeners: 0,
      repeatListeners: 0,
      completions: 0,
      purchases: 0,
    };
    currentDay.qualifiedListeners += qualified;
    currentDay.repeatListeners += repeat;
    currentDay.completions += completions;
    currentDay.purchases += purchases;
    dayRows.set(day, currentDay);

    const title =
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim().slice(0, 120)
        : shareStats.get(shareId)?.title || 'Release';
    const currentTrack = ensureTrack(shareId, title);
    currentTrack.qualifiedListeners += qualified;
    currentTrack.repeatListeners += repeat;
    currentTrack.completions += completions;
    currentTrack.purchases += purchases;
  }

  for (let index = 0; index < sharesSnap.docs.length; index += 1) {
    const shareDoc = sharesSnap.docs[index];
    const stats = shareStats.get(shareDoc.id);
    if (!stats) continue;
    if (stats.previewStarts || stats.fullStarts || stats.purchaseCount) {
      const currentTrack = ensureTrack(shareDoc.id, stats.title);
      const meta = releaseMeta.get(shareDoc.id);
      currentTrack.title = meta?.title || stats.title;
      currentTrack.kind = meta?.kind || currentTrack.kind;
      if (meta?.albumTitle) currentTrack.albumTitle = meta.albumTitle;
      if (meta?.albumShareId) currentTrack.albumShareId = meta.albumShareId;
      if (typeof meta?.trackIndex === 'number') currentTrack.trackIndex = meta.trackIndex;
      if (typeof meta?.trackCount === 'number') currentTrack.trackCount = meta.trackCount;
      currentTrack.lifetimePreviewStarts = stats.previewStarts;
      currentTrack.lifetimeFullStarts = stats.fullStarts;
      currentTrack.lifetimePurchases = stats.purchaseCount;
    }

    for (const tick of tickSnaps[index].docs) {
      const at = isoDate(tick.data().at);
      if (!at || at < sinceIso) continue;
      const day = at.slice(0, 10);
      const currentDay = dayRows.get(day) || {
        day,
        recordedStarts: 0,
        qualifiedListeners: 0,
        repeatListeners: 0,
        completions: 0,
        purchases: 0,
      };
      currentDay.recordedStarts += 1;
      dayRows.set(day, currentDay);
    }
  }

  const periodBuyerCounts = new Map<string, number>();
  const lifetimeSaleCounts = new Map<string, number>();
  let lifetimeSalePurchases = 0;
  let lifetimeGrossCents = 0;
  for (const saleDoc of salesSnap.docs) {
    const sale = saleDoc.data();
    if (sale.status === 'failed') continue;
    const shareId = typeof sale.shareId === 'string' ? sale.shareId : '';
    const createdAt = isoDate(sale.createdAt);
    const amountCents = count(sale.amountCents);
    const buyerId = typeof sale.buyerId === 'string' ? sale.buyerId : '';
    lifetimeSalePurchases += 1;
    lifetimeGrossCents += amountCents;
    if (shareId) lifetimeSaleCounts.set(shareId, (lifetimeSaleCounts.get(shareId) || 0) + 1);
    if (!createdAt || createdAt < sinceIso) continue;
    if (buyerId) periodBuyerCounts.set(buyerId, (periodBuyerCounts.get(buyerId) || 0) + 1);

    totals.purchases += 1;
    totals.grossCents += amountCents;
    const day = createdAt.slice(0, 10);
    const currentDay = dayRows.get(day) || {
      day,
      recordedStarts: 0,
      qualifiedListeners: 0,
      repeatListeners: 0,
      completions: 0,
      purchases: 0,
    };
    currentDay.purchases += 1;
    dayRows.set(day, currentDay);

    if (shareId) {
      const stats = shareStats.get(shareId);
      const saleTitle =
        typeof sale.title === 'string' && sale.title.trim()
          ? sale.title.trim().slice(0, 120)
          : stats?.title || 'Release';
      const currentTrack = ensureTrack(shareId, saleTitle);
      currentTrack.purchases += 1;
    }
  }

  if (!salesSnap.empty) {
    totals.repeatBuyers = [...periodBuyerCounts.values()].filter((value) => value >= 2).length;
  }
  for (const [shareId, saleCount] of lifetimeSaleCounts) {
    const currentTrack = trackRows.get(shareId);
    if (currentTrack) {
      currentTrack.lifetimePurchases = Math.max(currentTrack.lifetimePurchases, saleCount);
    }
  }

  // Re-apply album nesting onto any rows that appeared only from daily/sales data.
  for (const [shareId, row] of trackRows) {
    const meta = releaseMeta.get(shareId);
    if (!meta) continue;
    row.kind = meta.kind;
    row.title = meta.title || row.title;
    if (meta.albumTitle) row.albumTitle = meta.albumTitle;
    else delete row.albumTitle;
    if (meta.albumShareId) row.albumShareId = meta.albumShareId;
    else delete row.albumShareId;
    if (typeof meta.trackIndex === 'number') row.trackIndex = meta.trackIndex;
    else delete row.trackIndex;
    if (typeof meta.trackCount === 'number') row.trackCount = meta.trackCount;
    else delete row.trackCount;
  }

  const timeline: DropInsightDay[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    timeline.push(
      dayRows.get(day) || {
        day,
        recordedStarts: 0,
        qualifiedListeners: 0,
        repeatListeners: 0,
        completions: 0,
        purchases: 0,
      }
    );
  }

  const { tracks, albums } = partitionDropInsightReleases([...trackRows.values()], {
    songs: 12,
    albums: 8,
  });

  return {
    days,
    totals,
    rates: {
      qualifiedPercent: percent(totals.qualifiedListeners, totals.milestone25),
      completionPercent: percent(totals.completions, totals.milestone25),
      listenerToBuyerPercent: percent(totals.purchases, totals.qualifiedListeners),
    },
    sources,
    timeline,
    tracks,
    albums,
    lifetime: {
      trackedDrops: sharesSnap.size,
      previewStarts: [...shareStats.values()].reduce((sum, row) => sum + row.previewStarts, 0),
      fullStarts: [...shareStats.values()].reduce((sum, row) => sum + row.fullStarts, 0),
      purchases: Math.max(
        lifetimeSalePurchases,
        [...shareStats.values()].reduce((sum, row) => sum + row.purchaseCount, 0)
      ),
      grossCents: lifetimeGrossCents,
    },
    integrity: {
      qualifiedAtPercent: 80,
      ownerActionsExcluded: true,
      paymentAmountAffectsOrganicRank: false,
      historicalStartsAreQualified: false,
      albumAndSongCountsAreSeparate: true,
    },
  };
}
