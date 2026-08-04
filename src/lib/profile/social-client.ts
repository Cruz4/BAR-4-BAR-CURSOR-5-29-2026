'use client';

/**
 * Client SDK data layer for Artist Home social features:
 * posts (wall/feed), likes, comments, friendships, guestbook.
 *
 * Query shapes are deliberately index-free:
 * - Post/comment ids are time-encoded so equality-only queries return them
 *   already ordered (posts newest-first, comments chronological).
 * - Friendships use array-contains + equality, which Firestore serves by
 *   merging single-field indexes.
 */

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
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client/firebase';
import { parseEmbedUrl, type EmbedProvider } from '@/lib/profile/embeds';

export type ProfilePost = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  text: string;
  embedUrl?: string;
  embedProvider?: EmbedProvider;
  createdAt: string;
};

export type PostComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorSlug?: string;
  text: string;
  createdAt: string;
};

export type FriendshipStatus = 'pending' | 'accepted';

export type Friendship = {
  id: string;
  uids: [string, string];
  requestedBy: string;
  status: FriendshipStatus;
  profiles: Record<string, { name: string; slug?: string }>;
  createdAt: string;
  respondedAt?: string;
};

export type GuestbookEntry = {
  /** Doc id == author uid — one line per visitor per profile. */
  id: string;
  authorId: string;
  authorName: string;
  authorSlug?: string;
  text: string;
  createdAt: string;
};

const MAX_POST_TEXT = 1000;
const MAX_COMMENT_TEXT = 500;
const MAX_GUESTBOOK_TEXT = 240;

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to do that.');
  return user;
}

/** Fire-and-forget conversion analytics for profile social actions. */
function trackSocialEvent(
  event:
    | 'profile_post_created'
    | 'profile_friend_request'
    | 'profile_friend_accept'
    | 'profile_guestbook_signed',
  metadata: Record<string, string | number | boolean | null> = {}
): void {
  const user = auth.currentUser;
  if (!user) return;
  void user
    .getIdToken()
    .then((token) =>
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event, userId: user.uid, metadata }),
      })
    )
    .catch(() => undefined);
}

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Lexicographically DESC by time — newest posts first with no orderBy. */
function newestFirstId(): string {
  const inverted = (9_999_999_999_999 - Date.now()).toString().padStart(13, '0');
  return `${inverted}_${rand()}`;
}

/** Lexicographically ASC by time — chronological comments with no orderBy. */
function chronoId(): string {
  return `${Date.now().toString().padStart(13, '0')}_${rand()}`;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function createPost(input: {
  text: string;
  embedUrl?: string;
  ownerName: string;
  ownerSlug?: string;
}): Promise<ProfilePost> {
  const user = requireUser();
  const text = input.text.trim().slice(0, MAX_POST_TEXT);
  const embedUrl = input.embedUrl?.trim() || undefined;
  if (!text && !embedUrl) throw new Error('Write something or add a link.');

  const parsed = parseEmbedUrl(embedUrl);
  const post: ProfilePost = {
    id: newestFirstId(),
    ownerId: user.uid,
    ownerName: input.ownerName || user.displayName || 'Artist',
    ...(input.ownerSlug ? { ownerSlug: input.ownerSlug } : {}),
    text,
    ...(embedUrl ? { embedUrl } : {}),
    ...(parsed ? { embedProvider: parsed.provider } : {}),
    createdAt: new Date().toISOString(),
  };
  const { id, ...data } = post;
  await setDoc(doc(db, 'posts', id), data);
  trackSocialEvent('profile_post_created', { hasEmbed: Boolean(embedUrl) });
  return post;
}

export async function deletePost(postId: string): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, 'posts', postId));
}

