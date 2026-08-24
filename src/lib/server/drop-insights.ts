import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
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

export async function getDropInsights(
  db: Firestore,
  ownerId: string,
  requestedDays = 30
): Promise<DropInsightsResponse> {
  const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);
  const sinceDay = since.toISOString().slice(0, 10);

  const [dailySnap, audienceSnap] = await Promise.all([
    db
      .collection('users')
      .doc(ownerId)
      .collection('dropInsightDays')
      .where('day', '>=', sinceDay)
      .orderBy('day', 'desc')
      .limit(days * 100)
      .get(),
    db
      .collection('users')
      .doc(ownerId)
      .collection('dropAudience')
      .where('lastQualifiedAt', '>=', since.toISOString())
      .limit(5000)
      .get(),
  ]);

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
    const purchases = count(data.purchases);
    totals.completions += completions;
    totals.milestone25 += count(data.milestone25);
    totals.purchases += purchases;
    totals.repeatBuyers += count(data.repeatBuyers);
    totals.grossCents += count(data.grossCents);

    const currentDay = dayRows.get(day) || {
      day,
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

  const timeline: DropInsightDay[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    timeline.push(
      dayRows.get(day) || {
        day,
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
        b.purchases * 8 + b.repeatListeners * 3 + b.qualifiedListeners -
        (a.purchases * 8 + a.repeatListeners * 3 + a.qualifiedListeners)
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
    integrity: {
      qualifiedAtPercent: 80,
      ownerActionsExcluded: true,
      paymentAmountAffectsOrganicRank: false,
    },
  };
}

