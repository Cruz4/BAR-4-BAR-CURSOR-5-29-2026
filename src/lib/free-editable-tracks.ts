'use client';

import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import type { Album } from '@/lib/types';
import { FREE_TRACK_LIMIT } from '@/lib/subscription';
import {
  computeRotatedFreeEditableTrackIds,
  type TierUserLike,
} from '@/lib/tier-limits';

export async function saveFreeEditableTrackSelection(userId: string, trackIds: string[]) {
  await setDoc(
    doc(db, 'users', userId),
    {
      freeEditableTrackIds: trackIds.slice(0, FREE_TRACK_LIMIT),
      freeEditableSelectionAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function persistFreeEditableTrackIds(userId: string, trackIds: string[]) {
  await setDoc(
    doc(db, 'users', userId),
    { freeEditableTrackIds: trackIds.slice(0, FREE_TRACK_LIMIT) },
    { merge: true }
  );
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
