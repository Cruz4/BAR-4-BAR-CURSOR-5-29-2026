'use client';

import { auth } from '@/lib/firebase/client/firebase';
import {
  DOOR_PRESENCE_HEARTBEAT_MS,
  type DoorKnockQuota,
} from '@/lib/door-knock';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchDoorKnockQuota(
  targetUserId: string
): Promise<DoorKnockQuota | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const params = new URLSearchParams({ userId: user.uid, targetUserId });
  const res = await fetch(`/api/door-knock?${params}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.quota as DoorKnockQuota;
}

export async function knockArtistHomeDoorClient(input: {
  targetUserId: string;
  targetName: string;
  targetSlug?: string;
  knockerName: string;
  knockerSlug?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  quota?: DoorKnockQuota;
  live?: boolean;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const res = await fetch('/api/door-knock', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'knock',
      userId: user.uid,
      ...input,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || 'Knock failed.', quota: data.quota };
  }
  return data;
}

export type DeliveredDoorKnocker = {
  name: string;
  slug?: string;
  activityId?: string;
  createdAt?: string;
};

export async function deliverDoorKnocksAtHome(): Promise<{
  delivered: number;
  knockerNames: string[];
  knockers: DeliveredDoorKnocker[];
}> {
  const user = auth.currentUser;
  if (!user) return { delivered: 0, knockerNames: [], knockers: [] };
  const res = await fetch('/api/door-knock', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'deliver', userId: user.uid }),
  });
  if (!res.ok) return { delivered: 0, knockerNames: [], knockers: [] };
  const data = await res.json();
  const knockers = Array.isArray(data.knockers)
    ? (data.knockers as DeliveredDoorKnocker[]).filter((k) => k && typeof k.name === 'string')
    : [];
  return {
    delivered: Number(data.delivered) || 0,
    knockerNames: Array.isArray(data.knockerNames) ? data.knockerNames : [],
    knockers,
  };
}

export async function pingDoorPresence(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await fetch('/api/door-knock', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'presence', userId: user.uid }),
  }).catch(() => undefined);
}

export async function dismissDoorKnockLiveClient(knockId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await fetch('/api/door-knock', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'dismiss-live', userId: user.uid, knockId }),
  }).catch(() => undefined);
}

export function startDoorPresenceHeartbeat(): () => void {
  void pingDoorPresence();
  const id = window.setInterval(() => void pingDoorPresence(), DOOR_PRESENCE_HEARTBEAT_MS);
  return () => window.clearInterval(id);
}

export type DoorKnockLiveEvent = {
  knockId: string;
  knockerId: string;
  knockerName: string;
  knockerSlug?: string;
  activityId?: string;
  createdAt: string;
};
