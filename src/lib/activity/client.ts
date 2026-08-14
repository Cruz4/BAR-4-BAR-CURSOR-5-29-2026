'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client/firebase';
import {
  DEFAULT_ACTIVITY_PREFS,
  isActivityType,
  type ActivityDirection,
  type ActivityEvent,
  type ActivityPrefs,
  type ActivitySummary,
  type ActivityType,
} from '@/lib/activity/types';

export type EmitActivityClientInput = {
  type: ActivityType;
  actorName: string;
  actorSlug?: string;
  recipientId?: string;
  recipientName?: string;
  postId?: string;
  shareId?: string;
  preview?: string;
  href?: string;
};

async function authHeaders(): Promise<HeadersInit | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Fire-and-forget emit — never throws to callers of social actions. */
export function emitActivity(input: EmitActivityClientInput): void {
  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const headers = await authHeaders();
      if (!headers) return;
      await fetch('/api/activity/emit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...input,
          actorId: user.uid,
        }),
      });
    } catch (err) {
      console.warn('[emitActivity]', err);
    }
  })();
}

function eventFromDoc(id: string, data: Record<string, unknown>): ActivityEvent | null {
  if (!isActivityType(data.type)) return null;
  const direction: ActivityDirection = data.direction === 'given' ? 'given' : 'received';
  return {
    id,
    type: data.type,
    direction,
    createdAt: String(data.createdAt || ''),
    actorId: String(data.actorId || ''),
    actorName: String(data.actorName || 'Artist'),
    actorSlug: typeof data.actorSlug === 'string' ? data.actorSlug : undefined,
    targetUserId: typeof data.targetUserId === 'string' ? data.targetUserId : undefined,
    targetName: typeof data.targetName === 'string' ? data.targetName : undefined,
    targetSlug: typeof data.targetSlug === 'string' ? data.targetSlug : undefined,
    postId: typeof data.postId === 'string' ? data.postId : undefined,
    shareId: typeof data.shareId === 'string' ? data.shareId : undefined,
    lockId: typeof data.lockId === 'string' ? data.lockId : undefined,
    preview: typeof data.preview === 'string' ? data.preview : undefined,
    href: typeof data.href === 'string' ? data.href : undefined,
    readAt: typeof data.readAt === 'string' ? data.readAt : data.readAt === null ? null : undefined,
  };
}

export async function fetchActivityFeed(
  direction: ActivityDirection,
  max = 60
): Promise<ActivityEvent[]> {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', user.uid, 'activity'),
        where('direction', '==', direction),
        orderBy('createdAt', 'desc'),
        limitTo(max)
      )
    );
    return snap.docs
      .map((d) => eventFromDoc(d.id, d.data()))
      .filter((e): e is ActivityEvent => Boolean(e));
  } catch (err) {
    console.warn('[fetchActivityFeed]', err);
    return [];
  }
}

export async function fetchPendingRequestActivity(max = 40): Promise<ActivityEvent[]> {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', user.uid, 'activity'),
        where('direction', '==', 'received'),
        where('type', '==', 'friend_request'),
        orderBy('createdAt', 'desc'),
        limitTo(max)
      )
    );
    return snap.docs
      .map((d) => eventFromDoc(d.id, d.data()))
      .filter((e): e is ActivityEvent => Boolean(e));
  } catch (err) {
    console.warn('[fetchPendingRequestActivity]', err);
    return [];
  }
}

export async function fetchActivityUnreadCount(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'activityMeta', 'summary'));
    if (!snap.exists()) return 0;
    const n = snap.data()?.unreadReceived;
    return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export async function fetchActivitySummary(): Promise<ActivitySummary> {
  const user = auth.currentUser;
  if (!user) return { unreadReceived: 0, updatedAt: '' };
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'activityMeta', 'summary'));
    if (!snap.exists()) return { unreadReceived: 0, updatedAt: '' };
    const data = snap.data() || {};
    return {
      unreadReceived:
        typeof data.unreadReceived === 'number' ? Math.max(0, Math.floor(data.unreadReceived)) : 0,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    };
  } catch {
    return { unreadReceived: 0, updatedAt: '' };
  }
}

