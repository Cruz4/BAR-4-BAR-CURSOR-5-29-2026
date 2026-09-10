import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { IMPRINT_SHELF_MAX } from '@/lib/profile/imprint-shelf';
import { normalizeQuotePressConfig } from '@/lib/profile/quote-press';
import type { ProfilePost } from '@/lib/profile/social-client';

async function imprintCollectionIds(db: Firestore, profileUserId: string): Promise<Set<string>> {
  const snap = await db.collection(`users/${profileUserId}/imprintCollection`).get();
  return new Set(snap.docs.map((doc) => doc.id));
}

function canShowImprintOnShelf(
  data: Record<string, unknown>,
  profileUserId: string,
  collectionIds: Set<string>,
  postId: string
): boolean {
  if (!normalizeQuotePressConfig(data.quotePress)) return false;
  if (data.ownerId === profileUserId) return true;
  return collectionIds.has(postId);
}

/** Keep shelf ids that still exist and are owned or saved in the profile owner's collection. */
export async function filterValidImprintShelfPostIds(
  db: Firestore,
  profileUserId: string,
  postIds: string[]
): Promise<string[]> {
  const ids = postIds.slice(0, IMPRINT_SHELF_MAX);
  if (!ids.length) return [];
  const collectionIds = await imprintCollectionIds(db, profileUserId);
  const validated: string[] = [];
  for (const id of ids) {
    const snap = await db.doc(`posts/${id}`).get();
    if (!snap.exists) continue;
    const data = (snap.data() || {}) as Record<string, unknown>;
    if (canShowImprintOnShelf(data, profileUserId, collectionIds, id)) validated.push(id);
  }
  return validated;
}

/** Load imprint shelf posts in display order — own posts or saved collection pieces. */
export async function loadImprintShelfPosts(
  db: Firestore,
  profileUserId: string,
  postIds: string[]
): Promise<ProfilePost[]> {
  const ids = postIds.map((id) => id.trim()).filter(Boolean).slice(0, IMPRINT_SHELF_MAX);
  if (!ids.length) return [];
  const { postFromServerDoc } = await import('@/lib/server/public-post');
  const collectionIds = await imprintCollectionIds(db, profileUserId);
  const byId = new Map<string, ProfilePost>();
  for (const id of ids) {
    try {
      const snap = await db.doc(`posts/${id}`).get();
      if (!snap.exists) continue;
      const data = (snap.data() || {}) as Record<string, unknown>;
      if (!canShowImprintOnShelf(data, profileUserId, collectionIds, id)) continue;
      byId.set(id, postFromServerDoc(snap.id, data));
    } catch {
      /* skip missing imprint */
    }
  }
  return ids.map((id) => byId.get(id)).filter((post): post is ProfilePost => Boolean(post));
}
