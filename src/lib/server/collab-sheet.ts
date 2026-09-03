import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { emitActivityEvent } from '@/lib/server/activity';
import { isProUser } from '@/lib/subscription';
import type { TrackSection, User } from '@/lib/types';
import {
  COLLAB_EDIT_NOTIFY_BAR_DELTA,
  COLLAB_MESSAGE_MAX_CHARS,
  collabSheetIdFor,
  countWrittenBars,
  type CollabMember,
  type CollabMessage,
  type CollabSheetDoc,
} from '@/lib/collab-sheet/types';
import { foldIdFor } from '@/lib/folds/types';

function chronoId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asCollab(id: string, data: FirebaseFirestore.DocumentData | undefined): CollabSheetDoc | null {
  if (!data) return null;
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String).filter(Boolean) : [];
  if (!memberIds.length) return null;
  return {
    id,
    ownerId: String(data.ownerId || ''),
    trackId: String(data.trackId || ''),
    albumId: String(data.albumId || ''),
    title: String(data.title || 'Untitled'),
    albumTitle: typeof data.albumTitle === 'string' ? data.albumTitle : undefined,
    memberIds,
    members: (data.members && typeof data.members === 'object' ? data.members : {}) as Record<string, CollabMember>,
    revoked: (data.revoked && typeof data.revoked === 'object' ? data.revoked : {}) as Record<string, boolean>,
    active: data.active !== false,
    liveSections: Array.isArray(data.liveSections) ? (data.liveSections as TrackSection[]) : [],
    revision: typeof data.revision === 'number' ? data.revision : 0,
    lastEditBy: String(data.lastEditBy || ''),
    lastEditAt: String(data.lastEditAt || ''),
    lastEditSummary: typeof data.lastEditSummary === 'string' ? data.lastEditSummary : undefined,
    notifyBarBaseline: typeof data.notifyBarBaseline === 'number' ? data.notifyBarBaseline : 0,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  };
}

async function memberProfile(uid: string, fallbackName: string, fallbackSlug?: string): Promise<CollabMember> {
  const db = await getDb();
  const [userSnap, summarySnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`users/${uid}/gamification/summary`).get(),
  ]);
  const profileSlug =
    (typeof summarySnap.data()?.profileSlug === 'string' ? summarySnap.data()!.profileSlug.trim() : '') ||
    fallbackSlug?.trim() ||
    '';
  const publicProfileSnap = profileSlug
    ? await db.doc(`publicProfiles/${profileSlug}`).get()
    : null;
  const publicDisplayName = publicProfileSnap?.data()?.displayName;
  const name =
    typeof publicDisplayName === 'string' && publicDisplayName.trim()
      ? publicDisplayName.trim()
      : typeof userSnap.data()?.displayName === 'string' && userSnap.data()!.displayName.trim()
        ? userSnap.data()!.displayName.trim()
        : fallbackName.trim() || 'Artist';
  const studioBadge = isProUser(userSnap.data() as Pick<User, 'subscriptionStatus'>)
    ? 'pro'
    : 'free';
  return {
    name: name.slice(0, 80),
    studioBadge,
    ...(profileSlug ? { slug: profileSlug.slice(0, 80) } : {}),
  };
}

async function areFriends(a: string, b: string): Promise<boolean> {
  const db = await getDb();
  const snap = await db.doc(`friendships/${foldIdFor(a, b)}`).get();
  return snap.data()?.status === 'accepted';
}

function assertMember(sheet: CollabSheetDoc, uid: string) {
  if (!sheet.memberIds.includes(uid) || sheet.revoked[uid]) {
    throw new Error('You do not have access to this Collab Sheet.');
  }
}

function sheetHref(sheet: CollabSheetDoc): string {
  return `/albums/${sheet.albumId}/tracks/${sheet.trackId}`;
}

