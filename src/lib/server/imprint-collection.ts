import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { normalizeQuotePressConfig } from '@/lib/profile/quote-press';

export type ImprintCollectionEntry = {
  postId: string;
  savedAt: string;
  postOwnerId: string;
  postOwnerName: string;
  postOwnerSlug?: string;
};

function assertImprintPost(data: FirebaseFirestore.DocumentData | undefined): void {
  if (!data) throw new Error('Post not found.');
  if (!normalizeQuotePressConfig(data.quotePress)) throw new Error('That post is not an Imprint.');
}

export async function saveImprintToCollection(
  db: Firestore,
  userId: string,
  postId: string
): Promise<{ saved: boolean; imprintSaveCount: number }> {
  const postRef = db.doc(`posts/${postId}`);
  const collectionRef = db.doc(`users/${userId}/imprintCollection/${postId}`);
  const saveRef = db.doc(`posts/${postId}/imprintSaves/${userId}`);

  return db.runTransaction(async (tx) => {
    const [postSnap, existing] = await Promise.all([tx.get(postRef), tx.get(collectionRef)]);
    assertImprintPost(postSnap.data());
    if (existing.exists) {
      const count = Math.max(0, Math.floor(Number(postSnap.data()?.imprintSaveCount) || 0));
      return { saved: true, imprintSaveCount: count };
    }

    const post = postSnap.data() || {};
    const now = new Date().toISOString();
    tx.set(collectionRef, {
      postId,
      savedAt: now,
      postOwnerId: String(post.ownerId || ''),
      postOwnerName: String(post.ownerName || 'Artist'),
      ...(typeof post.ownerSlug === 'string' && post.ownerSlug
        ? { postOwnerSlug: post.ownerSlug }
        : {}),
    });
    tx.set(saveRef, { savedAt: now });
    tx.update(postRef, { imprintSaveCount: FieldValue.increment(1) });
    const count = Math.max(0, Math.floor(Number(post.imprintSaveCount) || 0)) + 1;
    return { saved: true, imprintSaveCount: count };
  });
}

export async function unsaveImprintFromCollection(
  db: Firestore,
  userId: string,
  postId: string
): Promise<{ saved: boolean; imprintSaveCount: number }> {
  const postRef = db.doc(`posts/${postId}`);
  const collectionRef = db.doc(`users/${userId}/imprintCollection/${postId}`);
  const saveRef = db.doc(`posts/${postId}/imprintSaves/${userId}`);

  return db.runTransaction(async (tx) => {
    const [postSnap, existing] = await Promise.all([tx.get(postRef), tx.get(collectionRef)]);
    if (!postSnap.exists) throw new Error('Post not found.');
    if (!existing.exists) {
      const count = Math.max(0, Math.floor(Number(postSnap.data()?.imprintSaveCount) || 0));
      return { saved: false, imprintSaveCount: count };
    }

    tx.delete(collectionRef);
    tx.delete(saveRef);
    const before = Math.max(0, Math.floor(Number(postSnap.data()?.imprintSaveCount) || 0));
    const next = Math.max(0, before - 1);
    tx.update(postRef, { imprintSaveCount: next });
    return { saved: false, imprintSaveCount: next };
  });
}

export async function listImprintCollection(
  db: Firestore,
  userId: string,
  limit = 500
): Promise<ImprintCollectionEntry[]> {
  const snap = await db
    .collection(`users/${userId}/imprintCollection`)
    .orderBy('savedAt', 'desc')
    .limit(Math.min(500, Math.max(1, limit)))
    .get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const postId = typeof data.postId === 'string' ? data.postId : doc.id;
      const savedAt = typeof data.savedAt === 'string' ? data.savedAt : '';
      const postOwnerId = typeof data.postOwnerId === 'string' ? data.postOwnerId : '';
      if (!postId || !savedAt || !postOwnerId) return null;
      const entry: ImprintCollectionEntry = {
        postId,
        savedAt,
        postOwnerId,
        postOwnerName: typeof data.postOwnerName === 'string' ? data.postOwnerName : 'Artist',
      };
      if (typeof data.postOwnerSlug === 'string' && data.postOwnerSlug) {
        entry.postOwnerSlug = data.postOwnerSlug;
      }
      return entry;
    })
    .filter((row): row is ImprintCollectionEntry => row !== null);
}

export async function isImprintInCollection(
  db: Firestore,
  userId: string,
  postId: string
): Promise<boolean> {
  const snap = await db.doc(`users/${userId}/imprintCollection/${postId}`).get();
  return snap.exists;
}
