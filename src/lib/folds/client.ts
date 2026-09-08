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
import {
  asUnreadMap,
  type FoldBar,
  type FoldBarReply,
  type FoldDoc,
  type FoldPresence,
} from '@/lib/folds/types';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function foldFromData(id: string, data: Record<string, unknown>): FoldDoc {
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String) : [];
  return {
    id,
    memberIds: [memberIds[0] || '', memberIds[1] || ''],
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
        ? (data.deletedFor as Record<string, boolean>)
        : {},
    foldedBack:
      data.foldedBack && typeof data.foldedBack === 'object'
        ? (data.foldedBack as Record<string, boolean>)
        : {},
    lastReadAt:
      data.lastReadAt && typeof data.lastReadAt === 'object'
        ? (data.lastReadAt as Record<string, string>)
        : {},
    barCount: typeof data.barCount === 'number' ? data.barCount : 0,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  };
}

function barFromData(id: string, data: Record<string, unknown>): FoldBar {
  const reply = data.replyTo && typeof data.replyTo === 'object' ? (data.replyTo as Record<string, unknown>) : null;
  return {
    id,
    senderId: String(data.senderId || ''),
    text: String(data.text || ''),
    createdAt: String(data.createdAt || ''),
    clientId: typeof data.clientId === 'string' ? data.clientId : undefined,
    replyTo:
      reply && typeof reply.barId === 'string'
        ? {
            barId: reply.barId,
            text: String(reply.text || ''),
            senderId: String(reply.senderId || ''),
          }
        : undefined,
  };
}

/** Live inbox — always a snapshot so a passed bar lands without refresh. */
export function subscribeFolds(
  userId: string,
  onNext: (folds: FoldDoc[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(
    collection(db, 'folds'),
    where('memberIds', 'array-contains', userId),
    orderBy('lastAt', 'desc'),
    limitTo(80)
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => foldFromData(d.id, d.data() as Record<string, unknown>))),
    (err) => onError?.(err)
  );
}

export function subscribeFoldBars(
  foldId: string,
  onNext: (bars: FoldBar[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, 'folds', foldId, 'bars'), orderBy('createdAt', 'asc'), limitTo(200));
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => barFromData(d.id, d.data() as Record<string, unknown>))),
    (err) => onError?.(err)
  );
}

export function subscribeFoldDoc(
  foldId: string,
  onNext: (fold: FoldDoc | null) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    doc(db, 'folds', foldId),
    (snap) => onNext(snap.exists() ? foldFromData(snap.id, snap.data() as Record<string, unknown>) : null),
    (err) => onError?.(err)
  );
}

export function subscribePeerPresence(
  foldId: string,
  peerId: string,
  onNext: (presence: FoldPresence | null) => void
): () => void {
  return onSnapshot(doc(db, 'folds', foldId, 'presence', peerId), (snap) => {
    if (!snap.exists()) {
      onNext(null);
      return;
    }
    const data = snap.data() as Record<string, unknown>;
    onNext({
      viewing: data.viewing === true,
      typing: data.typing === true,
      at: String(data.at || ''),
    });
  });
}

export async function writeFoldPresence(foldId: string, presence: Omit<FoldPresence, 'at'>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, 'folds', foldId, 'presence', user.uid), {
    viewing: Boolean(presence.viewing),
    typing: Boolean(presence.typing),
    at: new Date().toISOString(),
  });
}

export async function passBarClient(opts: {
  peerId: string;
  text: string;
  senderName: string;
  senderSlug?: string;
  clientId?: string;
  replyTo?: FoldBarReply;
}): Promise<{ fold: FoldDoc; bar: FoldBar }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const res = await fetch('/api/folds', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'pass',
      userId: user.uid,
      peerId: opts.peerId,
      text: opts.text,
      senderName: opts.senderName,
      ...(opts.senderSlug ? { senderSlug: opts.senderSlug } : {}),
      ...(opts.clientId ? { clientId: opts.clientId } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { fold?: FoldDoc; bar?: FoldBar; error?: string };
  if (!res.ok || !data.fold || !data.bar) throw new Error(data.error || 'Could not send');
  return { fold: data.fold, bar: data.bar };
}

async function foldAction(
  action: 'read' | 'unread' | 'accept' | 'decline' | 'delete',
  foldId: string
): Promise<FoldDoc> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const res = await fetch('/api/folds', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action, userId: user.uid, foldId }),
  });
  const data = (await res.json().catch(() => ({}))) as { fold?: FoldDoc; error?: string };
  if (!res.ok || !data.fold) throw new Error(data.error || 'Could not update');
  return data.fold;
}

export const markFoldReadClient = (foldId: string) => foldAction('read', foldId);
export const foldBackClient = (foldId: string) => foldAction('unread', foldId);

async function foldBulkAction(action: 'read_all' | 'unread_all'): Promise<number> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const res = await fetch('/api/folds', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action, userId: user.uid }),
  });
  const data = (await res.json().catch(() => ({}))) as { marked?: number; error?: string };
  if (!res.ok) throw new Error(data.error || 'Could not update');
  return typeof data.marked === 'number' ? data.marked : 0;
}

export const markAllFoldsReadClient = () => foldBulkAction('read_all');
export const markAllFoldsUnreadClient = () => foldBulkAction('unread_all');
export const acceptFoldClient = (foldId: string) => foldAction('accept', foldId);
export const declineFoldClient = (foldId: string) => foldAction('decline', foldId);
export const deleteFoldFromInboxClient = (foldId: string) => foldAction('delete', foldId);
