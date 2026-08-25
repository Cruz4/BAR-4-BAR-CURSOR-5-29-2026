import 'server-only';

import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type {
  DropInsightDay,
  DropInsightsResponse,
  DropInsightTrack,
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

function shareTitle(data: Record<string, unknown>): string {
  const payload = data.data && typeof data.data === 'object'
    ? (data.data as Record<string, unknown>)
    : {};
  return typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim().slice(0, 120)
    : 'First Drop';
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

  const shareStats = new Map<
    string,
    { title: string; previewStarts: number; fullStarts: number; purchaseCount: number }
  >();
  for (const doc of sharesSnap.docs) {
    const data = doc.data();
    shareStats.set(doc.id, {
      title: shareTitle(data),
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

    const currentTrack = trackRows.get(shareId) || {
      shareId,
      title: typeof data.title === 'string' ? data.title : 'First Drop',
      lifetimePreviewStarts: shareStats.get(shareId)?.previewStarts || 0,
      lifetimeFullStarts: shareStats.get(shareId)?.fullStarts || 0,
      lifetimePurchases: shareStats.get(shareId)?.purchaseCount || 0,
      qualifiedListeners: 0,
      repeatListeners: 0,
      completions: 0,
      purchases: 0,
    };
    currentTrack.qualifiedListeners += qualified;
    currentTrack.repeatListeners += repeat;
    currentTrack.completions += completions;
    currentTrack.purchases += purchases;
    trackRows.set(shareId, currentTrack);

    if (data.sources && typeof data.sources === 'object') {
      for (const [source, value] of Object.entries(data.sources as Record<string, unknown>)) {
        sources[source] = (sources[source] || 0) + count(value);
      }
    }
  }

  for (let index = 0; index < sharesSnap.docs.length; index += 1) {
    const shareDoc = sharesSnap.docs[index];
    const stats = shareStats.get(shareDoc.id);
    if (!stats) continue;
    if (stats.previewStarts || stats.fullStarts || stats.purchaseCount) {
      const currentTrack = trackRows.get(shareDoc.id) || {
        shareId: shareDoc.id,
        title: stats.title,
        lifetimePreviewStarts: 0,
        lifetimeFullStarts: 0,
        lifetimePurchases: 0,
        qualifiedListeners: 0,
        repeatListeners: 0,
        completions: 0,
        purchases: 0,
      };
      currentTrack.title = stats.title;
      currentTrack.lifetimePreviewStarts = stats.previewStarts;
      currentTrack.lifetimeFullStarts = stats.fullStarts;
      currentTrack.lifetimePurchases = stats.purchaseCount;
      trackRows.set(shareDoc.id, currentTrack);
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
      const currentTrack = trackRows.get(shareId) || {
        shareId,
        title:
          typeof sale.title === 'string' && sale.title.trim()
            ? sale.title.trim().slice(0, 120)
            : stats?.title || 'First Drop',
        lifetimePreviewStarts: stats?.previewStarts || 0,
        lifetimeFullStarts: stats?.fullStarts || 0,
        lifetimePurchases: 0,
        qualifiedListeners: 0,
        repeatListeners: 0,
        completions: 0,
        purchases: 0,
      };
      currentTrack.purchases += 1;
      trackRows.set(shareId, currentTrack);
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

  const tracks = [...trackRows.values()]
    .sort(
      (a, b) =>
        b.lifetimePurchases * 8 +
        b.repeatListeners * 3 +
        b.qualifiedListeners +
        b.lifetimePreviewStarts +
        b.lifetimeFullStarts * 2 -
        (a.lifetimePurchases * 8 +
          a.repeatListeners * 3 +
          a.qualifiedListeners +
          a.lifetimePreviewStarts +
          a.lifetimeFullStarts * 2)
    )
    .slice(0, 12);

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
    },
  };
}
