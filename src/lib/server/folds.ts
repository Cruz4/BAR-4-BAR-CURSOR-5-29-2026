import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { emitActivityEvent } from '@/lib/server/activity';
import { DEFAULT_ACTIVITY_PREFS } from '@/lib/activity/types';
import { listPushTokensFromDoc, sendWebPushToTokens } from '@/lib/server/push-devices';
import {
  FOLD_BAR_MAX_CHARS,
  asUnreadCount,
  asUnreadMap,
  foldIdFor,
  foldPreview,
  peerIdOf,
  type FoldBar,
  type FoldBarReply,
  type FoldDoc,
  type FoldMember,
  type FoldStatus,
} from '@/lib/folds/types';
import {
  assertFoldMediaPath,
  foldBarPreviewText,
  isFoldReactionKind,
  parseFoldBarImage,
  parseFoldPoll,
  parseFoldReactions,
  type FoldReactionKind,
} from '@/lib/folds/attachments';
import { buildPostPoll } from '@/lib/profile/post-polls';
import { parseVoiceNote, voiceNoteToFirestore } from '@/lib/profile/voice-notes';
import { normalizeQuotePressConfig } from '@/lib/profile/quote-press';

function chronoId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asFold(id: string, data: FirebaseFirestore.DocumentData | undefined): FoldDoc | null {
  if (!data) return null;
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.filter(Boolean) : [];
  if (memberIds.length !== 2) return null;
  return {
    id,
    memberIds: [String(memberIds[0]), String(memberIds[1])],
    members: (data.members && typeof data.members === 'object' ? data.members : {}) as FoldDoc['members'],
    status: data.status === 'open' || data.status === 'declined' ? data.status : 'pending',
    initiatedBy: String(data.initiatedBy || ''),
    lastBar: String(data.lastBar || ''),
    lastAt: String(data.lastAt || ''),
    lastSenderId: String(data.lastSenderId || ''),
    lastBarId: String(data.lastBarId || ''),
    unread: asUnreadMap(data.unread),
    deletedFor:
      data.deletedFor && typeof data.deletedFor === 'object'
        ? data.deletedFor
        : ({} as Record<string, boolean>),
    foldedBack:
      data.foldedBack && typeof data.foldedBack === 'object'
        ? data.foldedBack
        : ({} as Record<string, boolean>),
    lastReadAt:
      data.lastReadAt && typeof data.lastReadAt === 'object'
        ? data.lastReadAt
        : ({} as Record<string, string>),
    barCount: typeof data.barCount === 'number' ? data.barCount : 0,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  };
}

async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const db = await getDb();
  const [ab, ba] = await Promise.all([
    db.doc(`users/${a}/blocks/${b}`).get(),
    db.doc(`users/${b}/blocks/${a}`).get(),
  ]);
  return ab.exists || ba.exists;
}

async function areFriends(a: string, b: string): Promise<boolean> {
  const db = await getDb();
  const snap = await db.doc(`friendships/${foldIdFor(a, b)}`).get();
  return snap.data()?.status === 'accepted';
}

async function memberProfile(uid: string, fallbackName: string, fallbackSlug?: string): Promise<FoldMember> {
  const db = await getDb();
  const [userSnap, summarySnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`users/${uid}/gamification/summary`).get(),
  ]);
  const name =
    typeof userSnap.data()?.displayName === 'string' && userSnap.data()!.displayName.trim()
      ? userSnap.data()!.displayName.trim()
      : fallbackName.trim() || 'Artist';
  const slug =
    fallbackSlug?.trim() ||
    (typeof summarySnap.data()?.profileSlug === 'string' ? summarySnap.data()!.profileSlug.trim() : '');
  return slug ? { name: name.slice(0, 80), slug: slug.slice(0, 80) } : { name: name.slice(0, 80) };
}

function assertMember(fold: FoldDoc, uid: string) {
  if (!fold.memberIds.includes(uid)) throw new Error('That conversation isn’t yours.');
}

