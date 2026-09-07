import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { profileHref } from '@/lib/profile/profile-slug';
import { pushCopyForActivity } from '@/lib/activity/types';
import {
  DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY,
  DOOR_KNOCK_MAX_KNOCKS_PER_DOOR_DAY,
  DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR,
  DOOR_KNOCK_MAX_VISITORS_PER_DOOR_DAY,
  DOOR_PRESENCE_TTL_MS,
  doorKnockBlockMessage,
  doorKnockDayKey,
  type DoorKnockBlockReason,
  type DoorKnockQuota,
} from '@/lib/door-knock';

function chronoId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}_${r}`;
}

async function resolveProfileSlug(userId: string, known?: string): Promise<string | undefined> {
  if (known?.trim()) return known.trim();
  if (!userId) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(`users/${userId}/gamification/summary`).get();
    const slug = snap.data()?.profileSlug;
    return typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function isBlocked(a: string, b: string): Promise<boolean> {
  const db = await getDb();
  const [ab, ba] = await Promise.all([
    db.doc(`users/${a}/blocks/${b}`).get(),
    db.doc(`users/${b}/blocks/${a}`).get(),
  ]);
  return ab.exists || ba.exists;
}

export async function writeDoorPresence(userId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.doc(`users/${userId}/doorPresence/at`).set({ at: now }, { merge: true });
}

async function isAtArtistHome(userId: string): Promise<boolean> {
  const db = await getDb();
  const snap = await db.doc(`users/${userId}/doorPresence/at`).get();
  const at = snap.data()?.at;
  if (typeof at !== 'string') return false;
  const age = Date.now() - Date.parse(at);
  return Number.isFinite(age) && age >= 0 && age <= DOOR_PRESENCE_TTL_MS;
}

function visitorMap(data: unknown): Record<string, number> {
  if (!data || typeof data !== 'object') return {};
  const visitors = (data as { visitors?: unknown }).visitors;
  if (!visitors || typeof visitors !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [id, count] of Object.entries(visitors)) {
    const n = Math.max(0, Number(count) || 0);
    if (n > 0) out[id] = n;
  }
  return out;
}

function knockerTargets(data: unknown): Record<string, number> {
  if (!data || typeof data !== 'object') return {};
  const targets = (data as { targets?: unknown }).targets;
  if (!targets || typeof targets !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [id, count] of Object.entries(targets)) {
    const n = Math.max(0, Number(count) || 0);
    if (n > 0) out[id] = n;
  }
  return out;
}

function buildQuota(
  targetUserId: string,
  knockerId: string,
  knockerTargetsMap: Record<string, number>,
  doorVisitors: Record<string, number>
): DoorKnockQuota {
  const yourKnocksHere = Math.max(0, Number(knockerTargetsMap[targetUserId]) || 0);
  const yourDoorsToday = Object.keys(knockerTargetsMap).length;
  const visitorsAtDoor = Object.keys(doorVisitors).length;
  const knocksAtDoor = Object.values(doorVisitors).reduce((sum, n) => sum + n, 0);
  const isNewVisitorAtDoor = yourKnocksHere === 0;

  let blockReason: DoorKnockBlockReason | undefined;
  if (yourKnocksHere >= DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR) {
    blockReason = 'your_knocks_here';
  } else if (isNewVisitorAtDoor && yourDoorsToday >= DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY) {
    blockReason = 'your_doors_today';
  } else if (knocksAtDoor >= DOOR_KNOCK_MAX_KNOCKS_PER_DOOR_DAY) {
    blockReason = 'door_knocks_full';
  } else if (isNewVisitorAtDoor && visitorsAtDoor >= DOOR_KNOCK_MAX_VISITORS_PER_DOOR_DAY) {
    blockReason = 'door_visitors_full';
  }

  const canKnock = !blockReason;

  return {
    targetUserId,
    yourKnocksHere,
    yourKnocksLeftHere: Math.max(0, DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR - yourKnocksHere),
    yourDoorsToday,
    yourDoorsLeftToday: Math.max(0, DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY - yourDoorsToday),
    visitorsAtDoor,
    visitorsLeftAtDoor: Math.max(0, DOOR_KNOCK_MAX_VISITORS_PER_DOOR_DAY - visitorsAtDoor),
    knocksAtDoor,
    knocksLeftAtDoor: Math.max(0, DOOR_KNOCK_MAX_KNOCKS_PER_DOOR_DAY - knocksAtDoor),
    canKnock,
    blockReason,
  };
}

export async function getDoorKnockQuota(
  knockerId: string,
  targetUserId: string
): Promise<DoorKnockQuota> {
  const db = await getDb();
  const day = doorKnockDayKey();
  const [knockerSnap, inboxSnap] = await Promise.all([
    db.doc(`users/${knockerId}/doorKnockQuota/${day}`).get(),
    db.doc(`users/${targetUserId}/doorKnockInbox/${day}`).get(),
  ]);
  return buildQuota(
    targetUserId,
    knockerId,
    knockerTargets(knockerSnap.data()),
    visitorMap(inboxSnap.data())
  );
}

export type DoorKnockResult = {
  ok: boolean;
  error?: string;
  quota?: DoorKnockQuota;
  live?: boolean;
  knockId?: string;
};

export async function knockArtistHomeDoor(input: {
  knockerId: string;
  knockerName: string;
  knockerSlug?: string;
  targetUserId: string;
  targetName: string;
  targetSlug?: string;
}): Promise<DoorKnockResult> {
  const knockerId = input.knockerId.trim();
  const targetUserId = input.targetUserId.trim();
  if (!knockerId || !targetUserId) return { ok: false, error: 'Invalid knock.' };
  if (knockerId === targetUserId) return { ok: false, error: 'You cannot knock on your own door.' };
  if (await isBlocked(knockerId, targetUserId)) {
    return { ok: false, error: 'Knock unavailable for this artist.' };
  }

  const db = await getDb();
  const day = doorKnockDayKey();
  const quotaRef = db.doc(`users/${knockerId}/doorKnockQuota/${day}`);
  const inboxRef = db.doc(`users/${targetUserId}/doorKnockInbox/${day}`);

  const quotaResult = await db.runTransaction(async (tx) => {
    const [knockerSnap, inboxSnap] = await Promise.all([tx.get(quotaRef), tx.get(inboxRef)]);
    const targets = knockerTargets(knockerSnap.data());
    const visitors = visitorMap(inboxSnap.data());
    const before = buildQuota(targetUserId, knockerId, targets, visitors);
    if (!before.canKnock) return { quota: before, allowed: false as const };

    targets[targetUserId] = (targets[targetUserId] || 0) + 1;
    visitors[knockerId] = (visitors[knockerId] || 0) + 1;
    const now = new Date().toISOString();
    tx.set(quotaRef, { targets, updatedAt: now }, { merge: true });
    tx.set(inboxRef, { visitors, updatedAt: now }, { merge: true });
    return {
      quota: buildQuota(targetUserId, knockerId, targets, visitors),
      allowed: true as const,
    };
  });

  const quota = quotaResult.quota;
  if (!quotaResult.allowed) {
    return {
      ok: false,
      error: doorKnockBlockMessage(quota.blockReason),
      quota,
    };
  }

  const [knockerSlug, targetSlug] = await Promise.all([
    resolveProfileSlug(knockerId, input.knockerSlug),
    resolveProfileSlug(targetUserId, input.targetSlug),
  ]);
  const recipientHome = targetSlug ? profileHref(targetSlug) || '/' : '/';
  const now = new Date().toISOString();
  const atHome = await isAtArtistHome(targetUserId);
  const knockId = chronoId();
  const receivedId = chronoId();
  const givenId = chronoId();
  const preview = atHome
    ? 'They are home — say hello?'
    : 'Collect this knock when you visit your Artist Home.';

  const base = {
    type: 'door_knock' as const,
    createdAt: now,
    actorId: knockerId,
    actorName: input.knockerName || 'Artist',
    ...(knockerSlug ? { actorSlug: knockerSlug } : {}),
    preview,
    href: recipientHome,
    homeDeliveredAt: atHome ? now : null,
  };

  const batch = db.batch();
  batch.set(db.doc(`users/${targetUserId}/activity/${receivedId}`), {
    ...base,
    id: receivedId,
    direction: 'received',
    readAt: null,
  });
  batch.set(db.doc(`users/${input.knockerId}/activity/${givenId}`), {
    ...base,
    id: givenId,
    direction: 'given',
    targetUserId,
    targetName: input.targetName || 'Artist',
    ...(targetSlug ? { targetSlug } : {}),
    readAt: now,
    homeDeliveredAt: now,
  });
  batch.set(db.doc(`users/${targetUserId}/doorKnocks/${knockId}`), {
    knockId,
    knockerId,
    knockerName: input.knockerName || 'Artist',
    ...(knockerSlug ? { knockerSlug } : {}),
    activityId: receivedId,
    live: atHome,
    createdAt: now,
  });

  if (atHome) {
    batch.set(
      db.doc(`users/${targetUserId}/activityMeta/summary`),
      { unreadReceived: FieldValue.increment(1), updatedAt: now },
      { merge: true }
    );
    batch.set(db.doc(`users/${targetUserId}/doorKnockLive/${knockId}`), {
      knockId,
      knockerId,
      knockerName: input.knockerName || 'Artist',
      ...(knockerSlug ? { knockerSlug } : {}),
      activityId: receivedId,
      createdAt: now,
    });
  }

  await batch.commit();

  if (atHome) {
    const { title, body } = pushCopyForActivity('door_knock', input.knockerName || 'Artist', preview);
    const { maybePush } = await import('@/lib/server/activity');
    void maybePush(targetUserId, 'door_knock', title, body, recipientHome);
  }

  return { ok: true, quota, live: atHome, knockId };
}

export type DeliveredDoorKnocks = {
  delivered: number;
  knockerNames: string[];
};

export async function deliverPendingDoorKnocks(userId: string): Promise<DeliveredDoorKnocks> {
  const db = await getDb();
  const collection = db.collection(`users/${userId}/activity`);
  const snap = await collection.where('type', '==', 'door_knock').limit(60).get();

  const pending = snap.docs.filter((doc) => {
    const data = doc.data();
    return data.direction === 'received' && !data.homeDeliveredAt;
  });
  if (!pending.length) return { delivered: 0, knockerNames: [] };

  const now = new Date().toISOString();
  const batch = db.batch();
  const names: string[] = [];
  for (const doc of pending) {
    const data = doc.data();
    batch.update(doc.ref, { homeDeliveredAt: now });
    const name = typeof data.actorName === 'string' ? data.actorName.trim() : '';
    if (name) names.push(name);
  }
  batch.set(
    db.doc(`users/${userId}/activityMeta/summary`),
    { unreadReceived: FieldValue.increment(pending.length), updatedAt: now },
    { merge: true }
  );
  await batch.commit();

  const recipientSlug = await resolveProfileSlug(userId);
  const href = recipientSlug ? profileHref(recipientSlug) || '/activity' : '/activity';
  const { maybePush } = await import('@/lib/server/activity');
  for (const doc of pending.slice(0, 3)) {
    const data = doc.data();
    const actorName = typeof data.actorName === 'string' ? data.actorName : 'Someone';
    const { title, body } = pushCopyForActivity('door_knock', actorName, data.preview);
    void maybePush(userId, 'door_knock', title, body, href);
  }

  return { delivered: pending.length, knockerNames: names };
}

export async function dismissDoorKnockLive(userId: string, knockId: string): Promise<void> {
  const db = await getDb();
  await db.doc(`users/${userId}/doorKnockLive/${knockId}`).delete().catch(() => undefined);
}
