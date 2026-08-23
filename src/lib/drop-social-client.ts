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
import {
  requireLiveProfileForPosting,
  type PostComment,
} from '@/lib/profile/social-client';
import {
  deletePostImageStorage,
  parseImageStoragePath,
  uploadPostImage,
  wallImageDropCommentPath,
  type PendingPostImage,
} from '@/lib/profile/post-images';
import { notifyLoveReward } from '@/lib/profile/love-reward-client';

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
  notifyLoveReward({ shareId });
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
  image?: PendingPostImage,
  opts?: {
    parentCommentId?: string;
    recipientId?: string;
    recipientName?: string;
  }
): Promise<PostComment> {
  const user = requireUser();
  const liveProfile = await requireLiveProfileForPosting(user.uid);
  const clean = text.trim().slice(0, MAX_COMMENT_TEXT);
  if (!clean && !image) throw new Error('Comment is empty.');
  const parentCommentId = opts?.parentCommentId?.trim().slice(0, 80) || undefined;
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
    authorSlug: liveProfile.slug,
    text: clean,
    createdAt: new Date().toISOString(),
    ...(parentCommentId ? { parentCommentId } : {}),
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
    ...(opts?.recipientId ? { recipientId: opts.recipientId } : {}),
    ...(opts?.recipientName ? { recipientName: opts.recipientName } : {}),
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
        const parentCommentId =
          typeof data.parentCommentId === 'string' ? data.parentCommentId : undefined;
        return {
          id: d.id,
          authorId: String(data.authorId || ''),
          authorName: String(data.authorName || 'Artist'),
          authorSlug: typeof data.authorSlug === 'string' ? data.authorSlug : undefined,
          text: String(data.text || ''),
          createdAt: String(data.createdAt || ''),
          ...(parentCommentId ? { parentCommentId } : {}),
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

export async function deleteDropComment(shareId: string, commentId: string): Promise<void> {
  requireUser();
  try {
    const snap = await getDoc(doc(db, 'shares', shareId, 'comments', commentId));
    if (snap.exists()) {
      const imageStoragePath = parseImageStoragePath(snap.data().imageStoragePath);
      if (imageStoragePath) await deletePostImageStorage(imageStoragePath);
    }
  } catch {
    // Still remove the comment if an attached image cannot be read or deleted.
  }
  await deleteDoc(doc(db, 'shares', shareId, 'comments', commentId));
}

export async function fetchDropCommentCount(shareId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'shares', shareId, 'comments'));
    return snap.data().count;
  } catch {
    return 0;
  }
}

export async function likeDropComment(
  shareId: string,
  commentId: string,
  actor?: { name?: string; slug?: string }
): Promise<void> {
  const user = requireUser();
  await setDoc(doc(db, 'shares', shareId, 'comments', commentId, 'likes', user.uid), {
    createdAt: new Date().toISOString(),
  });
  notifyLoveReward({ shareId, commentId });
}

export async function unlikeDropComment(shareId: string, commentId: string): Promise<void> {
  const user = requireUser();
  await deleteDoc(doc(db, 'shares', shareId, 'comments', commentId, 'likes', user.uid));
}

export async function fetchDropCommentLikeStates(
  shareId: string,
  commentIds: string[]
): Promise<Record<string, { count: number; liked: boolean }>> {
  const user = auth.currentUser;
  const unique = [...new Set(commentIds.filter(Boolean))];
  if (!unique.length) return {};
  const out: Record<string, { count: number; liked: boolean }> = {};
  await Promise.all(
    unique.map(async (commentId) => {
      try {
        const [countSnap, likedSnap] = await Promise.all([
          getCountFromServer(collection(db, 'shares', shareId, 'comments', commentId, 'likes')),
          user
            ? getDoc(doc(db, 'shares', shareId, 'comments', commentId, 'likes', user.uid))
            : Promise.resolve(null),
        ]);
        out[commentId] = {
          count: countSnap.data().count,
          liked: likedSnap?.exists() ?? false,
        };
      } catch {
        out[commentId] = { count: 0, liked: false };
      }
    })
  );
  return out;
}
