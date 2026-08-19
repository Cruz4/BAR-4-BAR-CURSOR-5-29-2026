'use client';

import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as limitTo,
  query,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client/firebase';
import type { PostComment } from '@/lib/profile/social-client';
import {
  deletePostImageStorage,
  parseImageStoragePath,
  uploadPostImage,
  wallImageDropCommentPath,
  type PendingPostImage,
} from '@/lib/profile/post-images';

const MAX_COMMENT_TEXT = 500;

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to do that.');
  return user;
}

function chronoId(): string {
  return `${Date.now().toString().padStart(13, '0')}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function likeDrop(shareId: string, actor?: { name?: string; slug?: string }): Promise<void> {
  const user = requireUser();
  await setDoc(doc(db, 'shares', shareId, 'loves', user.uid), {
    createdAt: new Date().toISOString(),
  });
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'drop_loved',
    actorName: actor?.name || user.displayName || 'Artist',
    ...(actor?.slug ? { actorSlug: actor.slug } : {}),
    shareId,
  });
}

export async function unlikeDrop(shareId: string): Promise<void> {
  const user = requireUser();
  await deleteDoc(doc(db, 'shares', shareId, 'loves', user.uid));
}

export async function fetchDropLoveCount(shareId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'shares', shareId, 'loves'));
    return snap.data().count;
  } catch {
    return 0;
  }
}

export async function fetchDropLoved(shareId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, 'shares', shareId, 'loves', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function addDropComment(
  shareId: string,
  text: string,
  author: { name: string; slug?: string },
  image?: PendingPostImage
): Promise<PostComment> {
  const user = requireUser();
  const clean = text.trim().slice(0, MAX_COMMENT_TEXT);
  if (!clean && !image) throw new Error('Comment is empty.');
  const id = chronoId();
  let imageUrl: string | undefined;
  let imageStoragePath: string | undefined;
  if (image) {
    const uploaded = await uploadPostImage({
      storagePath: wallImageDropCommentPath(user.uid, shareId, id),
      image,
    });
    imageUrl = uploaded.url;
    imageStoragePath = uploaded.storagePath;
  }
  const comment: PostComment = {
    id,
    authorId: user.uid,
    authorName: author.name || user.displayName || 'Artist',
    ...(author.slug ? { authorSlug: author.slug } : {}),
    text: clean,
    createdAt: new Date().toISOString(),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageStoragePath ? { imageStoragePath } : {}),
  };
  const { id: commentId, ...data } = comment;
  try {
    await setDoc(doc(db, 'shares', shareId, 'comments', commentId), data);
  } catch (err) {
    if (imageStoragePath) await deletePostImageStorage(imageStoragePath);
    throw err;
  }
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'drop_reply',
    actorName: comment.authorName,
    ...(comment.authorSlug ? { actorSlug: comment.authorSlug } : {}),
    shareId,
    preview: (clean || (imageUrl ? 'Photo' : '')).slice(0, 120),
    commentId,
  });
  return comment;
}

export async function fetchDropComments(shareId: string, max = 50): Promise<PostComment[]> {
  try {
    const snap = await getDocs(query(collection(db, 'shares', shareId, 'comments'), limitTo(max)));
    return snap.docs
      .map((d) => {
        const data = d.data();
        const imageStoragePath = parseImageStoragePath(data.imageStoragePath);
        return {
          id: d.id,
          authorId: String(data.authorId || ''),
          authorName: String(data.authorName || 'Artist'),
          authorSlug: typeof data.authorSlug === 'string' ? data.authorSlug : undefined,
          text: String(data.text || ''),
          createdAt: String(data.createdAt || ''),
          ...(typeof data.imageUrl === 'string' && data.imageUrl.trim()
            ? { imageUrl: data.imageUrl }
            : {}),
          ...(imageStoragePath ? { imageStoragePath } : {}),
        } satisfies PostComment;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export async function fetchDropCommentCount(shareId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'shares', shareId, 'comments'));
    return snap.data().count;
  } catch {
    return 0;
  }
}
