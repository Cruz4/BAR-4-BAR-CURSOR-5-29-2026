import 'server-only';

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type {
  SupportAnalyticsWindow,
  SupportDashboard,
  SupportRelationshipRow,
  SupportRelationshipState,
  SupportTopSupporter,
} from '@/lib/relationships';
import { nextSupportRelationship, type SupportRelationshipAction } from '@/lib/relationships';
import { emergingEntryPath } from '@/lib/emerging-ranking';
import { listDropSales } from '@/lib/server/drop-earnings';
import { dropListenerKeyForUser } from '@/lib/server/drop-listener-identity';

type RelationshipProfile = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  live: boolean;
};

async function relationshipProfile(db: Firestore, userId: string): Promise<RelationshipProfile> {
  const [userSnap, summarySnap] = await Promise.all([
    db.doc(`users/${userId}`).get(),
    db.doc(`users/${userId}/gamification/summary`).get(),
  ]);
  if (!userSnap.exists) throw new Error('Account not found.');
  const user = userSnap.data() || {};
  const summary = summarySnap.data() || {};
  const live = summary.publicProfile === true && typeof summary.profileSlug === 'string' && summary.profileSlug.trim().length > 0;
  return {
    userId,
    displayName:
      typeof user.displayName === 'string' && user.displayName.trim()
        ? user.displayName.trim().slice(0, 120)
        : 'Music Fan',
    ...(live ? { profileSlug: String(summary.profileSlug).trim() } : {}),
    live,
  };
}

async function relationshipBlocked(db: Firestore, actorId: string, targetId: string): Promise<boolean> {
  const [actorBlock, targetBlock] = await Promise.all([
    db.doc(`users/${actorId}/blocks/${targetId}`).get(),
    db.doc(`users/${targetId}/blocks/${actorId}`).get(),
  ]);
  return actorBlock.exists || targetBlock.exists;
}

function rowFromDoc(id: string, data: Record<string, unknown>): SupportRelationshipRow {
  return {
    userId: id,
    displayName:
      typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName.trim()
        : 'Music Fan',
    ...(typeof data.profileSlug === 'string' && data.profileSlug.trim()
      ? { profileSlug: data.profileSlug.trim() }
      : {}),
    innerCircle: data.innerCircle === true,
    createdAt: safeIso(data.createdAt),
    updatedAt: safeIso(data.updatedAt),
  };
}

function safeIso(value: unknown): string {
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : '';
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      try {
        return (toDate as () => Date)().toISOString();
      } catch {
        return '';
      }
    }
  }
  return '';
}

function count(value: unknown): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type BuyerAggregate = {
  userId: string;
  displayName: string;
  purchaseCount: number;
  periodPurchases: number;
  totalPaidCents: number;
  periodPaidCents: number;
  firstSupportedAt: string;
  lastSupportedAt: string;
  tracks: Map<string, { title: string; paidCents: number }>;
};

export async function getSupportRelationshipState(
  db: Firestore,
  viewerId: string,
  targetId: string
): Promise<SupportRelationshipState> {
  const [edge, followersCount, innerCount] = await Promise.all([
    viewerId ? db.doc(`users/${viewerId}/following/${targetId}`).get() : Promise.resolve(null),
    db.collection(`users/${targetId}/followers`).count().get(),
    db.collection(`users/${targetId}/followers`).where('innerCircle', '==', true).count().get(),
  ]);
  return {
    following: Boolean(edge?.exists),
    innerCircle: edge?.data()?.innerCircle === true,
    followerCount: followersCount.data().count,
    innerCircleCount: innerCount.data().count,
  };
}

