'use client';

import type { Album } from '@/lib/types';
import { auth } from '@/lib/firebase/client/firebase';
import {
  computeRotatedFreeEditableTrackIds,
  type TierUserLike,
} from '@/lib/tier-limits';

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  return { token, uid: user.uid };
}

async function postFreeEditableTracks(body: {
  userId: string;
  trackIds: string[];
  setSelectionTimestamp?: boolean;
}) {
  const { token } = await authHeaders();
  const res = await fetch('/api/account/free-editable-tracks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Failed to save track selection');
  }
  return res.json();
}

export async function saveFreeEditableTrackSelection(userId: string, trackIds: string[]) {
  return postFreeEditableTracks({ userId, trackIds, setSelectionTimestamp: true });
}

export async function persistFreeEditableTrackIds(userId: string, trackIds: string[]) {
  return postFreeEditableTracks({ userId, trackIds, setSelectionTimestamp: false });
}

export async function rotateFreeEditableAfterDelete(
  userId: string,
  user: TierUserLike,
  albums: Album[],
  deletedTrackId: string
) {
  const nextIds = computeRotatedFreeEditableTrackIds(user, albums, deletedTrackId);
  if (!nextIds) return;
  await persistFreeEditableTrackIds(userId, nextIds);
}