export async function getCollabSheet(collabId: string): Promise<CollabSheetDoc | null> {
  const db = await getDb();
  const snap = await db.doc(`collabSheets/${collabId}`).get();
  if (!snap.exists) return null;
  return asCollab(snap.id, snap.data());
}

export async function listCollabSheetsForUser(userId: string): Promise<CollabSheetDoc[]> {
  const db = await getDb();
  const [owned, shared] = await Promise.all([
    db.collection('collabSheets').where('ownerId', '==', userId).where('active', '==', true).limit(40).get(),
    db.collection('collabSheets').where('memberIds', 'array-contains', userId).limit(60).get(),
  ]);
  const map = new Map<string, CollabSheetDoc>();
  for (const d of [...owned.docs, ...shared.docs]) {
    const row = asCollab(d.id, d.data());
    if (row && row.active) map.set(row.id, row);
  }
  return [...map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Refresh legacy/stale member snapshots from live account names and subscription tiers. */
export async function refreshCollabMemberProfiles(
  collabId: string,
  requestingUserId: string
): Promise<CollabSheetDoc> {
  const sheet = await getCollabSheet(collabId);
  if (!sheet || !sheet.active) throw new Error('Collab Sheet not found.');
  assertMember(sheet, requestingUserId);

  const activeMemberIds = sheet.memberIds.filter((uid) => !sheet.revoked[uid]);
  const profiles = await Promise.all(
    activeMemberIds.map(async (uid) => [
      uid,
      await memberProfile(uid, sheet.members[uid]?.name || 'Artist', sheet.members[uid]?.slug),
    ] as const)
  );
  const members = { ...sheet.members, ...Object.fromEntries(profiles) };
  const changed = profiles.some(([uid, profile]) => {
    const current = sheet.members[uid];
    return (
      current?.name !== profile.name ||
      current?.slug !== profile.slug ||
      current?.studioBadge !== profile.studioBadge
    );
  });

  if (changed) {
    const db = await getDb();
    await db.doc(`collabSheets/${collabId}`).set({ members }, { merge: true });
  }
  return changed ? ((await getCollabSheet(collabId)) as CollabSheetDoc) : sheet;
}

async function mergeOwnerTrackSections(
  ownerId: string,
  albumId: string,
  trackId: string,
  sections: TrackSection[]
) {
  const db = await getDb();
  const ref = db.doc(`users/${ownerId}/albums/${albumId}/tracks/${trackId}`);
  await ref.set({ sections, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function openCollabSheet(opts: {
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  trackId: string;
  albumId: string;
  title: string;
  albumTitle?: string;
  sections: TrackSection[];
}): Promise<CollabSheetDoc> {
  const db = await getDb();
  const ownerSnap = await db.doc(`users/${opts.ownerId}`).get();
  if (!isProUser(ownerSnap.data() as Pick<User, 'subscriptionStatus'>)) {
    throw new Error('Collab Sheet requires Studio Pro.');
  }

  const collabId = collabSheetIdFor(opts.ownerId, opts.trackId);
  const now = new Date().toISOString();
  const ownerMember = await memberProfile(opts.ownerId, opts.ownerName, opts.ownerSlug);
  const payload = {
    ownerId: opts.ownerId,
    trackId: opts.trackId,
    albumId: opts.albumId,
    title: opts.title.slice(0, 120),
    albumTitle: opts.albumTitle?.slice(0, 120),
    memberIds: [opts.ownerId],
    members: { [opts.ownerId]: ownerMember },
    revoked: {},
    active: true,
    liveSections: opts.sections,
    revision: 1,
    lastEditBy: opts.ownerId,
    lastEditAt: now,
    notifyBarBaseline: countWrittenBars(opts.sections),
    createdAt: now,
    updatedAt: now,
  };

  await db.doc(`collabSheets/${collabId}`).set(payload, { merge: true });
  await db.doc(`users/${opts.ownerId}/albums/${opts.albumId}/tracks/${opts.trackId}`).set(
    { collabSheetId: collabId },
    { merge: true }
  );

  return (await getCollabSheet(collabId)) as CollabSheetDoc;
}

export async function inviteToCollabSheet(opts: {
  collabId: string;
  ownerId: string;
  peerId: string;
  ownerName: string;
  peerName?: string;
}): Promise<CollabSheetDoc> {
  if (opts.ownerId === opts.peerId) throw new Error('That is you.');
  const sheet = await getCollabSheet(opts.collabId);
  if (!sheet || !sheet.active) throw new Error('Collab Sheet not found.');
  if (sheet.ownerId !== opts.ownerId) throw new Error('Only the sheet owner can invite collaborators.');
  if (sheet.revoked[opts.peerId]) throw new Error('Access was revoked — re-invite from Collab Sheet settings.');

  const friends = await areFriends(opts.ownerId, opts.peerId);
  if (!friends) throw new Error('You can only share Collab Sheets with friends on AKAsheet.');

  const db = await getDb();
  const peerMember = await memberProfile(opts.peerId, opts.peerName || 'Artist');
  const now = new Date().toISOString();
  const memberIds = sheet.memberIds.includes(opts.peerId)
    ? sheet.memberIds
    : [...sheet.memberIds, opts.peerId];

  await db.doc(`collabSheets/${opts.collabId}`).set(
    {
      memberIds,
      [`members.${opts.peerId}`]: peerMember,
      [`revoked.${opts.peerId}`]: false,
      updatedAt: now,
    },
    { merge: true }
  );

  const next = (await getCollabSheet(opts.collabId)) as CollabSheetDoc;
  const href = sheetHref(next);

  if (!sheet.memberIds.includes(opts.peerId)) {
    await emitActivityEvent({
      type: 'collab_invite',
      actorId: opts.ownerId,
      actorName: opts.ownerName,
      recipientId: opts.peerId,
      recipientName: peerMember.name,
      preview: `${opts.ownerName} shared "${sheet.title}" for live collab`,
      href,
    });
  }

  return next;
}

export async function revokeCollabAccess(opts: {
  collabId: string;
  ownerId: string;
  peerId: string;
}): Promise<CollabSheetDoc> {
  const sheet = await getCollabSheet(opts.collabId);
  if (!sheet) throw new Error('Collab Sheet not found.');
  if (sheet.ownerId !== opts.ownerId) throw new Error('Only the sheet owner can revoke access.');
  if (opts.peerId === opts.ownerId) throw new Error('You cannot revoke yourself.');

  const db = await getDb();
  const now = new Date().toISOString();
  await db.doc(`collabSheets/${opts.collabId}`).set(
    {
      [`revoked.${opts.peerId}`]: true,
      updatedAt: now,
    },
    { merge: true }
  );
  return (await getCollabSheet(opts.collabId)) as CollabSheetDoc;
}

export async function syncCollabSections(opts: {
  collabId: string;
  userId: string;
  userName: string;
  sections: TrackSection[];
  revision: number;
  summary?: string;
}): Promise<{ sheet: CollabSheetDoc; applied: boolean }> {
  const sheet = await getCollabSheet(opts.collabId);
  if (!sheet || !sheet.active) throw new Error('Collab Sheet not found.');
  assertMember(sheet, opts.userId);

  const db = await getDb();
  const now = new Date().toISOString();
  const incomingRevision = Math.max(0, Math.floor(opts.revision));
  const applied = incomingRevision > sheet.revision;

  if (!applied) {
    return { sheet, applied: false };
  }

  const barCount = countWrittenBars(opts.sections);
  const summary =
    opts.summary?.trim().slice(0, 160) ||
    (barCount > countWrittenBars(sheet.liveSections)
      ? `Added bars on "${sheet.title}"`
      : `Updated "${sheet.title}"`);

  await db.doc(`collabSheets/${opts.collabId}`).set(
    {
      liveSections: opts.sections,
      revision: incomingRevision,
      lastEditBy: opts.userId,
      lastEditAt: now,
      lastEditSummary: summary,
      updatedAt: now,
    },
    { merge: true }
  );

  if (sheet.ownerId === opts.userId || opts.userId !== sheet.ownerId) {
    await mergeOwnerTrackSections(sheet.ownerId, sheet.albumId, sheet.trackId, opts.sections);
  }

  const next = (await getCollabSheet(opts.collabId)) as CollabSheetDoc;

  const barDelta = barCount - next.notifyBarBaseline;
  const shouldNotify =
    barDelta >= COLLAB_EDIT_NOTIFY_BAR_DELTA ||
    (opts.summary?.toLowerCase().includes('structure') ?? false);

  if (shouldNotify) {
    await db.doc(`collabSheets/${opts.collabId}`).set({ notifyBarBaseline: barCount }, { merge: true });
    for (const uid of next.memberIds) {
      if (uid === opts.userId || next.revoked[uid]) continue;
      await emitActivityEvent({
        type: 'collab_edit',
        actorId: opts.userId,
        actorName: opts.userName,
        recipientId: uid,
        recipientName: next.members[uid]?.name || 'Artist',
        preview: summary,
        href: sheetHref(next),
      });
    }
  }

  return { sheet: next, applied: true };
}

export async function sendCollabMessage(opts: {
  collabId: string;
  userId: string;
  userName: string;
  text: string;
  targetUserId?: string;
  clientId?: string;
}): Promise<CollabMessage> {
  const text = opts.text.trim().slice(0, COLLAB_MESSAGE_MAX_CHARS);
  if (!text) throw new Error('Write a message first.');

  const sheet = await getCollabSheet(opts.collabId);
  if (!sheet || !sheet.active) throw new Error('Collab Sheet not found.');
  assertMember(sheet, opts.userId);
  if (opts.targetUserId) {
    if (opts.targetUserId === opts.userId) throw new Error('That is you.');
    if (!sheet.memberIds.includes(opts.targetUserId) || sheet.revoked[opts.targetUserId]) {
      throw new Error('They are not on this Collab Sheet.');
    }
  }

  const db = await getDb();
  const msgId = chronoId();
  const now = new Date().toISOString();
  const msg: CollabMessage = {
    id: msgId,
    senderId: opts.userId,
    senderName: opts.userName.slice(0, 80),
    text,
    createdAt: now,
    ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
    ...(opts.clientId ? { clientId: opts.clientId } : {}),
  };

  await db.doc(`collabSheets/${opts.collabId}/messages/${msgId}`).set(msg);
  await db.doc(`collabSheets/${opts.collabId}`).set({ updatedAt: now }, { merge: true });

  const href = sheetHref(sheet);
  const recipients = opts.targetUserId
    ? [opts.targetUserId]
    : sheet.memberIds.filter((uid) => uid !== opts.userId && !sheet.revoked[uid]);

  for (const recipientId of recipients) {
    await emitActivityEvent({
      type: 'collab_message',
      actorId: opts.userId,
      actorName: opts.userName,
      recipientId,
      recipientName: sheet.members[recipientId]?.name || 'Artist',
      preview: text.slice(0, 120),
      href,
    });
  }

  return msg;
}

export async function closeCollabSheet(opts: { collabId: string; ownerId: string }): Promise<void> {
  const sheet = await getCollabSheet(opts.collabId);
  if (!sheet) return;
  if (sheet.ownerId !== opts.ownerId) throw new Error('Only the sheet owner can close Collab Sheet.');

  const db = await getDb();
  const now = new Date().toISOString();
  await db.doc(`collabSheets/${opts.collabId}`).set({ active: false, updatedAt: now }, { merge: true });
  await db.doc(`users/${sheet.ownerId}/albums/${sheet.albumId}/tracks/${sheet.trackId}`).set(
    { collabSheetId: FieldValue.delete() },
    { merge: true }
  );
}