function postFromDoc(id: string, data: Record<string, unknown>): ProfilePost {
  return {
    id,
    ownerId: String(data.ownerId || ''),
    ownerName: String(data.ownerName || 'Artist'),
    ownerSlug: typeof data.ownerSlug === 'string' ? data.ownerSlug : undefined,
    text: String(data.text || ''),
    embedUrl: typeof data.embedUrl === 'string' ? data.embedUrl : undefined,
    embedProvider: data.embedProvider as EmbedProvider | undefined,
    createdAt: String(data.createdAt || ''),
  };
}

/** Wall — a single artist's posts, newest first (id-ordered). */
export async function fetchPostsByOwner(ownerId: string, max = 20): Promise<ProfilePost[]> {
  if (!ownerId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'posts'), where('ownerId', '==', ownerId), limitTo(max))
    );
    return snap.docs.map((d) => postFromDoc(d.id, d.data()));
  } catch (err) {
    console.warn('[posts]', err);
    return [];
  }
}

/** Feed — merged newest-first posts from many friends (parallel queries). */
export async function fetchPostsByOwners(ownerIds: string[], perOwner = 8): Promise<ProfilePost[]> {
  const unique = [...new Set(ownerIds)].filter(Boolean).slice(0, 60);
  const results = await Promise.all(
    unique.map((uid) => fetchPostsByOwner(uid, perOwner).catch(() => [] as ProfilePost[]))
  );
  return results
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export async function likePost(postId: string): Promise<void> {
  const user = requireUser();
  await setDoc(doc(db, 'posts', postId, 'likes', user.uid), {
    createdAt: new Date().toISOString(),
  });
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'post_love',
    actorName: user.displayName || 'Artist',
    postId,
  });
}

export async function unlikePost(postId: string): Promise<void> {
  const user = requireUser();
  await deleteDoc(doc(db, 'posts', postId, 'likes', user.uid));
}

export async function fetchLikeCount(postId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'posts', postId, 'likes'));
    return snap.data().count;
  } catch {
    return 0;
  }
}

export async function fetchHasLiked(postId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, 'posts', postId, 'likes', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function addComment(
  postId: string,
  text: string,
  author: { name: string; slug?: string }
): Promise<PostComment> {
  const user = requireUser();
  const clean = text.trim().slice(0, MAX_COMMENT_TEXT);
  if (!clean) throw new Error('Comment is empty.');
  const comment: PostComment = {
    id: chronoId(),
    authorId: user.uid,
    authorName: author.name || user.displayName || 'Artist',
    ...(author.slug ? { authorSlug: author.slug } : {}),
    text: clean,
    createdAt: new Date().toISOString(),
  };
  const { id, ...data } = comment;
  await setDoc(doc(db, 'posts', postId, 'comments', id), data);
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'post_reply',
    actorName: comment.authorName,
    ...(comment.authorSlug ? { actorSlug: comment.authorSlug } : {}),
    postId,
    preview: clean.slice(0, 120),
  });
  return comment;
}

export async function fetchComments(postId: string, max = 50): Promise<PostComment[]> {
  try {
    const snap = await getDocs(query(collection(db, 'posts', postId, 'comments'), limitTo(max)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        authorId: String(data.authorId || ''),
        authorName: String(data.authorName || 'Artist'),
        authorSlug: typeof data.authorSlug === 'string' ? data.authorSlug : undefined,
        text: String(data.text || ''),
        createdAt: String(data.createdAt || ''),
      };
    });
  } catch {
    return [];
  }
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
}

export async function fetchCommentCount(postId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'posts', postId, 'comments'));
    return snap.data().count;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Friendships
// ---------------------------------------------------------------------------

export function friendshipIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function friendshipFromDoc(id: string, data: Record<string, unknown>): Friendship {
  return {
    id,
    uids: (Array.isArray(data.uids) ? data.uids : ['', '']) as [string, string],
    requestedBy: String(data.requestedBy || ''),
    status: data.status === 'accepted' ? 'accepted' : 'pending',
    profiles: (data.profiles && typeof data.profiles === 'object'
      ? data.profiles
      : {}) as Friendship['profiles'],
    createdAt: String(data.createdAt || ''),
    respondedAt: typeof data.respondedAt === 'string' ? data.respondedAt : undefined,
  };
}

