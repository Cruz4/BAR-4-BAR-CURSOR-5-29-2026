import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

/** Unique people who saw a wall post. Owner views never count. */
export async function recordPostView(
  db: Firestore,
  input: {
    postId: string;
    viewerId?: string | null;
    guestId?: string | null;
  }
): Promise<{ counted: boolean; viewCount?: number }> {
  const postId = input.postId.trim().slice(0, 80);
  if (!postId) return { counted: false };

  const postRef = db.collection('posts').doc(postId);
  const snap = await postRef.get();
  if (!snap.exists) return { counted: false };
  const data = snap.data() || {};
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const uid = input.viewerId?.trim() || '';
  if (uid && ownerId && uid === ownerId) return { counted: false };

  const guest = (input.guestId || '').trim().toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 64);
  const tickId = (uid ? `u_${uid}` : guest.length >= 8 ? `g_${guest}` : '').slice(0, 120);
  if (!tickId) return { counted: false };

  const tickRef = postRef.collection('viewTicks').doc(tickId);
  const tickSnap = await tickRef.get();
  if (tickSnap.exists) {
    const existing = Number(data.viewCount);
    return {
      counted: false,
      ...(Number.isFinite(existing) && existing > 0 ? { viewCount: existing } : {}),
    };
  }

  const nowIso = new Date().toISOString();
  const batch = db.batch();
  batch.set(
    postRef,
    {
      viewCount: FieldValue.increment(1),
    },
    { merge: true }
  );
  batch.set(tickRef, {
    at: nowIso,
    viewerId: uid || null,
    guestId: uid ? null : guest || null,
  });
  await batch.commit();
  const after = Number(data.viewCount) || 0;
  return { counted: true, viewCount: after + 1 };
}