export async function getFold(foldId: string): Promise<FoldDoc | null> {
  const db = await getDb();
  const snap = await db.doc(`folds/${foldId}`).get();
  if (!snap.exists) return null;
  return asFold(snap.id, snap.data());
}

export async function markFoldRead(opts: { foldId: string; userId: string }): Promise<FoldDoc> {
  const db = await getDb();
  const ref = db.doc(`folds/${opts.foldId}`);
  const snap = await ref.get();
  const fold = asFold(snap.id, snap.data());
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  await ref.set(
    {
      [`unread.${opts.userId}`]: 0,
      [`foldedBack.${opts.userId}`]: false,
      [`lastReadAt.${opts.userId}`]: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return (await getFold(opts.foldId)) as FoldDoc;
}

export async function foldBackUnread(opts: { foldId: string; userId: string }): Promise<FoldDoc> {
  const db = await getDb();
  const ref = db.doc(`folds/${opts.foldId}`);
  const snap = await ref.get();
  const fold = asFold(snap.id, snap.data());
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  const current = asUnreadCount(fold.unread[opts.userId]);
  await ref.set(
    {
      [`unread.${opts.userId}`]: Math.max(1, current),
      [`foldedBack.${opts.userId}`]: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return (await getFold(opts.foldId)) as FoldDoc;
}

export async function markAllFoldsRead(userId: string): Promise<number> {
  const db = await getDb();
  const snap = await db.collection('folds').where('memberIds', 'array-contains', userId).get();
  const now = new Date().toISOString();
  let count = 0;
  let batch = db.batch();
  let batchSize = 0;

  for (const doc of snap.docs) {
    const fold = asFold(doc.id, doc.data());
    if (!fold || fold.deletedFor?.[userId] || fold.status === 'declined') continue;
    if (fold.status === 'pending' && fold.initiatedBy !== userId) continue;
    if (asUnreadCount(fold.unread[userId]) <= 0) continue;
    batch.update(doc.ref, {
      [`unread.${userId}`]: 0,
      [`foldedBack.${userId}`]: false,
      [`lastReadAt.${userId}`]: now,
      updatedAt: now,
    });
    count += 1;
    batchSize += 1;
    if (batchSize >= 400) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if (batchSize > 0) await batch.commit();
  return count;
}

export async function markAllFoldsUnread(userId: string): Promise<number> {
  const db = await getDb();
  const snap = await db.collection('folds').where('memberIds', 'array-contains', userId).get();
  const now = new Date().toISOString();
  let count = 0;
  let batch = db.batch();
  let batchSize = 0;

  for (const doc of snap.docs) {
    const fold = asFold(doc.id, doc.data());
    if (!fold || fold.deletedFor?.[userId] || fold.status !== 'open') continue;
    if (!fold.lastBarId) continue;
    if (asUnreadCount(fold.unread[userId]) > 0) continue;
    batch.update(doc.ref, {
      [`unread.${userId}`]: 1,
      [`foldedBack.${userId}`]: true,
      updatedAt: now,
    });
    count += 1;
    batchSize += 1;
    if (batchSize >= 400) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if (batchSize > 0) await batch.commit();
  return count;
}

export async function acceptFold(opts: { foldId: string; userId: string }): Promise<FoldDoc> {
  const fold = await getFold(opts.foldId);
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  if (fold.status === 'open') return fold;
  if (fold.initiatedBy === opts.userId) throw new Error('Wait for them to open it.');
  const db = await getDb();
  await db.doc(`folds/${opts.foldId}`).set(
    {
      status: 'open',
      [`unread.${opts.userId}`]: 0,
      [`foldedBack.${opts.userId}`]: false,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return (await getFold(opts.foldId)) as FoldDoc;
}

export async function declineFold(opts: { foldId: string; userId: string }): Promise<FoldDoc> {
  const fold = await getFold(opts.foldId);
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  if (fold.initiatedBy === opts.userId && fold.status === 'pending') {
    throw new Error('They haven’t accepted yet.');
  }
  const db = await getDb();
  await db.doc(`folds/${opts.foldId}`).set(
    {
      status: 'declined',
      [`unread.${fold.memberIds[0]}`]: 0,
      [`unread.${fold.memberIds[1]}`]: 0,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return (await getFold(opts.foldId)) as FoldDoc;
}

export async function deleteFoldForUser(opts: { foldId: string; userId: string }): Promise<FoldDoc> {
  const fold = await getFold(opts.foldId);
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  const db = await getDb();
  await db.doc(`folds/${opts.foldId}`).set(
    {
      [`deletedFor.${opts.userId}`]: true,
      [`unread.${opts.userId}`]: 0,
      [`foldedBack.${opts.userId}`]: false,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return (await getFold(opts.foldId)) as FoldDoc;
}

export async function passBar(opts: {
  senderId: string;
  senderName: string;
  senderSlug?: string;
  peerId: string;
  text: string;
  clientId?: string;
  replyTo?: FoldBarReply;
  image?: unknown;
  voice?: unknown;
  poll?: unknown;
  quotePress?: unknown;
}): Promise<{ fold: FoldDoc; bar: FoldBar; opened: boolean; firstPass: boolean }> {
  if (opts.senderId === opts.peerId) throw new Error('That is you.');
  const text = opts.text.trim().slice(0, FOLD_BAR_MAX_CHARS);
  const image = parseFoldBarImage(opts.image);
  const voice = parseVoiceNote(opts.voice);
  const quotePress = text ? normalizeQuotePressConfig(opts.quotePress) : undefined;
  let poll: ReturnType<typeof parseFoldPoll>;
  const pollRaw = opts.poll && typeof opts.poll === 'object' ? (opts.poll as Record<string, unknown>) : null;
  if (pollRaw) {
    const optionsUnknown = Array.isArray(pollRaw.options) ? pollRaw.options : [];
    const stringOptions = optionsUnknown.filter((value): value is string => typeof value === 'string');
    if (stringOptions.length && stringOptions.length === optionsUnknown.length) {
      const built = buildPostPoll({
        options: stringOptions,
        resultsVisibility: pollRaw.resultsVisibility === 'always' ? 'always' : 'after_vote',
      });
      poll = built ? { ...built, votes: {} } : undefined;
    } else {
      poll = parseFoldPoll(pollRaw);
    }
  }
  if (!text && !image && !voice && !poll) throw new Error('Write a message first.');
  if (await isBlockedEitherWay(opts.senderId, opts.peerId)) {
    throw new Error('You can’t message this artist.');
  }

  const db = await getDb();
  const peerSnap = await db.doc(`users/${opts.peerId}`).get();
  if (!peerSnap.exists) throw new Error('Artist not found.');

  const foldId = foldIdFor(opts.senderId, opts.peerId);
  if (image) assertFoldMediaPath(foldId, image.storagePath);
  if (voice) assertFoldMediaPath(foldId, voice.storagePath);
  const friends = await areFriends(opts.senderId, opts.peerId);
  const [senderMember, peerMember] = await Promise.all([
    memberProfile(opts.senderId, opts.senderName, opts.senderSlug),
    memberProfile(opts.peerId, String(peerSnap.data()?.displayName || 'Artist')),
  ]);

  const now = new Date().toISOString();
  const barId = chronoId();
  const bar: FoldBar = {
    id: barId,
    senderId: opts.senderId,
    text,
    createdAt: now,
    ...(opts.clientId ? { clientId: opts.clientId.slice(0, 80) } : {}),
    ...(opts.replyTo?.barId
      ? {
          replyTo: {
            barId: opts.replyTo.barId.slice(0, 80),
            text: foldPreview(opts.replyTo.text || ''),
            senderId: opts.replyTo.senderId.slice(0, 80),
          },
        }
      : {}),
    ...(image ? { image } : {}),
    ...(voice ? { voice: voiceNoteToFirestore(voice) } : {}),
    ...(poll ? { poll } : {}),
    ...(quotePress ? { quotePress } : {}),
  };

  const ref = db.doc(`folds/${foldId}`);
  const existingSnap = await ref.get();
  const existing = asFold(foldId, existingSnap.data());

  if (existing?.status === 'pending' && existing.initiatedBy !== opts.senderId && opts.replyTo) {
    /* answering a sealed pass opens the sheet */
  }
  if (existing?.status === 'pending' && existing.initiatedBy !== opts.senderId && !friends) {
    // Recipient can answer — that opens. They can also send a new bar without quote.
  }
  if (existing?.status === 'declined' && existing.initiatedBy !== opts.senderId) {
    // Either party may pass again after a decline.
  }

  let status: FoldStatus = 'open';
  let firstPass = false;
  let opened = false;
  const newOrReopened = !existing || existing.status === 'declined';

  if (!existing) {
    status = friends ? 'open' : 'pending';
    firstPass = status === 'pending';
  } else if (existing.status === 'declined') {
    status = friends ? 'open' : 'pending';
    firstPass = status === 'pending';
  } else if (existing.status === 'pending') {
    if (opts.senderId !== existing.initiatedBy) {
      status = 'open';
      opened = true;
    } else {
      status = 'pending';
    }
  } else {
    status = 'open';
  }

  const memberIds: [string, string] = [opts.senderId, opts.peerId].sort() as [string, string];
  const peerUnread = asUnreadCount(existing?.unread?.[opts.peerId]) + 1;
  const lastBar = foldBarPreviewText(bar);
  const payload: Record<string, unknown> = {
    memberIds,
    members: {
      ...(existing?.members || {}),
      [opts.senderId]: senderMember,
      [opts.peerId]: peerMember,
    },
    status,
    initiatedBy: existing && existing.status !== 'declined' ? existing.initiatedBy : opts.senderId,
    lastBar,
    lastAt: now,
    lastSenderId: opts.senderId,
    lastBarId: barId,
    [`unread.${opts.peerId}`]: peerUnread,
    [`unread.${opts.senderId}`]: 0,
    [`deletedFor.${opts.senderId}`]: false,
    [`deletedFor.${opts.peerId}`]: false,
    [`foldedBack.${opts.senderId}`]: false,
    [`foldedBack.${opts.peerId}`]: false,
    barCount: FieldValue.increment(1),
    updatedAt: now,
    ...(existing ? {} : { createdAt: now }),
  };

  const batch = db.batch();
  batch.set(ref, payload, { merge: true });
  batch.set(ref.collection('bars').doc(barId), {
    senderId: bar.senderId,
    text: bar.text,
    createdAt: bar.createdAt,
    ...(bar.clientId ? { clientId: bar.clientId } : {}),
    ...(bar.replyTo ? { replyTo: bar.replyTo } : {}),
    ...(bar.image ? { image: bar.image } : {}),
    ...(bar.voice ? { voice: bar.voice } : {}),
    ...(bar.poll ? { poll: bar.poll } : {}),
    ...(bar.quotePress ? { quotePress: bar.quotePress } : {}),
  });
  await batch.commit();

  const fold = (await getFold(foldId)) as FoldDoc;

  void notifyPeer({
    fold,
    bar,
    senderName: senderMember.name,
    firstPass,
    announceActivity: newOrReopened || firstPass,
  }).catch((err) => console.warn('[folds/notify]', err));

  return { fold, bar, opened, firstPass };
}

export async function voteFoldPoll(opts: {
  foldId: string;
  barId: string;
  userId: string;
  optionId: string;
}): Promise<FoldBar> {
  const fold = await getFold(opts.foldId);
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  const db = await getDb();
  const ref = db.doc(`folds/${opts.foldId}/bars/${opts.barId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Message not found.');
  const poll = parseFoldPoll(snap.data()?.poll);
  if (!poll) throw new Error('That poll is gone.');
  if (!poll.options.some((option) => option.id === opts.optionId)) {
    throw new Error('Pick a poll choice.');
  }
  if (poll.votes[opts.userId]) throw new Error('Your vote was already locked in.');
  const next = { ...poll, votes: { ...poll.votes, [opts.userId]: opts.optionId } };
  await ref.set({ poll: next }, { merge: true });
  return {
    id: opts.barId,
    senderId: String(snap.data()?.senderId || ''),
    text: String(snap.data()?.text || ''),
    createdAt: String(snap.data()?.createdAt || ''),
    poll: next,
  };
}

export async function reactToFoldBar(opts: {
  foldId: string;
  barId: string;
  userId: string;
  kind: string | null;
}): Promise<FoldBar> {
  const fold = await getFold(opts.foldId);
  if (!fold) throw new Error('Conversation not found.');
  assertMember(fold, opts.userId);
  const db = await getDb();
  const ref = db.doc(`folds/${opts.foldId}/bars/${opts.barId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Message not found.');
  const current = parseFoldReactions(snap.data()?.reactions) || {};
  const next: Record<string, FoldReactionKind> = { ...current };
  if (!opts.kind) {
    delete next[opts.userId];
  } else if (!isFoldReactionKind(opts.kind)) {
    throw new Error('Pick a reaction.');
  } else if (current[opts.userId] === opts.kind) {
    delete next[opts.userId];
  } else {
    next[opts.userId] = opts.kind;
  }
  await ref.set({ reactions: next }, { merge: true });
  return {
    id: opts.barId,
    senderId: String(snap.data()?.senderId || ''),
    text: String(snap.data()?.text || ''),
    createdAt: String(snap.data()?.createdAt || ''),
    reactions: Object.keys(next).length ? next : undefined,
  };
}

async function recentlyViewing(foldId: string, uid: string): Promise<boolean> {
  try {
    const db = await getDb();
    const snap = await db.doc(`folds/${foldId}/presence/${uid}`).get();
    const data = snap.data() || {};
    if (data.viewing !== true) return false;
    const at = typeof data.at === 'string' ? Date.parse(data.at) : 0;
    return Boolean(at && Date.now() - at < 12_000);
  } catch {
    return false;
  }
}

async function notifyPeer(opts: {
  fold: FoldDoc;
  bar: FoldBar;
  senderName: string;
  firstPass: boolean;
  announceActivity: boolean;
}) {
  const peerId = peerIdOf(opts.fold.memberIds, opts.bar.senderId);
  if (!peerId) return;

  if (opts.announceActivity || opts.firstPass) {
    await emitActivityEvent({
      type: 'fold_pass',
      actorId: opts.bar.senderId,
      actorName: opts.senderName,
      actorSlug: opts.fold.members[opts.bar.senderId]?.slug,
      recipientId: peerId,
      recipientName: opts.fold.members[peerId]?.name || 'Artist',
      preview: foldBarPreviewText(opts.bar),
      href: `/msgs/${opts.fold.id}`,
    });
  }

  if (await recentlyViewing(opts.fold.id, peerId)) return;

  const db = await getDb();
  const prefsSnap = await db.doc(`users/${peerId}/activityMeta/prefs`).get();
  const prefs = { ...DEFAULT_ACTIVITY_PREFS, ...(prefsSnap.data() || {}) };
  if (prefs.pushEnabled !== true) return;
  if (prefs.foldBars === false) return;

  const pushSnap = await db.doc(`users/${peerId}/activityMeta/push`).get();
  const tokens = listPushTokensFromDoc(pushSnap.data() as Record<string, unknown> | undefined);
  if (!tokens.length) return;

  const href = `/msgs/${opts.fold.id}`;
  const title = opts.firstPass ? `${opts.senderName} sent you a message` : opts.senderName;
  await sendWebPushToTokens({
    tokens,
    title,
    body: foldBarPreviewText(opts.bar),
    href,
    type: opts.firstPass ? 'fold_pass' : 'fold_bar',
  });
}