export async function markActivityEventsRead(eventIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user || !eventIds.length) return;
  const headers = await authHeaders();
  if (!headers) return;
  await fetch('/api/activity/read', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.uid, eventIds }),
  });
}

export async function markAllActivityEventsRead(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const headers = await authHeaders();
  if (!headers) return;
  await fetch('/api/activity/read', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.uid, all: true }),
  });
}

/**
 * After accept/decline: mark every inbox `friend_request` from that peer as read
 * so badge + dropdown + Activity stop treating it as pending action.
 */
export async function clearFriendRequestActivityFromPeer(fromUserId: string): Promise<string[]> {
  const peer = fromUserId.trim();
  if (!peer) return [];
  const events = await fetchPendingRequestActivity(80);
  const ids = events.filter((e) => e.actorId === peer).map((e) => e.id);
  if (ids.length) {
    try {
      await markActivityEventsRead(ids);
    } catch (err) {
      console.warn('[clearFriendRequestActivityFromPeer]', err);
    }
  }
  return ids;
}

export const FRIENDSHIP_CHANGED_EVENT = 'b4b-friendship-changed';

export type FriendshipChangedDetail = {
  friendshipId: string;
  /** The other user in the friendship (requester when you respond). */
  peerUserId?: string;
  action: 'accepted' | 'removed' | 'requested';
  /** Activity event ids cleared when resolving an incoming request. */
  clearedActivityIds?: string[];
};

/** Notify open Activity / Scene / badge UIs that a friendship changed. */
export function notifyFriendshipChanged(detail: FriendshipChangedDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FRIENDSHIP_CHANGED_EVENT, { detail }));
  try {
    // Dynamic import avoids circular deps with the alerts hook.
    void import('@/hooks/use-activity-alerts').then((m) => m.refreshActivityAlerts());
  } catch {
    /* ignore */
  }
}

export async function fetchActivityPrefs(): Promise<ActivityPrefs> {
  const user = auth.currentUser;
  if (!user) return { ...DEFAULT_ACTIVITY_PREFS };
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'activityMeta', 'prefs'));
    if (!snap.exists()) return { ...DEFAULT_ACTIVITY_PREFS };
    const data = snap.data() || {};
    return {
      ...DEFAULT_ACTIVITY_PREFS,
      pushEnabled: data.pushEnabled === true,
      friendRequests: data.friendRequests !== false,
      friendAccepted: data.friendAccepted !== false,
      postLoves: data.postLoves !== false,
      postReplies: data.postReplies !== false,
      dnaImports: data.dnaImports !== false,
      lockCasts: data.lockCasts !== false,
      craftReminders: data.craftReminders !== false,
    };
  } catch {
    return { ...DEFAULT_ACTIVITY_PREFS };
  }
}

export async function saveActivityPrefs(prefs: Partial<ActivityPrefs>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const current = await fetchActivityPrefs();
  await setDoc(
    doc(db, 'users', user.uid, 'activityMeta', 'prefs'),
    { ...current, ...prefs, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function savePushToken(fcmToken: string | null): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(
    doc(db, 'users', user.uid, 'activityMeta', 'push'),
    {
      fcmToken: fcmToken || null,
      updatedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : '',
    },
    { merge: true }
  );
}

/** Persist last sheet so Activity can say “your verse is still open.” */
export function persistCraftResume(path: string, title?: string): void {
  void (async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!/^\/albums\/[^/]+\/tracks\/[^/]+$/.test(path)) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'activityMeta', 'craft'),
        {
          lastTrackPath: path,
          lastTrackTitle: title?.trim().slice(0, 80) || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[persistCraftResume]', err);
    }
  })();
}
