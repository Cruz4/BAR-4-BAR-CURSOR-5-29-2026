import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

/** Unique people who opened an Artist Home. Owner views never count. */
export async function recordProfileView(
  db: Firestore,
  input: {
    slug: string;
    ownerId: string;
    viewerId?: string | null;
    guestId?: string | null;
  }
): Promise<{ counted: boolean; profileViewCount?: number }> {
  const slug = input.slug.trim().slice(0, 80);
  const ownerId = input.ownerId.trim();
  if (!slug || !ownerId) return { counted: false };

  const uid = input.viewerId?.trim() || '';
  if (uid && uid === ownerId) return { counted: false };

  const guest = (input.guestId || '').trim().toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 64);
  const tickId = (uid ? `u_${uid}` : guest.length >= 8 ? `g_${guest}` : '').slice(0, 120);
  if (!tickId) return { counted: false };

  const profileRef = db.doc(`publicProfiles/${slug}`);
  const tickRef = profileRef.collection('profileViewTicks').doc(tickId);
  const tickSnap = await tickRef.get();
  const profileSnap = await profileRef.get();
  const data = profileSnap.data() || {};
  const existing = Number(data.profileViewCount);

  if (tickSnap.exists) {
    return {
      counted: false,
      ...(Number.isFinite(existing) && existing > 0 ? { profileViewCount: existing } : {}),
    };
  }

  const nowIso = new Date().toISOString();
  const batch = db.batch();
  batch.set(
    profileRef,
    {
      profileViewCount: FieldValue.increment(1),
      profileViewCountUpdatedAt: nowIso,
    },
    { merge: true }
  );
  batch.set(tickRef, {
    at: nowIso,
    viewerId: uid || null,
    guestId: uid ? null : guest || null,
  });
  await batch.commit();

  const after = Number.isFinite(existing) && existing > 0 ? existing : 0;
  return { counted: true, profileViewCount: after + 1 };
}

export function readProfileViewCount(data: Record<string, unknown> | undefined): number {
  const n = Number(data?.profileViewCount);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