export async function setSupportRelationship(
  db: Firestore,
  input: {
    actorId: string;
    targetId: string;
    action: SupportRelationshipAction;
  }
): Promise<{
  state: SupportRelationshipState;
  actor: RelationshipProfile;
  target: RelationshipProfile;
  newlyFollowed: boolean;
  newlyInnerCircle: boolean;
}> {
  if (!input.actorId || !input.targetId || input.actorId === input.targetId) {
    throw new Error('Choose another profile.');
  }
  const [actor, target, blocked] = await Promise.all([
    relationshipProfile(db, input.actorId),
    relationshipProfile(db, input.targetId),
    relationshipBlocked(db, input.actorId, input.targetId),
  ]);
  if (!target.live) throw new Error('That profile is offline.');
  if (blocked) throw new Error('This relationship is unavailable.');

  const followingRef = db.doc(`users/${input.actorId}/following/${input.targetId}`);
  const followerRef = db.doc(`users/${input.targetId}/followers/${input.actorId}`);
  const followSignalRef = db.doc(
    `users/${input.targetId}/organicRelationshipTicks/${input.actorId}_follow`
  );
  const innerSignalRef = db.doc(
    `users/${input.targetId}/organicRelationshipTicks/${input.actorId}_inner`
  );
  let newlyFollowed = false;
  let newlyInnerCircle = false;
  await db.runTransaction(async (tx) => {
    const [existing, followSignal, innerSignal] = await Promise.all([
      tx.get(followingRef),
      tx.get(followSignalRef),
      tx.get(innerSignalRef),
    ]);
    const previous = existing.data() || {};
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const next = nextSupportRelationship(
      existing.exists ? previous.innerCircle === true : null,
      input.action
    );
    if (!next.exists) {
      tx.delete(followingRef);
      tx.delete(followerRef);
      return;
    }
    const innerCircle = next.innerCircle;
    newlyFollowed = !existing.exists;
    newlyInnerCircle = innerCircle && previous.innerCircle !== true;
    const createdAt = typeof previous.createdAt === 'string' ? previous.createdAt : now;
    tx.set(followingRef, {
      targetUserId: target.userId,
      displayName: target.displayName,
      ...(target.profileSlug ? { profileSlug: target.profileSlug } : {}),
      innerCircle,
      createdAt,
      updatedAt: now,
    });
    tx.set(followerRef, {
      followerUserId: actor.userId,
      displayName: actor.displayName,
      ...(actor.profileSlug ? { profileSlug: actor.profileSlug } : {}),
      innerCircle,
      createdAt,
      updatedAt: now,
    });
    const emergingPatch: Record<string, unknown> = {
      userId: target.userId,
      updatedAt: now,
    };
    if (newlyFollowed && !followSignal.exists) {
      tx.set(followSignalRef, { actorId: actor.userId, kind: 'follow', createdAt: now });
      emergingPatch.follows = FieldValue.increment(1);
    }
    if (newlyInnerCircle && !innerSignal.exists) {
      tx.set(innerSignalRef, { actorId: actor.userId, kind: 'inner_circle', createdAt: now });
      emergingPatch.innerCircleJoins = FieldValue.increment(1);
    }
    if ('follows' in emergingPatch || 'innerCircleJoins' in emergingPatch) {
      tx.set(db.doc(emergingEntryPath(target.userId, nowDate)), emergingPatch, { merge: true });
    }
  });

  return {
    state: await getSupportRelationshipState(db, input.actorId, input.targetId),
    actor,
    target,
    newlyFollowed,
    newlyInnerCircle,
  };
}

