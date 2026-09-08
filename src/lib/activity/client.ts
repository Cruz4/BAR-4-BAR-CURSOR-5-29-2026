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
  type ActivityFeedPage,
  type ActivityPrefs,
  type ActivitySummary,
  type ActivityType,
} from '@/lib/activity/types';
import {
  boothMemoryFromTrack,
  clearLocalBoothMemoryForTrack,
  craftToBoothMemory,
  readLocalBoothMemory,
  visibleBoothMemory,
  type BoothMemory,
} from '@/lib/scene/booth-memory';
import { clearLastWorkedTrack, isTrackEditorPath } from '@/lib/studio-tips-session';
import type { Track } from '@/lib/types';

export type EmitActivityClientInput = {
  type: ActivityType;
  actorName: string;
  actorSlug?: string;
  recipientId?: string;
  recipientName?: string;
  postId?: string;
  commentId?: string;
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
    commentId: typeof data.commentId === 'string' ? data.commentId : undefined,
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
  return (await fetchActivityFeedPage(direction, max)).events;
}

export async function fetchActivityFeedPage(
  direction: ActivityDirection,
  max = 60,
  cursor?: string | null
): Promise<ActivityFeedPage> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required to load activity history.');
  const headers = await authHeaders();
  if (!headers) throw new Error('Your session is still restoring. Please try again.');
  const params = new URLSearchParams({
    userId: user.uid,
    direction,
    limit: String(Math.min(100, Math.max(1, max))),
  });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`/api/activity/feed?${params.toString()}`, {
    headers,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load activity history.');
  return {
    events: Array.isArray(data.events)
      ? data.events.filter((event: unknown): event is ActivityEvent => Boolean(event && typeof event === 'object'))
      : [],
    nextCursor: typeof data.nextCursor === 'string' ? data.nextCursor : null,
  };
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
  return (await fetchActivitySummary()).unreadReceived;
}

export async function fetchActivitySummary(): Promise<ActivitySummary> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return { unreadReceived: 0, unreadHouseReleases: 0, updatedAt: '' };
  try {
    const headers = await authHeaders();
    if (!headers) return { unreadReceived: 0, unreadHouseReleases: 0, updatedAt: '' };
    const response = await fetch(
      `/api/activity/feed?userId=${encodeURIComponent(user.uid)}&summary=1`,
      { headers, cache: 'no-store' }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not load activity summary.');
    return {
      unreadReceived:
        typeof data.unreadReceived === 'number' ? Math.max(0, Math.floor(data.unreadReceived)) : 0,
      unreadHouseReleases:
        typeof data.unreadHouseReleases === 'number'
          ? Math.max(0, Math.floor(data.unreadHouseReleases))
          : 0,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    };
  } catch {
    return { unreadReceived: 0, unreadHouseReleases: 0, updatedAt: '' };
  }
}

export async function markActivityEventsRead(eventIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user || !eventIds.length) return;
  const headers = await authHeaders();
  if (!headers) return;
  const response = await fetch('/api/activity/read', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.uid, eventIds }),
  });
  if (!response.ok) throw new Error('Failed to mark activity read');
}

export async function markActivityEventsUnread(eventIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user || !eventIds.length) return;
  const headers = await authHeaders();
  if (!headers) return;
  const response = await fetch('/api/activity/read', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.uid, eventIds, unread: true }),
  });
  if (!response.ok) throw new Error('Failed to mark activity unread');
}

export async function markAllActivityEventsRead(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const headers = await authHeaders();
  if (!headers) return;
  const response = await fetch('/api/activity/read', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.uid, all: true }),
  });
  if (!response.ok) throw new Error('Failed to mark all activity read');
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
      relationships: data.relationships !== false,
      postLoves: data.postLoves !== false,
      postReplies: data.postReplies !== false,
      dnaImports: data.dnaImports !== false,
      lockCasts: data.lockCasts !== false,
      craftReminders: data.craftReminders !== false,
      foldBars: data.foldBars !== false,
      collabSheets: data.collabSheets !== false,
      firstDrops: data.firstDrops !== false,
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
  const ref = doc(db, 'users', user.uid, 'activityMeta', 'push');
  const snap = await getDoc(ref);
  const existing = snap.data()?.devices;
  type Device = { token: string; updatedAt: string; userAgent: string };
  const devices: Device[] = Array.isArray(existing)
    ? existing.filter((row): row is Device =>
        Boolean(row && typeof row === 'object' && typeof (row as Device).token === 'string')
      )
    : [];
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : '';
  const now = new Date().toISOString();
  const nextDevices = fcmToken
    ? [...devices.filter((row) => row.token !== fcmToken), { token: fcmToken, updatedAt: now, userAgent }].slice(-8)
    : devices;
  await setDoc(
    ref,
    {
      fcmToken: fcmToken || devices[devices.length - 1]?.token || null,
      devices: nextDevices,
      updatedAt: now,
      userAgent,
    },
    { merge: true }
  );
}