export async function sendFriendRequest(
  me: { name: string; slug?: string },
  target: { userId: string; name: string; slug?: string }
): Promise<Friendship> {
  const user = requireUser();
  if (target.userId === user.uid) throw new Error('That is you.');
  if (await isUserBlocked(target.userId)) {
    throw new Error('You blocked this artist. Unblock them first.');
  }
  const id = friendshipIdFor(user.uid, target.userId);
  const friendship: Friendship = {
    id,
    uids: [user.uid, target.userId].sort() as [string, string],
    requestedBy: user.uid,
    status: 'pending',
    profiles: {
      [user.uid]: { name: me.name || user.displayName || 'Artist', ...(me.slug ? { slug: me.slug } : {}) },
      [target.userId]: { name: target.name, ...(target.slug ? { slug: target.slug } : {}) },
    },
    createdAt: new Date().toISOString(),
  };
  const { id: _id, ...data } = friendship;
  await setDoc(doc(db, 'friendships', id), data);
  trackSocialEvent('profile_friend_request');
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'friend_request',
    actorName: me.name || user.displayName || 'Artist',
    ...(me.slug ? { actorSlug: me.slug } : {}),
    recipientId: target.userId,
    recipientName: target.name,
    href: '/activity?tab=requests',
  });
  return friendship;
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const user = requireUser();
  const snap = await getDoc(doc(db, 'friendships', friendshipId));
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'accepted',
    respondedAt: new Date().toISOString(),
  });
  trackSocialEvent('profile_friend_accept');
  if (snap.exists()) {
    const data = snap.data();
    const requestedBy = String(data.requestedBy || '');
    if (requestedBy && requestedBy !== user.uid) {
      const { emitActivity } = await import('@/lib/activity/client');
      const myProfile = data.profiles?.[user.uid];
      emitActivity({
        type: 'friend_accepted',
        actorName:
          (myProfile && typeof myProfile === 'object' && typeof myProfile.name === 'string'
            ? myProfile.name
            : null) ||
          user.displayName ||
          'Artist',
        ...(myProfile && typeof myProfile === 'object' && typeof myProfile.slug === 'string'
          ? { actorSlug: myProfile.slug }
          : {}),
        recipientId: requestedBy,
        href: '/friends',
      });
    }
  }
}

/** Decline a request, cancel one you sent, or unfriend. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, 'friendships', friendshipId));
}

export async function fetchFriendshipWith(otherUserId: string): Promise<Friendship | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const id = friendshipIdFor(user.uid, otherUserId);
    const snap = await getDoc(doc(db, 'friendships', id));
    if (!snap.exists()) return null;
    return friendshipFromDoc(snap.id, snap.data());
  } catch (err) {
    console.warn('[friendship]', err);
    return null;
  }
}

/**
 * Friendships for a user.
 * Always constrains `status` so list queries are provable under the OR read rule
 * (accepted = public; pending = only when you're in `uids`).
 * Pass no status to load both accepted + pending for the signed-in user.
 */