export async function getSupportDashboard(
  db: Firestore,
  userId: string,
  windowDays: SupportAnalyticsWindow = 30
): Promise<SupportDashboard> {
  const now = new Date();
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (windowDays - 1));
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [followersSnap, followingSnap, allSales] = await Promise.all([
    db.collection(`users/${userId}/followers`).limit(500).get(),
    db.collection(`users/${userId}/following`).limit(500).get(),
    listDropSales(db, userId, 5000),
  ]);
  const baseFollowers = followersSnap.docs
    .map((doc) => rowFromDoc(doc.id, doc.data()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const following = followingSnap.docs
    .map((doc) => rowFromDoc(doc.id, doc.data()))
    .sort((a, b) => Number(b.innerCircle) - Number(a.innerCircle) || b.updatedAt.localeCompare(a.updatedAt));

  const followingIds = new Set(following.map((row) => row.userId));
  const successfulSales = allSales.filter(
    (sale) => sale.status !== 'failed' && sale.amountCents > 0 && sale.buyerId !== userId
  );
  const buyerAggregates = new Map<string, BuyerAggregate>();
  for (const sale of successfulSales) {
    if (!sale.buyerId) continue;
    const createdAt = safeIso(sale.createdAt);
    const existing = buyerAggregates.get(sale.buyerId) || {
      userId: sale.buyerId,
      displayName: sale.buyerName || 'Music Fan',
      purchaseCount: 0,
      periodPurchases: 0,
      totalPaidCents: 0,
      periodPaidCents: 0,
      firstSupportedAt: createdAt,
      lastSupportedAt: createdAt,
      tracks: new Map<string, { title: string; paidCents: number }>(),
    };
    existing.purchaseCount += 1;
    existing.totalPaidCents += sale.amountCents;
    if (createdAt && createdAt >= sinceIso) {
      existing.periodPurchases += 1;
      existing.periodPaidCents += sale.amountCents;
    }
    if (createdAt && (!existing.firstSupportedAt || createdAt < existing.firstSupportedAt)) {
      existing.firstSupportedAt = createdAt;
    }
    if (createdAt && (!existing.lastSupportedAt || createdAt > existing.lastSupportedAt)) {
      existing.lastSupportedAt = createdAt;
    }
    const trackKey = sale.shareId || sale.title;
    const track = existing.tracks.get(trackKey) || { title: sale.title, paidCents: 0 };
    track.paidCents += sale.amountCents;
    existing.tracks.set(trackKey, track);
    buyerAggregates.set(sale.buyerId, existing);
  }

  const rankedBuyers = [...buyerAggregates.values()]
    .sort(
      (a, b) =>
        b.periodPaidCents - a.periodPaidCents ||
        b.totalPaidCents - a.totalPaidCents ||
        b.purchaseCount - a.purchaseCount
    )
    .slice(0, 10);
  const audienceUserIds = [
    ...new Set([
      ...baseFollowers.map((row) => row.userId),
      ...rankedBuyers.map((buyer) => buyer.userId),
    ]),
  ];
  const audienceRefs = audienceUserIds.map((audienceUserId) =>
    db.doc(`users/${userId}/dropAudience/${dropListenerKeyForUser(audienceUserId)}`)
  );
  const audienceSnaps = audienceRefs.length ? await db.getAll(...audienceRefs) : [];
  const audienceByUser = new Map(
    audienceUserIds.map((audienceUserId, index) => [
      audienceUserId,
      (audienceSnaps[index]?.data() || {}) as Record<string, unknown>,
    ])
  );

  const followers = baseFollowers.map((row) => {
    const audience = audienceByUser.get(row.userId) || {};
    const buyer = buyerAggregates.get(row.userId);
    return {
      ...row,
      mutual: followingIds.has(row.userId),
      engagement: {
        qualifiedListeningDays: count(audience.qualifiedDayCount),
        purchaseCount: buyer?.purchaseCount || count(audience.purchaseCount),
        totalPaidCents: buyer?.totalPaidCents || 0,
        periodPaidCents: buyer?.periodPaidCents || 0,
        ...(safeIso(audience.firstQualifiedAt)
          ? { firstQualifiedAt: safeIso(audience.firstQualifiedAt) }
          : {}),
        ...(safeIso(audience.lastQualifiedAt)
          ? { lastQualifiedAt: safeIso(audience.lastQualifiedAt) }
          : {}),
        ...(buyer?.firstSupportedAt || safeIso(audience.firstPurchaseAt)
          ? { firstPurchaseAt: buyer?.firstSupportedAt || safeIso(audience.firstPurchaseAt) }
          : {}),
        ...(buyer?.lastSupportedAt || safeIso(audience.lastPurchaseAt)
          ? { lastPurchaseAt: buyer?.lastSupportedAt || safeIso(audience.lastPurchaseAt) }
          : {}),
        ...(typeof audience.lastSource === 'string' && audience.lastSource.trim()
          ? { lastSource: audience.lastSource.trim() }
          : {}),
      },
    } satisfies SupportRelationshipRow;
  });

  const followerById = new Map(followers.map((row) => [row.userId, row]));
  const rankedProfiles = await Promise.all(
    rankedBuyers.map((buyer) =>
      relationshipProfile(db, buyer.userId).catch(() => null)
    )
  );
  const topSupporters: SupportTopSupporter[] = rankedBuyers.map((buyer, index) => {
    const follower = followerById.get(buyer.userId);
    const profile = rankedProfiles[index];
    const audience = audienceByUser.get(buyer.userId) || {};
    const topTrack = [...buyer.tracks.values()].sort((a, b) => b.paidCents - a.paidCents)[0];
    return {
      userId: buyer.userId,
      displayName: profile?.displayName || follower?.displayName || buyer.displayName,
      ...(profile?.profileSlug || follower?.profileSlug
        ? { profileSlug: profile?.profileSlug || follower?.profileSlug }
        : {}),
      innerCircle: follower?.innerCircle === true,
      followsYou: Boolean(follower),
      mutual: follower?.mutual === true,
      qualifiedListeningDays: count(audience.qualifiedDayCount),
      purchaseCount: buyer.purchaseCount,
      periodPurchases: buyer.periodPurchases,
      totalPaidCents: buyer.totalPaidCents,
      periodPaidCents: buyer.periodPaidCents,
      firstSupportedAt: buyer.firstSupportedAt,
      lastSupportedAt: buyer.lastSupportedAt,
      ...(safeIso(audience.firstQualifiedAt)
        ? { firstQualifiedAt: safeIso(audience.firstQualifiedAt) }
        : {}),
      ...(safeIso(audience.lastQualifiedAt)
        ? { lastQualifiedAt: safeIso(audience.lastQualifiedAt) }
        : {}),
      firstPurchaseAt: buyer.firstSupportedAt,
      lastPurchaseAt: buyer.lastSupportedAt,
      ...(typeof audience.lastSource === 'string' && audience.lastSource.trim()
        ? { lastSource: audience.lastSource.trim() }
        : {}),
      ...(topTrack?.title ? { topTrackTitle: topTrack.title } : {}),
    };
  });

  const growthByDay = new Map<string, { newFollowers: number; newInnerCircle: number }>();
  for (let offset = 0; offset < windowDays; offset += 1) {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + offset);
    growthByDay.set(dayKey(date), { newFollowers: 0, newInnerCircle: 0 });
  }
  for (const row of followers) {
    if (row.createdAt >= sinceIso) {
      const day = row.createdAt.slice(0, 10);
      const value = growthByDay.get(day);
      if (value) value.newFollowers += 1;
    }
    if (row.innerCircle && row.updatedAt >= sinceIso) {
      const day = row.updatedAt.slice(0, 10);
      const value = growthByDay.get(day);
      if (value) value.newInnerCircle += 1;
    }
  }

  const activeFollowers = followers.filter(
    (row) => Boolean(row.engagement?.lastQualifiedAt && row.engagement.lastQualifiedAt >= sinceIso)
  );
  const repeatFollowers = followers.filter(
    (row) => (row.engagement?.qualifiedListeningDays || 0) >= 2
  );
  const followerBuyers = followers.filter((row) => (row.engagement?.purchaseCount || 0) > 0);
  const periodFollowerBuyers = followers.filter((row) => (row.engagement?.periodPaidCents || 0) > 0);
  const repeatFollowerBuyers = followers.filter((row) => (row.engagement?.purchaseCount || 0) >= 2);
  const periodSales = successfulSales.filter((sale) => safeIso(sale.createdAt) >= sinceIso);
  const periodGrossCents = periodSales.reduce((sum, sale) => sum + sale.amountCents, 0);
  const lifetimeGrossCents = successfulSales.reduce((sum, sale) => sum + sale.amountCents, 0);
  const followerPeriodGrossCents = periodFollowerBuyers.reduce(
    (sum, row) => sum + (row.engagement?.periodPaidCents || 0),
    0
  );
  const followerLifetimeGrossCents = followerBuyers.reduce(
    (sum, row) => sum + (row.engagement?.totalPaidCents || 0),
    0
  );
  const sourceCounts = new Map<string, number>();
  for (const row of activeFollowers) {
    const source = row.engagement?.lastSource || 'direct';
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  }

  return {
    windowDays,
    followers,
    following,
    totals: {
      followers: followers.length,
      innerCircleSupporters: followers.filter((row) => row.innerCircle).length,
      following: following.length,
      inMyInnerCircle: following.filter((row) => row.innerCircle).length,
    },
    analytics: {
      newFollowers: followers.filter((row) => row.createdAt >= sinceIso).length,
      newInnerCircle: followers.filter((row) => row.innerCircle && row.updatedAt >= sinceIso).length,
      activeFollowerListeners: activeFollowers.length,
      repeatFollowerListeners: repeatFollowers.length,
      lifetimeFollowerBuyers: followerBuyers.length,
      periodFollowerBuyers: periodFollowerBuyers.length,
      repeatFollowerBuyers: repeatFollowerBuyers.length,
      mutualSupporters: followers.filter((row) => row.mutual).length,
      publicProfileSupporters: followers.filter((row) => Boolean(row.profileSlug)).length,
      periodPurchases: periodSales.length,
      periodGrossCents,
      followerPeriodGrossCents,
      lifetimePurchases: successfulSales.length,
      lifetimeGrossCents,
      followerLifetimeGrossCents,
      rates: {
        innerCirclePercent: percent(
          followers.filter((row) => row.innerCircle).length,
          followers.length
        ),
        mutualPercent: percent(followers.filter((row) => row.mutual).length, followers.length),
        activeListenerPercent: percent(activeFollowers.length, followers.length),
        supporterBuyerPercent: percent(periodFollowerBuyers.length, followers.length),
        repeatBuyerPercent: percent(repeatFollowerBuyers.length, followerBuyers.length),
        publicProfilePercent: percent(
          followers.filter((row) => Boolean(row.profileSlug)).length,
          followers.length
        ),
        supporterRevenuePercent: percent(followerPeriodGrossCents, periodGrossCents),
      },
      growth: [...growthByDay.entries()].map(([day, values]) => ({ day, ...values })),
      sources: [...sourceCounts.entries()]
        .map(([source, supporters]) => ({ source, supporters }))
        .sort((a, b) => b.supporters - a.supporters),
      topSupporters,
    },
  };
}
