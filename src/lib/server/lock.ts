import 'server-only';

import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { scoreEchoAgainstLock } from '@/lib/lock/score-echo';
import {
  HOUSE_OWNER_NAME,
  HOUSE_SEED_BAR,
  type LockClearOffer,
  type LockContribution,
  type LockDnaSnapshot,
  type LockDoc,
  type LockEcho,
} from '@/lib/lock/types';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';

function chronoId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}_${r}`;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function contributionDocId(lockId: string, echoId: string): string {
  return `${lockId}_${echoId}`.slice(0, 700);
}

function mapLock(id: string, data: Record<string, unknown>): LockDoc {
  const dna =
    data.dnaSnapshot && typeof data.dnaSnapshot === 'object'
      ? (data.dnaSnapshot as LockDnaSnapshot)
      : undefined;
  return {
    id,
    status: data.status === 'closed' ? 'closed' : 'open',
    ownerId: String(data.ownerId || ''),
    ownerName: String(data.ownerName || 'Artist'),
    ...(typeof data.ownerSlug === 'string' && data.ownerSlug ? { ownerSlug: data.ownerSlug } : {}),
    seedBar: String(data.seedBar || ''),
    ...(typeof data.embedUrl === 'string' && data.embedUrl.trim() ? { embedUrl: data.embedUrl.trim() } : {}),
    ...(dna ? { dnaSnapshot: dna } : {}),
    echoCount: typeof data.echoCount === 'number' ? data.echoCount : 0,
    watcherCount: typeof data.watcherCount === 'number' ? data.watcherCount : 0,
    ...(typeof data.artistPickEchoId === 'string' ? { artistPickEchoId: data.artistPickEchoId } : {}),
    ...(typeof data.clearedAt === 'string' ? { clearedAt: data.clearedAt } : {}),
    ...(typeof data.clearNote === 'string' ? { clearNote: data.clearNote } : {}),
    createdAt: String(data.createdAt || new Date().toISOString()),
    updatedAt: String(data.updatedAt || data.createdAt || new Date().toISOString()),
    ...(data.isHouse === true ? { isHouse: true } : {}),
  };
}

function mapEcho(id: string, data: Record<string, unknown>): LockEcho {
  const labelRaw = data.lockLabel;
  const lockLabel =
    labelRaw === 'Hard LOCK' || labelRaw === 'In-world' || labelRaw === 'Off-world'
      ? labelRaw
      : 'Off-world';
  return {
    id,
    text: String(data.text || ''),
    lockScore: typeof data.lockScore === 'number' ? data.lockScore : 0,
    lockLabel,
    parentEchoId: typeof data.parentEchoId === 'string' ? data.parentEchoId : null,
    authorId: typeof data.authorId === 'string' ? data.authorId : null,
    authorName: typeof data.authorName === 'string' ? data.authorName : null,
    createdAt: String(data.createdAt || new Date().toISOString()),
    ...(data.isPick === true ? { isPick: true } : {}),
  };
}

export async function ensureHouseLock(): Promise<LockDoc> {
  const db = await getDb();
  const ref = db.collection('locks').doc(LOCK_HOUSE_ID);
  const snap = await ref.get();
  if (snap.exists) return mapLock(LOCK_HOUSE_ID, (snap.data() || {}) as Record<string, unknown>);

  const now = new Date().toISOString();
  const doc: Omit<LockDoc, 'id'> = {
    status: 'open',
    ownerId: 'system',
    ownerName: HOUSE_OWNER_NAME,
    seedBar: HOUSE_SEED_BAR,
    dnaSnapshot: {
      setting_world: 'Night city under a watching moon',
      emotion_core: 'Lonely ambition with soft wonder',
      message_truth: 'Introduce yourself before the world names you',
      tone_palette: 'Intimate · nocturnal · slightly mythic',
      intents: ['self-myth', 'first contact', 'name yourself'],
    },
    echoCount: 0,
    watcherCount: 0,
    createdAt: now,
    updatedAt: now,
    isHouse: true,
  };
  await ref.set(doc);
  return { id: LOCK_HOUSE_ID, ...doc };
}

/** Admin house-bar-of-the-day: rewrite the shared seed without wiping echoes. */
export async function updateHouseLockSeed(seedBar: string): Promise<LockDoc> {
  const lock = await ensureHouseLock();
  const text = cleanText(seedBar, 280);
  if (!text) return lock;
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection('locks').doc(LOCK_HOUSE_ID).set(
    {
      seedBar: text,
      status: 'open',
      isHouse: true,
      ownerId: 'system',
      ownerName: HOUSE_OWNER_NAME,
      updatedAt: now,
    },
    { merge: true }
  );
  return { ...lock, seedBar: text, status: 'open', updatedAt: now };
}

export async function getLock(lockId: string): Promise<LockDoc | null> {
  const id = lockId.trim();
  if (!id) return null;
  if (id === LOCK_HOUSE_ID || id === 'house') {
    return ensureHouseLock();
  }
  const db = await getDb();
  const snap = await db.collection('locks').doc(id).get();
  if (!snap.exists) return null;
  return mapLock(id, (snap.data() || {}) as Record<string, unknown>);
}

export async function listEchoes(
  lockId: string,
  options?: { limit?: number; order?: 'score' | 'new' }
): Promise<LockEcho[]> {
  const db = await getDb();
  const lim = Math.min(100, Math.max(1, options?.limit ?? 40));
  const col = db.collection('locks').doc(lockId).collection('echoes');
  let snap;
  if (options?.order === 'score') {
    snap = await col.orderBy('lockScore', 'desc').limit(lim).get();
  } else {
    snap = await col.orderBy('createdAt', 'desc').limit(lim).get();
  }
  return snap.docs.map((d) => mapEcho(d.id, (d.data() || {}) as Record<string, unknown>));
}

export async function submitEcho(input: {
  lockId: string;
  text: string;
  parentEchoId?: string | null;
  authorId?: string | null;
  authorName?: string | null;
}): Promise<{ lock: LockDoc; echo: LockEcho }> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('LOCK not found');
  if (lock.status !== 'open') throw new Error('This LOCK is closed');

  const text = cleanText(input.text, 280);
  if (text.length < 3) throw new Error('Write at least a few words');

  const scored = scoreEchoAgainstLock({
    echoText: text,
    seedBar: lock.seedBar,
    dnaSnapshot: lock.dnaSnapshot,
  });

  const db = await getDb();
  const echoId = chronoId();
  const now = new Date().toISOString();
  const echoRef = db.collection('locks').doc(lock.id).collection('echoes').doc(echoId);

  const echoData = {
    text,
    lockScore: scored.score,
    lockLabel: scored.label,
    parentEchoId: input.parentEchoId?.trim() || null,
    authorId: input.authorId?.trim() || null,
    authorName: input.authorName?.trim() || null,
    createdAt: now,
    isPick: false,
  };

  const batch = db.batch();
  batch.set(echoRef, echoData);
  batch.update(db.collection('locks').doc(lock.id), {
    echoCount: FieldValue.increment(1),
    updatedAt: now,
  });
  await batch.commit();

  const echo = mapEcho(echoId, echoData as Record<string, unknown>);

  // Notify watchers when a *named* echo lands (anon skips Activity to avoid junk actors)
  if (input.authorId?.trim()) {
    try {
      await upsertLockContributionMirror({
        userId: input.authorId.trim(),
        lock,
        echo,
      });
    } catch (e) {
      console.warn('[lock] contribution mirror', e);
    }
    try {
      await notifyLockAnswered({
        lock,
        echoText: text,
        actorId: input.authorId.trim(),
        actorName: input.authorName?.trim() || 'Artist',
      });
    } catch (e) {
      console.warn('[lock] notify', e);
    }
  }

  return {
    lock: { ...lock, echoCount: lock.echoCount + 1, updatedAt: now },
    echo,
  };
}

async function notifyLockAnswered(input: {
  lock: LockDoc;
  echoText: string;
  actorId: string;
  actorName: string;
}) {
  const { emitActivityEvent } = await import('@/lib/server/activity');
  const db = await getDb();
  const watchers = await db.collection('locks').doc(input.lock.id).collection('watchers').limit(40).get();
  const recipientIds = new Set<string>();
  if (input.lock.ownerId && input.lock.ownerId !== 'system') {
    recipientIds.add(input.lock.ownerId);
  }
  for (const w of watchers.docs) recipientIds.add(w.id);

  for (const recipientId of recipientIds) {
    if (recipientId === input.actorId) continue;
    await emitActivityEvent({
      type: 'lock_answered',
      actorId: input.actorId,
      actorName: input.actorName,
      recipientId,
      preview: input.echoText.slice(0, 120),
      href: `/lock/${input.lock.id}`,
      lockId: input.lock.id,
    });
  }
}

/** Author or cast owner may remove a reply. Decrements echoCount; clears pick if needed. */
export async function deleteEcho(input: {
  lockId: string;
  echoId: string;
  requesterId: string;
}): Promise<void> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('Cast not found');

  const db = await getDb();
  const echoRef = db.collection('locks').doc(lock.id).collection('echoes').doc(input.echoId);
  const snap = await echoRef.get();
  if (!snap.exists) throw new Error('Reply not found');

  const data = (snap.data() || {}) as Record<string, unknown>;
  const authorId = typeof data.authorId === 'string' ? data.authorId : null;
  const isOwner = lock.ownerId === input.requesterId && lock.ownerId !== 'system';
  const isAuthor = Boolean(authorId && authorId === input.requesterId);
  if (!isOwner && !isAuthor) {
    throw new Error('Only the writer or the casting artist can delete this reply');
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  batch.delete(echoRef);
  batch.update(db.collection('locks').doc(lock.id), {
    echoCount: FieldValue.increment(-1),
    updatedAt: now,
    ...(lock.artistPickEchoId === input.echoId
      ? { artistPickEchoId: FieldValue.delete() }
      : {}),
  });
  await batch.commit();

  if (authorId) {
    try {
      await deleteLockContributionMirror({
        userId: authorId,
        lockId: lock.id,
        echoId: input.echoId,
      });
    } catch (e) {
      console.warn('[lock] contribution mirror delete', e);
    }
  }
}

export async function claimEchoAuthor(input: {
  lockId: string;
  echoId: string;
  userId: string;
  displayName: string;
}): Promise<LockEcho | null> {
  const db = await getDb();
  const ref = db.collection('locks').doc(input.lockId).collection('echoes').doc(input.echoId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.authorId && data.authorId !== input.userId) {
    throw new Error('Echo already claimed by someone else');
  }
  await ref.update({
    authorId: input.userId,
    authorName: input.displayName.slice(0, 80),
  });
  const echo = mapEcho(input.echoId, {
    ...(data as Record<string, unknown>),
    authorId: input.userId,
    authorName: input.displayName,
  });
  const lock = await getLock(input.lockId);
  if (lock) {
    try {
      await upsertLockContributionMirror({
        userId: input.userId,
        lock,
        echo,
      });
    } catch (e) {
      console.warn('[lock] contribution mirror on claim', e);
    }
  }
  return echo;
}

export async function watchLock(input: {
  lockId: string;
  userId: string;
  lastEchoId?: string;
}): Promise<void> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('LOCK not found');
  const db = await getDb();
  const ref = db.collection('locks').doc(lock.id).collection('watchers').doc(input.userId);
  const existing = await ref.get();
  const now = new Date().toISOString();
  await ref.set(
    {
      createdAt: existing.exists ? existing.data()?.createdAt || now : now,
      updatedAt: now,
      ...(input.lastEchoId ? { lastEchoId: input.lastEchoId } : {}),
    },
    { merge: true }
  );
  if (!existing.exists) {
    await db.collection('locks').doc(lock.id).update({
      watcherCount: FieldValue.increment(1),
      updatedAt: now,
    });
  }
}

export async function createLock(input: {
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  seedBar: string;
  embedUrl?: string;
  dnaSnapshot?: LockDnaSnapshot;
}): Promise<LockDoc> {
  const seedBar = cleanText(input.seedBar, 280);
  if (seedBar.length < 3) throw new Error('Seed bar too short');

  const db = await getDb();
  const id = chronoId();
  const now = new Date().toISOString();
  const doc: Omit<LockDoc, 'id'> = {
    status: 'open',
    ownerId: input.ownerId,
    ownerName: input.ownerName.slice(0, 80),
    ...(input.ownerSlug ? { ownerSlug: input.ownerSlug.slice(0, 64) } : {}),
    seedBar,
    ...(input.embedUrl?.trim() ? { embedUrl: input.embedUrl.trim().slice(0, 500) } : {}),
    ...(input.dnaSnapshot ? { dnaSnapshot: input.dnaSnapshot } : {}),
    echoCount: 0,
    watcherCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('locks').doc(id).set(doc);
  return { id, ...doc };
}

export async function closeLock(input: {
  lockId: string;
  ownerId: string;
}): Promise<LockDoc> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('LOCK not found');
  if (lock.ownerId !== input.ownerId) throw new Error('Only the casting artist can close this LOCK');
  if (lock.isHouse || lock.ownerId === 'system') {
    throw new Error('The house LOCK stays open — publish your own cast to close one');
  }
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection('locks').doc(lock.id).update({
    status: 'closed',
    updatedAt: now,
  });
  return { ...lock, status: 'closed', updatedAt: now };
}

/** Owner hard-deletes a cast (echoes, watchers, clear offers, contribution mirrors). */
export async function deleteLock(input: {
  lockId: string;
  ownerId: string;
}): Promise<void> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('LOCK not found');
  if (lock.ownerId !== input.ownerId) {
    throw new Error('Only the casting artist can delete this LOCK');
  }
  if (lock.isHouse || lock.ownerId === 'system') {
    throw new Error('The house LOCK cannot be deleted');
  }

  const db = await getDb();
  const lockRef = db.collection('locks').doc(lock.id);

  const [echoSnap, watcherSnap, offerSnap] = await Promise.all([
    lockRef.collection('echoes').get(),
    lockRef.collection('watchers').get(),
    lockRef.collection('clearOffers').get(),
  ]);

  const mirrorJobs: Array<{ userId: string; echoId: string }> = [];
  for (const doc of echoSnap.docs) {
    const data = (doc.data() || {}) as Record<string, unknown>;
    const authorId = typeof data.authorId === 'string' ? data.authorId : '';
    if (authorId) mirrorJobs.push({ userId: authorId, echoId: doc.id });
  }

  const flushBatch = async (refs: DocumentReference[]) => {
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      for (const ref of refs.slice(i, i + 400)) batch.delete(ref);
      await batch.commit();
    }
  };

  await flushBatch([
    ...echoSnap.docs.map((d) => d.ref),
    ...watcherSnap.docs.map((d) => d.ref),
    ...offerSnap.docs.map((d) => d.ref),
  ]);
  await lockRef.delete();

  for (const job of mirrorJobs) {
    try {
      await deleteLockContributionMirror({
        userId: job.userId,
        lockId: lock.id,
        echoId: job.echoId,
      });
    } catch (e) {
      console.warn('[lock] contribution mirror delete on cast delete', e);
    }
  }
}

export async function setArtistPick(input: {
  lockId: string;
  ownerId: string;
  echoId: string;
}): Promise<{ lock: LockDoc; echo: LockEcho }> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('LOCK not found');
  if (lock.ownerId !== input.ownerId) throw new Error('Only the casting artist can pick');

  const db = await getDb();
  const echoRef = db.collection('locks').doc(lock.id).collection('echoes').doc(input.echoId);
  const echoSnap = await echoRef.get();
  if (!echoSnap.exists) throw new Error('Echo not found');

  const now = new Date().toISOString();
  const batch = db.batch();

  if (lock.artistPickEchoId && lock.artistPickEchoId !== input.echoId) {
    batch.update(db.collection('locks').doc(lock.id).collection('echoes').doc(lock.artistPickEchoId), {
      isPick: false,
    });
  }
  batch.update(echoRef, { isPick: true });
  batch.update(db.collection('locks').doc(lock.id), {
    artistPickEchoId: input.echoId,
    updatedAt: now,
  });
  await batch.commit();

  const echo = mapEcho(input.echoId, { ...(echoSnap.data() as Record<string, unknown>), isPick: true });

  if (echo.authorId) {
    try {
      const { emitActivityEvent } = await import('@/lib/server/activity');
      await emitActivityEvent({
        type: 'artist_pick',
        actorId: lock.ownerId,
        actorName: lock.ownerName,
        actorSlug: lock.ownerSlug,
        recipientId: echo.authorId,
        preview: echo.text.slice(0, 120),
        href: `/lock/${lock.id}`,
        lockId: lock.id,
      });
    } catch (e) {
      console.warn('[lock] pick activity', e);
    }
  }

  return {
    lock: { ...lock, artistPickEchoId: input.echoId, updatedAt: now },
    echo,
  };
}

export async function listRecentOpenLocks(limit = 12): Promise<LockDoc[]> {
  const db = await getDb();
  try {
    const snap = await db
      .collection('locks')
      .where('status', '==', 'open')
      .orderBy('updatedAt', 'desc')
      .limit(Math.min(40, Math.max(1, limit)))
      .get();
    return snap.docs.map((d) => mapLock(d.id, (d.data() || {}) as Record<string, unknown>));
  } catch {
    // Fallback if composite index missing
    const snap = await db.collection('locks').orderBy('updatedAt', 'desc').limit(40).get();
    return snap.docs
      .map((d) => mapLock(d.id, (d.data() || {}) as Record<string, unknown>))
      .filter((l) => l.status === 'open')
      .slice(0, limit);
  }
}

export async function listLocksByOwner(
  ownerId: string,
  options?: { openOnly?: boolean; limit?: number }
): Promise<LockDoc[]> {
  const uid = ownerId.trim();
  if (!uid || uid === 'system') return [];
  const lim = Math.min(60, Math.max(1, options?.limit ?? 40));
  const db = await getDb();

  try {
    if (options?.openOnly) {
      const snap = await db
        .collection('locks')
        .where('ownerId', '==', uid)
        .where('status', '==', 'open')
        .orderBy('updatedAt', 'desc')
        .limit(lim)
        .get();
      return snap.docs.map((d) => mapLock(d.id, (d.data() || {}) as Record<string, unknown>));
    }
    const snap = await db
      .collection('locks')
      .where('ownerId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .limit(lim)
      .get();
    return snap.docs.map((d) => mapLock(d.id, (d.data() || {}) as Record<string, unknown>));
  } catch {
    const snap = await db.collection('locks').where('ownerId', '==', uid).limit(80).get();
    let rows = snap.docs.map((d) => mapLock(d.id, (d.data() || {}) as Record<string, unknown>));
    if (options?.openOnly) rows = rows.filter((l) => l.status === 'open');
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return rows.slice(0, lim);
  }
}

export async function listOpenLocksByOwner(ownerId: string, limit = 24): Promise<LockDoc[]> {
  return listLocksByOwner(ownerId, { openOnly: true, limit });
}

async function upsertLockContributionMirror(input: {
  userId: string;
  lock: LockDoc;
  echo: LockEcho;
}): Promise<void> {
  const uid = input.userId.trim();
  if (!uid) return;
  const db = await getDb();
  const id = contributionDocId(input.lock.id, input.echo.id);
  const data: LockContribution = {
    lockId: input.lock.id,
    echoId: input.echo.id,
    text: input.echo.text,
    lockScore: input.echo.lockScore,
    seedBar: input.lock.seedBar,
    ownerName: input.lock.ownerName,
    ...(input.lock.ownerSlug ? { ownerSlug: input.lock.ownerSlug } : {}),
    createdAt: input.echo.createdAt || new Date().toISOString(),
  };
  await db.doc(`users/${uid}/lockContributions/${id}`).set(data, { merge: true });
}

async function deleteLockContributionMirror(input: {
  userId: string;
  lockId: string;
  echoId: string;
}): Promise<void> {
  const uid = input.userId.trim();
  if (!uid) return;
  const db = await getDb();
  await db.doc(`users/${uid}/lockContributions/${contributionDocId(input.lockId, input.echoId)}`).delete();
}

export async function listMyLockContributions(
  userId: string,
  limit = 40
): Promise<LockContribution[]> {
  const uid = userId.trim();
  if (!uid) return [];
  const lim = Math.min(80, Math.max(1, limit));
  const db = await getDb();
  try {
    const snap = await db
      .collection(`users/${uid}/lockContributions`)
      .orderBy('createdAt', 'desc')
      .limit(lim)
      .get();
    return snap.docs.map((d) => {
      const data = (d.data() || {}) as Record<string, unknown>;
      return {
        lockId: String(data.lockId || ''),
        echoId: String(data.echoId || ''),
        text: String(data.text || ''),
        lockScore: typeof data.lockScore === 'number' ? data.lockScore : 0,
        seedBar: String(data.seedBar || ''),
        ownerName: String(data.ownerName || 'Artist'),
        ...(typeof data.ownerSlug === 'string' && data.ownerSlug
          ? { ownerSlug: data.ownerSlug }
          : {}),
        createdAt: String(data.createdAt || ''),
      };
    });
  } catch {
    const snap = await db.collection(`users/${uid}/lockContributions`).limit(lim).get();
    return snap.docs
      .map((d) => {
        const data = (d.data() || {}) as Record<string, unknown>;
        return {
          lockId: String(data.lockId || ''),
          echoId: String(data.echoId || ''),
          text: String(data.text || ''),
          lockScore: typeof data.lockScore === 'number' ? data.lockScore : 0,
          seedBar: String(data.seedBar || ''),
          ownerName: String(data.ownerName || 'Artist'),
          ...(typeof data.ownerSlug === 'string' && data.ownerSlug
            ? { ownerSlug: data.ownerSlug }
            : {}),
          createdAt: String(data.createdAt || ''),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function createClearOffers(input: {
  lockId: string;
  ownerId: string;
  offers: Array<{ userId: string; echoId: string; percent: number | null }>;
  note?: string;
}): Promise<void> {
  const lock = await getLock(input.lockId);
  if (!lock) throw new Error('LOCK not found');
  if (lock.ownerId !== input.ownerId) throw new Error('Only the casting artist can clear');

  const db = await getDb();
  const now = new Date().toISOString();
  const batch = db.batch();
  batch.update(db.collection('locks').doc(lock.id), {
    clearedAt: now,
    clearNote: (input.note || '').trim().slice(0, 280) || null,
    updatedAt: now,
  });

  const { emitActivityEvent } = await import('@/lib/server/activity');

  for (const offer of input.offers) {
    const ref = db.collection('locks').doc(lock.id).collection('clearOffers').doc(offer.userId);
    const data: LockClearOffer = {
      echoId: offer.echoId,
      percent: offer.percent,
      status: 'offered',
      createdAt: now,
    };
    batch.set(ref, data);
  }
  await batch.commit();

  for (const offer of input.offers) {
    try {
      await emitActivityEvent({
        type: 'lock_clear_offer',
        actorId: lock.ownerId,
        actorName: lock.ownerName,
        actorSlug: lock.ownerSlug,
        recipientId: offer.userId,
        preview: offer.percent != null ? `${offer.percent}% split offer` : 'Credit-only clear offer',
        href: `/lock/${lock.id}`,
        lockId: lock.id,
      });
    } catch (e) {
      console.warn('[lock] clear activity', e);
    }
  }
}

export async function respondClearOffer(input: {
  lockId: string;
  userId: string;
  accept: boolean;
}): Promise<LockClearOffer> {
  const db = await getDb();
  const ref = db.collection('locks').doc(input.lockId).collection('clearOffers').doc(input.userId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No clear offer found');
  const now = new Date().toISOString();
  const status = input.accept ? 'accepted' : 'declined';
  await ref.update({ status, updatedAt: now });
  const data = snap.data() || {};
  return {
    echoId: String(data.echoId || ''),
    percent: typeof data.percent === 'number' ? data.percent : null,
    status,
    createdAt: String(data.createdAt || now),
    updatedAt: now,
  };
}