export async function fetchFriendships(
  userId: string,
  status?: FriendshipStatus
): Promise<Friendship[]> {
  const load = async (s: FriendshipStatus): Promise<Friendship[]> => {
    const snap = await getDocs(
      query(
        collection(db, 'friendships'),
        where('uids', 'array-contains', userId),
        where('status', '==', s),
        limitTo(120)
      )
    );
    return snap.docs.map((d) => friendshipFromDoc(d.id, d.data()));
  };

  try {
    if (status) {
      return (await load(status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    // Own inbox: two constrained queries (avoids OR-rule list rejection).
    const [accepted, pending] = await Promise.all([load('accepted'), load('pending')]);
    return [...accepted, ...pending].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.warn('[friendships]', err);
    return [];
  }
}

/** The "other side" of accepted friendships, ready for display. */
export function friendProfilesOf(
  friendships: Friendship[],
  userId: string
): Array<{ userId: string; name: string; slug?: string }> {
  return friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => {
      const otherId = f.uids.find((u) => u !== userId) || '';
      const profile = f.profiles[otherId];
      return { userId: otherId, name: profile?.name || 'Artist', slug: profile?.slug };
    })
    .filter((p) => p.userId);
}

// ---------------------------------------------------------------------------
// Guestbook
// ---------------------------------------------------------------------------

export async function setGuestbookEntry(
  profileOwnerId: string,
  text: string,
  author: { name: string; slug?: string }
): Promise<GuestbookEntry> {
  const user = requireUser();
  if (profileOwnerId === user.uid) throw new Error('Sign your own book from the wall instead.');
  const clean = text.trim().slice(0, MAX_GUESTBOOK_TEXT);
  if (!clean) throw new Error('Say something first.');
  const entry: GuestbookEntry = {
    id: user.uid,
    authorId: user.uid,
    authorName: author.name || user.displayName || 'Artist',
    ...(author.slug ? { authorSlug: author.slug } : {}),
    text: clean,
    createdAt: new Date().toISOString(),
  };
  const { id, ...data } = entry;
  await setDoc(doc(db, 'guestbooks', profileOwnerId, 'entries', id), data);
  trackSocialEvent('profile_guestbook_signed');
  return entry;
}

export async function fetchGuestbook(profileOwnerId: string, max = 30): Promise<GuestbookEntry[]> {
  if (!profileOwnerId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'guestbooks', profileOwnerId, 'entries'), limitTo(max))
    );
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorId: String(data.authorId || d.id),
          authorName: String(data.authorName || 'Artist'),
          authorSlug: typeof data.authorSlug === 'string' ? data.authorSlug : undefined,
          text: String(data.text || ''),
          createdAt: String(data.createdAt || ''),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.warn('[guestbook]', err);
    return [];
  }
}

export async function deleteGuestbookEntry(
  profileOwnerId: string,
  entryId: string
): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, 'guestbooks', profileOwnerId, 'entries', entryId));
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export type BlockedUser = {
  blockedUserId: string;
  blockedName: string;
  blockedSlug?: string;
  createdAt: string;
};

export async function blockUser(target: {
  userId: string;
  name: string;
  slug?: string;
}): Promise<BlockedUser> {
  const user = requireUser();
  if (target.userId === user.uid) throw new Error('That is you.');
  const entry: BlockedUser = {
    blockedUserId: target.userId,
    blockedName: target.name || 'Artist',
    ...(target.slug ? { blockedSlug: target.slug } : {}),
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', user.uid, 'blocks', target.userId), entry);
  // Drop any friendship either way.
  try {
    await deleteDoc(doc(db, 'friendships', friendshipIdFor(user.uid, target.userId)));
  } catch {
    /* no friendship */
  }
  return entry;
}

export async function unblockUser(blockedUserId: string): Promise<void> {
  const user = requireUser();
  await deleteDoc(doc(db, 'users', user.uid, 'blocks', blockedUserId));
}

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const snap = await getDocs(query(collection(db, 'users', user.uid, 'blocks'), limitTo(200)));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          blockedUserId: String(data.blockedUserId || d.id),
          blockedName: String(data.blockedName || 'Artist'),
          blockedSlug: typeof data.blockedSlug === 'string' ? data.blockedSlug : undefined,
          createdAt: String(data.createdAt || ''),
        } satisfies BlockedUser;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.warn('[blocks]', err);
    return [];
  }
}

export async function isUserBlocked(otherUserId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !otherUserId || user.uid === otherUserId) return false;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'blocks', otherUserId));
    return snap.exists();
  } catch {
    return false;
  }
}
