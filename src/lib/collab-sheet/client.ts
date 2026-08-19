'use client';

import {
  collection,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client/firebase';
import type { TrackSection } from '@/lib/types';
import {
  type CollabMessage,
  type CollabPresence,
  type CollabSheetDoc,
} from '@/lib/collab-sheet/types';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function sheetFromData(id: string, data: Record<string, unknown>): CollabSheetDoc {
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String) : [];
  return {
    id,
    ownerId: String(data.ownerId || ''),
    trackId: String(data.trackId || ''),
    albumId: String(data.albumId || ''),
    title: String(data.title || 'Untitled'),
    albumTitle: typeof data.albumTitle === 'string' ? data.albumTitle : undefined,
    memberIds,
    members: (data.members && typeof data.members === 'object' ? data.members : {}) as CollabSheetDoc['members'],
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

function messageFromData(id: string, data: Record<string, unknown>): CollabMessage {
  return {
    id,
    senderId: String(data.senderId || ''),
    senderName: String(data.senderName || 'Artist'),
    text: String(data.text || ''),
    createdAt: String(data.createdAt || ''),
    targetUserId: typeof data.targetUserId === 'string' ? data.targetUserId : undefined,
    clientId: typeof data.clientId === 'string' ? data.clientId : undefined,
  };
}

export function subscribeCollabSheet(
  collabId: string,
  onNext: (sheet: CollabSheetDoc | null) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    doc(db, 'collabSheets', collabId),
    (snap) => onNext(snap.exists() ? sheetFromData(snap.id, snap.data() as Record<string, unknown>) : null),
    (err) => onError?.(err)
  );
}

export function subscribeCollabMessages(
  collabId: string,
  onNext: (messages: CollabMessage[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(
    collection(db, 'collabSheets', collabId, 'messages'),
    orderBy('createdAt', 'asc'),
    limitTo(200)
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => messageFromData(d.id, d.data() as Record<string, unknown>))),
    (err) => onError?.(err)
  );
}

export function subscribeCollabPresence(
  collabId: string,
  onNext: (presence: Record<string, CollabPresence>) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, 'collabSheets', collabId, 'presence'),
    (snap) => {
      const map: Record<string, CollabPresence> = {};
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        map[d.id] = {
          viewing: data.viewing === true,
          at: String(data.at || ''),
          name: typeof data.name === 'string' ? data.name : undefined,
        };
      }
      onNext(map);
    },
    (err) => onError?.(err)
  );
}

export async function writeCollabPresence(collabId: string, userId: string, name: string): Promise<void> {
  await setDoc(
    doc(db, 'collabSheets', collabId, 'presence', userId),
    { viewing: true, at: new Date().toISOString(), name: name.slice(0, 80) },
    { merge: true }
  );
}

export function subscribeUserCollabSheets(
  userId: string,
  onNext: (sheets: CollabSheetDoc[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(
    collection(db, 'collabSheets'),
    where('memberIds', 'array-contains', userId),
    where('active', '==', true),
    limitTo(40)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => sheetFromData(d.id, d.data() as Record<string, unknown>))
        .filter((s) => s.active && !s.revoked[userId]);
      onNext(rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    },
    (err) => onError?.(err)
  );
}

export async function collabSheetApi(body: Record<string, unknown>) {
  const headers = await authHeaders();
  const res = await fetch('/api/collab-sheet', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Collab Sheet request failed.');
  return data;
}

export async function openCollabSheetClient(opts: {
  userId: string;
  ownerName: string;
  ownerSlug?: string;
  trackId: string;
  albumId: string;
  title: string;
  albumTitle?: string;
  sections: TrackSection[];
}) {
  return collabSheetApi({
    userId: opts.userId,
    action: 'open',
    trackId: opts.trackId,
    albumId: opts.albumId,
    title: opts.title,
    albumTitle: opts.albumTitle,
    ownerName: opts.ownerName,
    ownerSlug: opts.ownerSlug,
    sections: opts.sections,
  });
}

export async function inviteCollabClient(opts: {
  userId: string;
  collabId: string;
  peerId: string;
  ownerName: string;
  peerName?: string;
}) {
  return collabSheetApi({ ...opts, action: 'invite' });
}

export async function revokeCollabClient(opts: { userId: string; collabId: string; peerId: string }) {
  return collabSheetApi({ ...opts, action: 'revoke' });
}

export async function syncCollabClient(opts: {
  userId: string;
  userName: string;
  collabId: string;
  sections: TrackSection[];
  revision: number;
  summary?: string;
}) {
  return collabSheetApi({ ...opts, action: 'sync' });
}

export async function sendCollabMessageClient(opts: {
  userId: string;
  userName: string;
  collabId: string;
  text: string;
  targetUserId?: string;
  clientId?: string;
}) {
  return collabSheetApi({ ...opts, action: 'message' });
}

export async function closeCollabClient(opts: { userId: string; collabId: string }) {
  return collabSheetApi({ ...opts, action: 'close' });
}

export async function listCollabSheetsClient(userId: string) {
  const headers = await authHeaders();
  const res = await fetch(`/api/collab-sheet?userId=${encodeURIComponent(userId)}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load Collab Sheets.');
  return data.sheets as CollabSheetDoc[];
}