/** Persist last sheet so Activity can say “your verse is still open.” */
export type CraftResumePatch = {
  title?: string;
  albumTitle?: string;
  lastBarText?: string;
  barCount?: number;
};

export function persistCraftResume(
  path: string,
  extras?: CraftResumePatch | string,
  expectedUserId?: string
): void {
  void (async () => {
    const user = auth.currentUser;
    if (!user || (expectedUserId && user.uid !== expectedUserId)) return;
    if (!/^\/albums\/[^/]+\/tracks\/[^/]+$/.test(path)) return;
    const patch: CraftResumePatch = typeof extras === 'string' ? { title: extras } : extras || {};
    const payload: Record<string, unknown> = {
      lastTrackPath: path,
      updatedAt: new Date().toISOString(),
    };
    if (patch.title !== undefined) {
      payload.lastTrackTitle = patch.title.trim().slice(0, 80) || null;
    }
    if (patch.albumTitle !== undefined) {
      payload.lastAlbumTitle = patch.albumTitle.trim().slice(0, 80) || null;
    }
    if (patch.lastBarText !== undefined) {
      payload.lastBarText = patch.lastBarText.trim().slice(0, 160) || null;
    }
    if (typeof patch.barCount === 'number' && Number.isFinite(patch.barCount)) {
      payload.barCount = Math.max(0, Math.round(patch.barCount));
    }
    try {
      await setDoc(doc(db, 'users', user.uid, 'activityMeta', 'craft'), payload, { merge: true });
    } catch (err) {
      console.warn('[persistCraftResume]', err);
    }
  })();
}

/** Clear this track only when it is still the current cross-device resume target. */
export async function clearCraftResume(path: string, expectedUserId?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || (expectedUserId && user.uid !== expectedUserId) || !isTrackEditorPath(path)) return;
  const craftRef = doc(db, 'users', user.uid, 'activityMeta', 'craft');
  try {
    const snap = await getDoc(craftRef);
    if (!snap.exists() || snap.data().lastTrackPath !== path) return;
    await setDoc(
      craftRef,
      {
        lastTrackPath: null,
        lastTrackTitle: null,
        lastAlbumTitle: null,
        lastBarText: null,
        barCount: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[clearCraftResume]', err);
  }
}

async function clearInvalidResume(memory: BoothMemory, userId: string): Promise<null> {
  clearLocalBoothMemoryForTrack(memory.trackPath, userId);
  clearLastWorkedTrack(memory.trackPath);
  await clearCraftResume(memory.trackPath, userId);
  return null;
}

async function verifyOwnedResume(memory: BoothMemory, userId: string): Promise<BoothMemory | null> {
  if (memory.ownerId !== userId) return clearInvalidResume(memory, userId);
  const match = memory.trackPath.match(/^\/albums\/([^/]+)\/tracks\/([^/]+)$/);
  if (!match) return clearInvalidResume(memory, userId);
  const [, albumId, trackId] = match;
  const [trackSnap, albumSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId, 'albums', albumId, 'tracks', trackId)),
    getDoc(doc(db, 'users', userId, 'albums', albumId)),
  ]);
  if (!trackSnap.exists()) return clearInvalidResume(memory, userId);
  const track = trackSnap.data() as Partial<Track>;
  if (track.status === 'complete') return clearInvalidResume(memory, userId);
  const verified = boothMemoryFromTrack({
    ownerId: userId,
    path: memory.trackPath,
    track: {
      title: typeof track.title === 'string' ? track.title : 'Untitled',
      sections: Array.isArray(track.sections) ? track.sections : [],
      status: 'in_progress',
    },
    albumTitle: albumSnap.exists() && typeof albumSnap.data().title === 'string'
      ? albumSnap.data().title
      : undefined,
  });
  return verified ? { ...verified, updatedAt: memory.updatedAt } : clearInvalidResume(memory, userId);
}

export async function fetchCraftResume(expectedUserId: string): Promise<BoothMemory | null> {
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUserId) return null;
  const local = readLocalBoothMemory(user.uid);
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'activityMeta', 'craft'));
    const remote = snap.exists()
      ? craftToBoothMemory(snap.data() as Parameters<typeof craftToBoothMemory>[0], user.uid)
      : null;
    const candidate = !remote
      ? local
      : !local
        ? remote
        : Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt)
          ? remote
          : local;
    const visible = visibleBoothMemory(candidate);
    if (!visible) return null;
    const verified = await verifyOwnedResume(visible, user.uid);
    return visibleBoothMemory(verified);
  } catch {
    // Privacy first: never display cached lyrics when ownership cannot be verified.
    return null;
  }
}
