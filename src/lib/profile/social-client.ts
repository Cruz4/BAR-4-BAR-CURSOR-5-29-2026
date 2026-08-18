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
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client/firebase';
import { parseEmbedUrl, type EmbedProvider } from '@/lib/profile/embeds';
import { parseStudioBadge } from '@/lib/studio-tier-chrome';
import {
  deleteVoiceStorage,
  parseVoiceNote,
  uploadVoiceClip,
  voiceCommentStoragePath,
  voiceNoteToFirestore,
  voicePostStoragePath,
  type RecordedVoiceClip,
  type VoiceNote,
} from '@/lib/profile/voice-notes';
import {
  NEOMAIYA_PLAYGROUND_FRIEND,
  NEOMAIYA_SOL,
  isNeomaiyaSolViewer,
  looksLikeNeomaiyaSol,
} from '@/lib/profile/neomaiya-sol';
import { JORDIE_PLAYGROUND_FRIEND } from '@/lib/profile/jordie-cruz';
import { profileHref } from '@/lib/profile/profile-slug';

export type ProfilePost = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  text: string;
  embedUrl?: string;
  embedProvider?: EmbedProvider;
  /** Inline image (data URL or https) — e.g. achievement foil card. */
  imageUrl?: string;
  createdAt: string;
  /** True when this wall post is a Reverb (repost) of another artist's post. */
  isReverb?: boolean;
  reverbPostId?: string;
  reverbOwnerId?: string;
  reverbOwnerName?: string;
  reverbOwnerSlug?: string;
  reverbText?: string;
  reverbEmbedUrl?: string;
  reverbImageUrl?: string;
  /** Optional recorded voice note (playable + stored transcript). */
  voice?: VoiceNote;
  /** Snapshot of the original post's voice when this wall item is a Reverb. */
  reverbVoice?: VoiceNote;
};

export type PostComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorSlug?: string;
  text: string;
  createdAt: string;
  voice?: VoiceNote;
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
/** Firestore doc budget — keep foil JPEGs under this. */
const MAX_POST_IMAGE_URL = 900_000;

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
    | 'profile_guestbook_signed'
    | 'profile_reverb',
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
  imageUrl?: string;
  ownerName: string;
  ownerSlug?: string;
  voice?: RecordedVoiceClip;
}): Promise<ProfilePost> {
  const user = requireUser();
  const text = input.text.trim().slice(0, MAX_POST_TEXT);
  const embedUrl = input.embedUrl?.trim() || undefined;
  const imageUrl = input.imageUrl?.trim() || undefined;
  if (imageUrl && imageUrl.length > MAX_POST_IMAGE_URL) {
    throw new Error('Image is too large to post.');
  }
  if (!text && !embedUrl && !imageUrl && !input.voice) {
    throw new Error('Write something, add a link, attach an image, or record a voice note.');
  }

  const id = newestFirstId();
  let voice: VoiceNote | undefined;
  if (input.voice) {
    try {
      voice = await uploadVoiceClip({
        storagePath: voicePostStoragePath(user.uid, id, input.voice.contentType),
        clip: input.voice,
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Could not upload voice note.');
    }
  }

  const parsed = parseEmbedUrl(embedUrl);
  const post: ProfilePost = {
    id,
    ownerId: user.uid,
    ownerName: input.ownerName || user.displayName || 'Artist',
    ...(input.ownerSlug ? { ownerSlug: input.ownerSlug } : {}),
    text,
    ...(embedUrl ? { embedUrl } : {}),
    ...(parsed ? { embedProvider: parsed.provider } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(voice ? { voice } : {}),
    createdAt: new Date().toISOString(),
  };
  const { id: postId, ...data } = post;
  try {
    await setDoc(doc(db, 'posts', postId), data);
  } catch (err) {
    if (voice) await deleteVoiceStorage(voice.storagePath);
    throw err;
  }
  trackSocialEvent('profile_post_created', {
    hasEmbed: Boolean(embedUrl),
    hasImage: Boolean(imageUrl),
    hasVoice: Boolean(voice),
  });
  try {
    const { postGamificationEvent } = await import('@/lib/gamification-client');
    void postGamificationEvent('wall_post_created');
  } catch {
    /* ignore */
  }
  return post;
}

export async function deletePost(postId: string): Promise<void> {
  const user = requireUser();
  try {
    const snap = await getDoc(doc(db, 'posts', postId));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      const voice = parseVoiceNote(data.voice);
      if (voice?.storagePath) await deleteVoiceStorage(voice.storagePath);
      if (
        data.isReverb === true &&
        typeof data.reverbPostId === 'string' &&
        data.reverbPostId &&
        data.ownerId === user.uid
      ) {
        await deleteDoc(doc(db, 'users', user.uid, 'reverbs', data.reverbPostId)).catch(
          () => undefined
        );
      }
    }
  } catch {
    /* still attempt post delete */
  }
  await deleteDoc(doc(db, 'posts', postId));
}

function postFromDoc(id: string, data: Record<string, unknown>): ProfilePost {
  const parsedVoice = parseVoiceNote(data.voice);
  const parsedReverbVoice = parseVoiceNote(data.reverbVoice);
  return {
    id,
    ownerId: String(data.ownerId || ''),
    ownerName: String(data.ownerName || 'Artist'),
    ownerSlug: typeof data.ownerSlug === 'string' ? data.ownerSlug : undefined,
    text: String(data.text || ''),
    embedUrl: typeof data.embedUrl === 'string' ? data.embedUrl : undefined,
    embedProvider: data.embedProvider as EmbedProvider | undefined,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    createdAt: String(data.createdAt || ''),
    ...(data.isReverb === true ? { isReverb: true } : {}),
    ...(typeof data.reverbPostId === 'string' ? { reverbPostId: data.reverbPostId } : {}),
    ...(typeof data.reverbOwnerId === 'string' ? { reverbOwnerId: data.reverbOwnerId } : {}),
    ...(typeof data.reverbOwnerName === 'string'
      ? { reverbOwnerName: data.reverbOwnerName }
      : {}),
    ...(typeof data.reverbOwnerSlug === 'string'
      ? { reverbOwnerSlug: data.reverbOwnerSlug }
      : {}),
    ...(typeof data.reverbText === 'string' ? { reverbText: data.reverbText } : {}),
    ...(typeof data.reverbEmbedUrl === 'string' ? { reverbEmbedUrl: data.reverbEmbedUrl } : {}),
    ...(typeof data.reverbImageUrl === 'string' ? { reverbImageUrl: data.reverbImageUrl } : {}),
    ...(parsedVoice ? { voice: parsedVoice } : {}),
    ...(parsedReverbVoice ? { reverbVoice: parsedReverbVoice } : {}),
  };
}

type FetchPostsOpts = { enrichSlugs?: boolean };

/** Wall — a single artist's posts, newest first (id-ordered). */
export async function fetchPostsByOwner(
  ownerId: string,
  max = 20,
  opts?: FetchPostsOpts
): Promise<ProfilePost[]> {
  if (!ownerId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'posts'), where('ownerId', '==', ownerId), limitTo(max))
    );
    const raw = snap.docs.map((d) => postFromDoc(d.id, d.data()));
    const posts = opts?.enrichSlugs === false ? raw : await enrichPostsWithLiveSlugs(raw);
    return posts.sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
    );
  } catch (err) {
    console.warn('[posts]', err);
    return [];
  }
}

export async function fetchPostById(postId: string): Promise<ProfilePost | null> {
  const id = postId.trim();
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, 'posts', id));
    if (!snap.exists()) return null;
    const [post] = await enrichPostsWithLiveSlugs([postFromDoc(snap.id, snap.data())]);
    return post || null;
  } catch {
    return null;
  }
}

/** Reverbs only — same owner query, filtered client-side (no extra index). */
export async function fetchReverbsByOwner(ownerId: string, max = 40): Promise<ProfilePost[]> {
  const posts = await fetchPostsByOwner(ownerId, Math.max(max, 60));
  return posts.filter((p) => p.isReverb && p.reverbPostId).slice(0, max);
}

/**
 * Reverb (repost) another artist's post onto your wall.
 * Snapshots the original content so the Reverb stays readable if the source is deleted.
 * Toggle: if you already Reverbed this post, removes your Reverb instead.
 */
export async function toggleReverb(
  source: ProfilePost,
  me: { name: string; slug?: string }
): Promise<{ status: 'created' | 'removed'; post?: ProfilePost }> {
  const user = requireUser();
  if (source.ownerId === user.uid) {
    throw new Error('You already own this post.');
  }

  // Unwrap if someone Reverbed a Reverb — always point at the root post.
  const rootPostId = source.isReverb && source.reverbPostId ? source.reverbPostId : source.id;
  const rootOwnerId =
    source.isReverb && source.reverbOwnerId ? source.reverbOwnerId : source.ownerId;
  const rootOwnerName =
    source.isReverb && source.reverbOwnerName ? source.reverbOwnerName : source.ownerName;
  const rootOwnerSlug =
    source.isReverb && source.reverbOwnerSlug ? source.reverbOwnerSlug : source.ownerSlug;
  const rootText =
    source.isReverb && typeof source.reverbText === 'string' ? source.reverbText : source.text;
  const rootEmbed =
    source.isReverb && source.reverbEmbedUrl
      ? source.reverbEmbedUrl
      : source.embedUrl;
  const rootImage =
    source.isReverb && source.reverbImageUrl
      ? source.reverbImageUrl
      : source.imageUrl;
  const rootVoice =
    source.isReverb && source.reverbVoice
      ? source.reverbVoice
      : source.voice;

  const pointerRef = doc(db, 'users', user.uid, 'reverbs', rootPostId);
  const existing = await getDoc(pointerRef);
  if (existing.exists()) {
    const wallPostId =
      typeof existing.data()?.wallPostId === 'string' ? existing.data()!.wallPostId : '';
    if (wallPostId) {
      try {
        await deleteDoc(doc(db, 'posts', wallPostId));
      } catch {
        /* wall post may already be gone */
      }
    }
    await deleteDoc(pointerRef);
    return { status: 'removed' };
  }

  const post: ProfilePost = {
    id: newestFirstId(),
    ownerId: user.uid,
    ownerName: me.name || user.displayName || 'Artist',
    ...(me.slug ? { ownerSlug: me.slug } : {}),
    text: '',
    createdAt: new Date().toISOString(),
    isReverb: true,
    reverbPostId: rootPostId,
    reverbOwnerId: rootOwnerId,
    reverbOwnerName: rootOwnerName,
    ...(rootOwnerSlug ? { reverbOwnerSlug: rootOwnerSlug } : {}),
    ...(rootText?.trim() ? { reverbText: rootText.trim().slice(0, MAX_POST_TEXT) } : {}),
    ...(rootEmbed ? { reverbEmbedUrl: rootEmbed.slice(0, 500) } : {}),
    ...(rootImage && rootImage.length <= MAX_POST_IMAGE_URL
      ? { reverbImageUrl: rootImage }
      : {}),
    ...(rootVoice ? { reverbVoice: voiceNoteToFirestore(rootVoice) } : {}),
  };

  const { id, ...data } = post;
  await setDoc(doc(db, 'posts', id), data);
  await setDoc(pointerRef, { wallPostId: id, createdAt: post.createdAt });

  trackSocialEvent('profile_reverb', { originalOwnerId: rootOwnerId });
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'post_reverb',
    actorName: post.ownerName,
    ...(post.ownerSlug ? { actorSlug: post.ownerSlug } : {}),
    postId: rootPostId,
    preview: (rootText || rootOwnerName || 'a post').slice(0, 120),
    href: profileHref(post.ownerSlug, `post-${id}`),
  });

  return { status: 'created', post };
}

export async function fetchHasReverbed(originalPostId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !originalPostId) return false;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'reverbs', originalPostId));
    return snap.exists();
  } catch {
    return false;
  }
}

/** Feed — merged newest-first posts from many friends (parallel queries). */
export async function fetchPostsByOwners(
  ownerIds: string[],
  perOwner = 8,
  opts?: FetchPostsOpts
): Promise<ProfilePost[]> {
  const unique = [...new Set(ownerIds)].filter(Boolean).slice(0, 60);
  const results = await Promise.all(
    unique.map((uid) => fetchPostsByOwner(uid, perOwner, opts).catch(() => [] as ProfilePost[]))
  );
  return results.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Rewrite baked-in post ownerSlug / reverbOwnerSlug to the live publicProfiles
 * slug for that userId (retroactive posts still carry hyphen/uid Neo mirrors).
 */
export async function enrichPostsWithLiveSlugs(posts: ProfilePost[]): Promise<ProfilePost[]> {
  if (!posts.length) return posts;
  const ids = new Set<string>();
  for (const p of posts) {
    if (p.ownerId) ids.add(p.ownerId);
    if (p.reverbOwnerId) ids.add(p.reverbOwnerId);
  }
  if (!ids.size) return posts;

  const metas = await fetchPublicArtistMetas([...ids].map((userId) => ({ userId })));
  return posts.map((p) => {
    const owner = metas.get(p.ownerId);
    const reverb = p.reverbOwnerId ? metas.get(p.reverbOwnerId) : undefined;
    return {
      ...p,
      ...(owner?.slug ? { ownerSlug: owner.slug } : {}),
      ...(owner?.displayName ? { ownerName: owner.displayName } : {}),
      ...(reverb?.slug ? { reverbOwnerSlug: reverb.slug } : {}),
      ...(reverb?.displayName ? { reverbOwnerName: reverb.displayName } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export async function likePost(postId: string, actor?: { name?: string; slug?: string }): Promise<void> {
  const user = requireUser();
  await setDoc(doc(db, 'posts', postId, 'likes', user.uid), {
    createdAt: new Date().toISOString(),
  });
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'post_love',
    actorName: actor?.name || user.displayName || 'Artist',
    ...(actor?.slug ? { actorSlug: actor.slug } : {}),
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
  author: { name: string; slug?: string },
  voiceClip?: RecordedVoiceClip
): Promise<PostComment> {
  const user = requireUser();
  const clean = text.trim().slice(0, MAX_COMMENT_TEXT);
  if (!clean && !voiceClip) throw new Error('Comment is empty.');
  const id = chronoId();
  let voice: VoiceNote | undefined;
  if (voiceClip) {
    voice = await uploadVoiceClip({
      storagePath: voiceCommentStoragePath(user.uid, postId, id, voiceClip.contentType),
      clip: voiceClip,
    });
  }
  const comment: PostComment = {
    id,
    authorId: user.uid,
    authorName: author.name || user.displayName || 'Artist',
    ...(author.slug ? { authorSlug: author.slug } : {}),
    text: clean,
    createdAt: new Date().toISOString(),
    ...(voice ? { voice } : {}),
  };
  const { id: commentId, ...data } = comment;
  try {
    await setDoc(doc(db, 'posts', postId, 'comments', commentId), data);
  } catch (err) {
    if (voice) await deleteVoiceStorage(voice.storagePath);
    throw err;
  }
  const { emitActivity } = await import('@/lib/activity/client');
  emitActivity({
    type: 'post_reply',
    actorName: comment.authorName,
    ...(comment.authorSlug ? { actorSlug: comment.authorSlug } : {}),
    postId,
    preview: (clean || voice?.transcript || 'Voice note').slice(0, 120),
    commentId,
  });
  return comment;
}

export async function fetchComments(postId: string, max = 50): Promise<PostComment[]> {
  try {
    const snap = await getDocs(query(collection(db, 'posts', postId, 'comments'), limitTo(max)));
    const comments = snap.docs.map((d) => {
      const data = d.data();
      const voice = parseVoiceNote(data.voice);
      return {
        id: d.id,
        authorId: String(data.authorId || ''),
        authorName: String(data.authorName || 'Artist'),
        authorSlug: typeof data.authorSlug === 'string' ? data.authorSlug : undefined,
        text: String(data.text || ''),
        createdAt: String(data.createdAt || ''),
        ...(voice ? { voice } : {}),
      };
    });
    const ids = [...new Set(comments.map((c) => c.authorId).filter(Boolean))];
    if (!ids.length) return comments;
    const metas = await fetchPublicArtistMetas(ids.map((userId) => ({ userId })));
    return comments.map((c) => {
      const meta = metas.get(c.authorId);
      if (!meta?.slug) return c;
      return {
        ...c,
        authorSlug: meta.slug,
        authorName: meta.displayName || c.authorName,
      };
    });
  } catch {
    return [];
  }
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  requireUser();
  try {
    const snap = await getDoc(doc(db, 'posts', postId, 'comments', commentId));
    if (snap.exists()) {
      const voice = parseVoiceNote(snap.data().voice);
      if (voice?.storagePath) await deleteVoiceStorage(voice.storagePath);
    }
  } catch {
    /* still attempt comment delete */
  }
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
  const rawStatus = String(data.status || '').trim().toLowerCase();
  return {
    id,
    uids: (Array.isArray(data.uids) ? data.uids : ['', '']) as [string, string],
    requestedBy: String(data.requestedBy || ''),
    status: rawStatus === 'accepted' ? 'accepted' : 'pending',
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
  if (target.userId === NEOMAIYA_PLAYGROUND_FRIEND.userId) {
    throw new Error('That artist is not available.');
  }
  if (target.userId === JORDIE_PLAYGROUND_FRIEND.userId) {
    throw new Error('That artist is not available.');
  }
  if (
    isNeomaiyaSolViewer({ email: user.email, displayName: user.displayName }) &&
    looksLikeNeomaiyaSol(target.name, target.slug)
  ) {
    throw new Error('That is you.');
  }
  if (await isUserBlocked(target.userId)) {
    throw new Error('You blocked this artist. Unblock them first.');
  }
  const id = friendshipIdFor(user.uid, target.userId);
  const ref = doc(db, 'friendships', id);

  // Existing edge — never downgrade accepted/pending. Missing docs can 403 under
  // older friendship get rules; treat that as "no friendship yet".
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const existing = friendshipFromDoc(existingSnap.id, existingSnap.data());
      if (existing.status === 'accepted' || existing.status === 'pending') {
        return existing;
      }
    }
  } catch {
    /* proceed to create / founder seed */
  }

  // Neo connecting a legacy artist (pre-auto-welcome): Admin-seed accepted friendship.
  if (isNeomaiyaSolViewer({ email: user.email, displayName: user.displayName })) {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/profile/founder-friend', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: target.userId,
          targetName: target.name,
          ...(target.slug ? { targetSlug: target.slug } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        seeded?: boolean;
        reason?: string;
        friendship?: Record<string, unknown>;
      };
      if (res.ok && data.friendship && typeof data.friendship === 'object') {
        const seeded = friendshipFromDoc(String(data.friendship.id || id), data.friendship);
        // Re-read so we never return stale pending after an upgrade.
        try {
          const again = await getDoc(ref);
          if (again.exists()) return friendshipFromDoc(again.id, again.data());
        } catch {
          /* use seeded payload */
        }
        return seeded;
      }
      // dismissed / skipped → fall through to a normal pending request
    } catch {
      /* fall through to pending create */
    }
  }

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
  const { id: _id, ...payload } = friendship;

  // Create-only — never overwrite an accepted/pending edge (founder seed race).
  let result: Friendship = friendship;
  let created = false;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        result = friendshipFromDoc(snap.id, snap.data() as Record<string, unknown>);
        return;
      }
      tx.set(ref, payload);
      created = true;
    });
  } catch (err) {
    // Fallback: final get — if accepted/pending exists, return it instead of failing.
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) return friendshipFromDoc(snap.id, snap.data());
    } catch {
      /* ignore */
    }
    throw err;
  }

  if (!created) {
    return result;
  }

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
  const ref = doc(db, 'friendships', friendshipId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Friend request not found.');
  }
  const data = snap.data() || {};
  // Already friends — treat as success so Activity / Scene don't show a false error.
  if (data.status === 'accepted') {
    const peer =
      String(data.requestedBy || '') ||
      (Array.isArray(data.uids) ? data.uids.map(String).find((u) => u !== user.uid) : '') ||
      '';
    if (peer) {
      const { clearFriendRequestActivityFromPeer, notifyFriendshipChanged } = await import(
        '@/lib/activity/client'
      );
      const clearedActivityIds = await clearFriendRequestActivityFromPeer(peer);
      notifyFriendshipChanged({
        friendshipId,
        peerUserId: peer,
        action: 'accepted',
        clearedActivityIds,
      });
    }
    return;
  }
  if (data.status !== 'pending') {
    throw new Error('This request is no longer pending.');
  }
  const uids = Array.isArray(data.uids) ? data.uids.map(String) : [];
  if (!uids.includes(user.uid)) {
    throw new Error('Missing or insufficient permissions.');
  }
  if (String(data.requestedBy || '') === user.uid) {
    throw new Error('You sent this request — wait for them to accept.');
  }

  const requestedBy = String(data.requestedBy || '');

  try {
    await updateDoc(ref, {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Race: already accepted between get and update (rules reject non-pending updates).
    const again = await getDoc(ref);
    if (again.exists() && again.data()?.status === 'accepted') {
      /* fall through to activity cleanup */
    } else {
      throw err;
    }
  }

  trackSocialEvent('profile_friend_accept');
  if (requestedBy && requestedBy !== user.uid) {
    const { emitActivity, clearFriendRequestActivityFromPeer, notifyFriendshipChanged } =
      await import('@/lib/activity/client');
    const myProfile = data.profiles?.[user.uid];
    const actorSlug =
      myProfile && typeof myProfile === 'object' && typeof myProfile.slug === 'string'
        ? myProfile.slug
        : undefined;
    emitActivity({
      type: 'friend_accepted',
      actorName:
        (myProfile && typeof myProfile === 'object' && typeof myProfile.name === 'string'
          ? myProfile.name
          : null) ||
        user.displayName ||
        'Artist',
      ...(actorSlug ? { actorSlug } : {}),
      recipientId: requestedBy,
      href: profileHref(actorSlug) || '/friends',
    });
    const clearedActivityIds = await clearFriendRequestActivityFromPeer(requestedBy);
    notifyFriendshipChanged({
      friendshipId,
      peerUserId: requestedBy,
      action: 'accepted',
      clearedActivityIds,
    });
  }
  // Clear founder-welcome dismissal so a later unfriend can be recorded cleanly.
  try {
    await deleteDoc(doc(db, 'founderFriendDismissals', friendshipId));
  } catch {
    /* optional */
  }
  try {
    const { postGamificationEvent } = await import('@/lib/gamification-client');
    void postGamificationEvent('friendship_accepted');
  } catch {
    /* ignore */
  }
}

/** Decline a request, cancel one you sent, or unfriend. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const user = requireUser();
  const ref = doc(db, 'friendships', friendshipId);
  let peerUserId: string | undefined;
  let wasIncomingPending = false;
  let peerLookedLikeNeo = false;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() || {};
      const uids = Array.isArray(data.uids) ? data.uids.map(String) : [];
      peerUserId = uids.find((u) => u !== user.uid);
      wasIncomingPending =
        data.status === 'pending' && String(data.requestedBy || '') !== user.uid;
      const peerProfile =
        peerUserId && data.profiles && typeof data.profiles === 'object'
          ? (data.profiles as Friendship['profiles'])[peerUserId]
          : undefined;
      peerLookedLikeNeo = looksLikeNeomaiyaSol(peerProfile?.name, peerProfile?.slug);
    }
  } catch {
    /* still attempt delete */
  }
  await deleteDoc(ref);

  // Remember welcome was already granted so usage-init won't re-add Neo after unfriend.
  const neoInvolved =
    peerLookedLikeNeo ||
    isNeomaiyaSolViewer({ email: user.email, displayName: user.displayName });
  if (neoInvolved && peerUserId) {
    const nowIso = new Date().toISOString();
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          founderWelcome: { friendshipSeededAt: nowIso },
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch {
      /* rules may block — dismissal doc below is the durable signal */
    }
    try {
      const pairId = friendshipIdFor(user.uid, peerUserId);
      await setDoc(doc(db, 'founderFriendDismissals', pairId), {
        uids: [user.uid, peerUserId].sort(),
        dismissedBy: user.uid,
        dismissedAt: nowIso,
      });
    } catch {
      /* ignore */
    }
  }

  if (wasIncomingPending && peerUserId) {
    const { clearFriendRequestActivityFromPeer, notifyFriendshipChanged } = await import(
      '@/lib/activity/client'
    );
    const clearedActivityIds = await clearFriendRequestActivityFromPeer(peerUserId);
    notifyFriendshipChanged({
      friendshipId,
      peerUserId,
      action: 'removed',
      clearedActivityIds,
    });
  } else {
    const { notifyFriendshipChanged } = await import('@/lib/activity/client');
    notifyFriendshipChanged({
      friendshipId,
      peerUserId,
      action: 'removed',
    });
  }
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
 *
 * Prefers the Admin-backed `/api/friends` route (avoids client rules/index
 * failures that blanked every circle). Falls back to direct Firestore reads.
 */
export async function fetchFriendships(
  userId: string,
  status?: FriendshipStatus
): Promise<Friendship[]> {
  if (!userId) return [];

  const sortRows = (rows: Friendship[]) =>
    [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const fromServer = async (): Promise<Friendship[] | null> => {
    try {
      const params = new URLSearchParams({ of: userId });
      if (status) params.set('status', status);
      const headers: HeadersInit = {};
      const me = auth.currentUser;
      if (me) {
        params.set('userId', me.uid);
        const token = await me.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/friends?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { friendships?: Friendship[] };
      if (!Array.isArray(data.friendships)) return null;
      return sortRows(
        data.friendships.map((f) =>
          friendshipFromDoc(f.id, f as unknown as Record<string, unknown>)
        )
      );
    } catch (err) {
      console.warn('[friendships] server list failed', err);
      return null;
    }
  };

  const loadSelfAll = async (): Promise<Friendship[]> => {
    const snap = await getDocs(
      query(collection(db, 'friendships'), where('uids', 'array-contains', userId), limitTo(200))
    );
    return snap.docs.map((d) => friendshipFromDoc(d.id, d.data() as Record<string, unknown>));
  };

  const loadByStatus = async (s: FriendshipStatus): Promise<Friendship[]> => {
    const snap = await getDocs(
      query(
        collection(db, 'friendships'),
        where('uids', 'array-contains', userId),
        where('status', '==', s),
        limitTo(120)
      )
    );
    return snap.docs.map((d) => friendshipFromDoc(d.id, d.data() as Record<string, unknown>));
  };

  const viaApi = await fromServer();
  if (viaApi) return viaApi;

  const isSelf = Boolean(auth.currentUser?.uid && auth.currentUser.uid === userId);

  try {
    if (isSelf) {
      let rows = await loadSelfAll();
      if (status) rows = rows.filter((f) => f.status === status);
      return sortRows(rows);
    }

    if (status) {
      return sortRows(await loadByStatus(status));
    }

    const [accepted, pending] = await Promise.all([
      loadByStatus('accepted').catch(() => [] as Friendship[]),
      loadByStatus('pending').catch(() => [] as Friendship[]),
    ]);
    return sortRows([...accepted, ...pending]);
  } catch (err) {
    console.warn('[friendships]', err);
    if (isSelf) {
      try {
        let rows = await loadSelfAll();
        if (status) rows = rows.filter((f) => f.status === status);
        return sortRows(rows);
      } catch (err2) {
        console.warn('[friendships] self fallback failed', err2);
      }
    }
    return [];
  }
}

/** The "other side" of accepted friendships, ready for display. */
export function friendProfilesOf(
  friendships: Friendship[],
  userId: string,
  _viewer?: { email?: string | null; displayName?: string | null; uid?: string | null }
): Array<{ userId: string; name: string; slug?: string }> {
  // Do NOT drop "Neo-looking" chips here. Stale name/slug leftovers on real artists
  // used to blank Neo's own circle (and hide Neo on others' lists while she browsed).
  // Playground uid is filtered; live Neo vs Mike is resolved in enrichFriendProfilesWithLiveSlugs.
  const seenIds = new Set<string>();
  const out: Array<{ userId: string; name: string; slug?: string }> = [];
  for (const f of friendships) {
    if (f.status !== 'accepted') continue;
    const otherId = f.uids.find((u) => u !== userId) || '';
    if (!otherId || otherId === userId) continue;
    if (otherId === NEOMAIYA_PLAYGROUND_FRIEND.userId) continue;
    if (otherId === JORDIE_PLAYGROUND_FRIEND.userId) continue;
    if (seenIds.has(otherId)) continue;
    seenIds.add(otherId);
    const profile = f.profiles[otherId];
    out.push({
      userId: otherId,
      name: profile?.name || 'Artist',
      slug: profile?.slug,
    });
  }
  return out;
}

type LivePublicMeta = { slug?: string; displayName?: string; studioBadge?: 'pro' | 'free' };

/** Live Pro/Visitor chrome — publicProfiles.studioBadge can be stale for older subscribers. */
async function fetchLiveStudioBadgeFromApi(
  slug: string
): Promise<'pro' | 'free' | undefined> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(slug)}/avatar`);
    if (!res.ok) return undefined;
    const body = (await res.json()) as { studioBadge?: string | null };
    return parseStudioBadge(body.studioBadge);
  } catch {
    return undefined;
  }
}

/** Resolve the live publicProfiles slug for a user (ignores stale friendship chips). */
export async function fetchLivePublicProfileByUserId(
  userId: string
): Promise<LivePublicMeta | undefined> {
  if (!userId) return undefined;
  try {
    const snap = await getDocs(
      query(collection(db, 'publicProfiles'), where('userId', '==', userId), limitTo(8))
    );
    if (snap.empty) return undefined;
    const { needsVanitySlugUpgrade, stripLegacyUidSuffix, normalizeProfileSlugInput } = await import(
      '@/lib/profile/profile-slug'
    );
    const docs = [...snap.docs].sort((a, b) => {
      const aBad = needsVanitySlugUpgrade(a.id, userId) ? 1 : 0;
      const bBad = needsVanitySlugUpgrade(b.id, userId) ? 1 : 0;
      if (aBad !== bBad) return aBad - bBad;
      const aAt = String(a.data()?.updatedAt || '');
      const bAt = String(b.data()?.updatedAt || '');
      return bAt.localeCompare(aAt);
    });
    const best = docs[0]!;
    const dn = best.data()?.displayName;
    let slug = best.id;
    // Prefer underscore vanity only when that publicProfiles doc actually exists.
    if (needsVanitySlugUpgrade(slug, userId)) {
      const cleaned = stripLegacyUidSuffix(normalizeProfileSlugInput(slug));
      if (cleaned && cleaned !== slug) {
        const hyphen = cleaned.replace(/_/g, '-');
        const [cleanSnap, hyphenSnap] = await Promise.all([
          getDoc(doc(db, 'publicProfiles', cleaned)),
          hyphen !== cleaned ? getDoc(doc(db, 'publicProfiles', hyphen)) : Promise.resolve(null),
        ]);
        if (cleanSnap.exists()) slug = cleaned;
        else if (hyphenSnap && hyphenSnap.exists()) slug = hyphen;
      }
    }
    const studioBadge =
      (await fetchLiveStudioBadgeFromApi(slug)) || parseStudioBadge(best.data()?.studioBadge);
    return {
      slug,
      displayName: typeof dn === 'string' && dn.trim() ? dn.trim() : undefined,
      studioBadge,
    };
  } catch {
    return undefined;
  }
}

/**
 * Fix friend chips that still point at hyphen/uid Neo mirrors or Mike's old Neo URL.
 * Always prefer the live publicProfiles doc for that userId.
 */
export async function enrichFriendProfilesWithLiveSlugs(
  friends: Array<{ userId: string; name: string; slug?: string }>
): Promise<Array<{ userId: string; name: string; slug?: string }>> {
  let neoUid: string | null = null;
  let neoSlug: string = NEOMAIYA_SOL.slug;
  try {
    const res = await fetch('/api/profile/neomaiya');
    if (res.ok) {
      const data = (await res.json()) as { userId?: string; slug?: string };
      if (typeof data.userId === 'string' && data.userId.trim()) neoUid = data.userId.trim();
      if (typeof data.slug === 'string' && data.slug.trim()) neoSlug = data.slug.trim();
    }
  } catch {
    /* ignore */
  }

  const enriched = await Promise.all(
    friends.map(async (friend) => {
      // Real Neo account — always the canonical link.
      if (neoUid && friend.userId === neoUid) {
        return {
          userId: friend.userId,
          name: NEOMAIYA_SOL.displayName,
          slug: neoSlug,
        };
      }

      const live = await fetchLivePublicProfileByUserId(friend.userId);
      const neoLike = looksLikeNeomaiyaSol(friend.name, friend.slug);

      // Mike (or anyone else) still carrying a Neo slug/name in the friendship chip.
      if (neoLike) {
        return {
          userId: friend.userId,
          name:
            live?.displayName ||
            (friend.name === NEOMAIYA_SOL.displayName ? 'Artist' : friend.name),
          // Prefer live slug; if missing, omit so we don't open Neo's dead page.
          slug: live?.slug,
        };
      }

      if (live?.slug) {
        return {
          userId: friend.userId,
          name: live.displayName || friend.name,
          slug: live.slug,
        };
      }

      return friend;
    })
  );

  // Keep one Neo chip (by Auth uid only). Never promote Mike's leftover Neo slug into Neo.
  // Put Neo first so every artist's circle clearly shows her.
  const out: Array<{ userId: string; name: string; slug?: string }> = [];
  const seen = new Set<string>();
  let neoChip: { userId: string; name: string; slug?: string } | null = null;
  for (const p of enriched) {
    if (!p.userId || seen.has(p.userId)) continue;
    if (neoUid && p.userId === neoUid) {
      if (neoChip) continue;
      seen.add(p.userId);
      neoChip = {
        userId: neoUid,
        name: NEOMAIYA_SOL.displayName,
        slug: neoSlug,
      };
      continue;
    }
    seen.add(p.userId);
    out.push(p);
  }
  if (neoChip) out.unshift(neoChip);
  return out;
}

export type PublicArtistMeta = {
  userId: string;
  slug?: string;
  avatarUrl?: string;
  displayName?: string;
  studioBadge?: 'pro' | 'free';
};

function avatarFromPublicDoc(data: Record<string, unknown>): string | undefined {
  // Feed chip: custom upload only. Collage / legacy avatarUrl stay off the chip —
  // missing custom photo → stock initials star (not a broken/empty <img>).
  if (
    data.profilePhotoMode === 'custom' &&
    typeof data.profilePhotoUrl === 'string' &&
    data.profilePhotoUrl.trim()
  ) {
    const url = data.profilePhotoUrl.trim();
    // Custom hero uploads are often data:image/*; https hosted URLs also ok.
    if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return url;
  }
  return undefined;
}

type PublicAvatarAsset = {
  url: string;
  source?: string;
};

async function readPublicAvatarAsset(slug: string): Promise<PublicAvatarAsset | undefined> {
  try {
    const snap = await getDoc(doc(db, 'publicProfiles', slug, 'assets', 'avatar'));
    if (!snap.exists()) return undefined;
    const data = snap.data() as { url?: unknown; source?: unknown };
    const url = typeof data.url === 'string' && data.url.trim() ? data.url.trim() : '';
    if (!url) return undefined;
    return {
      url,
      source: typeof data.source === 'string' ? data.source : undefined,
    };
  } catch {
    return undefined;
  }
}

/** Custom feed photo only — never generative Vesperfold marks (those use VesperfoldMark). */
function customFeedPhotoUrl(asset: PublicAvatarAsset | undefined): string | undefined {
  if (!asset?.url) return undefined;
  if (asset.source === 'vesperfold') return undefined;
  const url = asset.url.trim();
  if (!url) return undefined;
  // Explicit custom source (often data:image from Press Desk) or hosted https.
  if (asset.source === 'custom') {
    if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return url;
    return undefined;
  }
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:image\//i.test(url)) return url;
  return undefined;
}

/**
 * Resolve live Artist Home slug + avatar for a set of users.
 * Always prefers publicProfiles by userId so stale friendship/activity slugs
 * (old Neo mirrors, hyphen+uid tails) never win the link.
 */
export async function fetchPublicArtistMetas(
  profiles: Array<{ userId: string; slug?: string }>
): Promise<Map<string, PublicArtistMeta>> {
  const out = new Map<string, PublicArtistMeta>();
  if (!profiles.length) return out;

  const { needsVanitySlugUpgrade } = await import('@/lib/profile/profile-slug');

  await Promise.all(
    profiles.map(async (p) => {
      if (!p.userId) return;
      try {
        // Live doc for this Auth user — ignore friendship chip slug first.
        const live = await fetchLivePublicProfileByUserId(p.userId);
        const liveSlug = live?.slug;

        if (liveSlug) {
          const asset = await readPublicAvatarAsset(liveSlug);
          out.set(p.userId, {
            userId: p.userId,
            slug: liveSlug,
            avatarUrl: customFeedPhotoUrl(asset),
            displayName: live.displayName,
            studioBadge: live.studioBadge,
          });
          // Prefer custom avatar from live slug; if missing, try named avatar field via doc.
          try {
            const snap = await getDoc(doc(db, 'publicProfiles', liveSlug));
            if (snap.exists()) {
              const data = snap.data() as Record<string, unknown>;
              const prev = out.get(p.userId)!;
              out.set(p.userId, {
                ...prev,
                avatarUrl: prev.avatarUrl || avatarFromPublicDoc(data),
                displayName:
                  prev.displayName ||
                  (typeof data.displayName === 'string' && data.displayName.trim()
                    ? data.displayName.trim()
                    : undefined),
                studioBadge: prev.studioBadge || parseStudioBadge(data.studioBadge),
              });
            }
          } catch {
            /* keep live meta */
          }
          return;
        }

        // No live public profile — only trust the chip slug if it isn't a vanity upgrade candidate
        // and the doc (if any) actually belongs to this userId.
        if (p.slug && !needsVanitySlugUpgrade(p.slug) && !looksLikeNeomaiyaSol(undefined, p.slug)) {
          const [snap, asset] = await Promise.all([
            getDoc(doc(db, 'publicProfiles', p.slug)),
            readPublicAvatarAsset(p.slug),
          ]);
          if (snap.exists()) {
            const data = snap.data() as Record<string, unknown>;
            const owner =
              typeof data.userId === 'string' ? data.userId : typeof data.uid === 'string' ? data.uid : '';
            if (owner && owner !== p.userId) {
              out.set(p.userId, { userId: p.userId });
              return;
            }
            out.set(p.userId, {
              userId: p.userId,
              slug: snap.id,
              avatarUrl: customFeedPhotoUrl(asset) || avatarFromPublicDoc(data),
              displayName:
                typeof data.displayName === 'string' && data.displayName.trim()
                  ? data.displayName.trim()
                  : undefined,
            });
            return;
          }
        }

        out.set(p.userId, { userId: p.userId });
      } catch {
        out.set(p.userId, { userId: p.userId, slug: p.slug });
      }
    })
  );

  return out;
}

/** Friend chip for circle UIs — live public vs private (“offline”). */
export type CircleFriendRow = {
  userId: string;
  name: string;
  /** Only set when they have a live public Artist Home. */
  slug?: string;
  avatarUrl?: string;
  /** True when publicProfiles exists (publicProfile on). */
  isLivePublic: boolean;
  studioBadge?: 'pro' | 'free';
};

/**
 * Resolve friend chips against live publicProfiles.
 * Never falls back to friendship-baked slugs — those leak private / stale vanity URLs.
 */
export async function resolveCircleFriends(
  chips: Array<{ userId: string; name: string; slug?: string }>
): Promise<CircleFriendRow[]> {
  if (!chips.length) return [];
  const metas = await fetchPublicArtistMetas(chips);
  return chips.map((f) => {
    const meta = metas.get(f.userId);
    const isLivePublic = Boolean(meta?.slug);
    return {
      userId: f.userId,
      name: (meta?.displayName || f.name || 'Artist').trim() || 'Artist',
      slug: isLivePublic ? meta?.slug : undefined,
      avatarUrl: isLivePublic ? meta?.avatarUrl : undefined,
      isLivePublic,
      studioBadge: meta?.studioBadge,
    };
  });
}

/** Strangers / Artist Home lists: live-public only. Personal `/friends` can pass true for offline. */
export function visibleCircleFriends(
  rows: CircleFriendRow[],
  canSeeOffline: boolean
): CircleFriendRow[] {
  if (canSeeOffline) return rows;
  return rows.filter((r) => r.isLivePublic);
}

/** Single-slug avatar lookup for feed author chips — custom profile photo preferred. */
export async function fetchPublicArtistAvatar(slug?: string): Promise<string | undefined> {
  if (!slug) return undefined;
  try {
    const meta = await fetchPublicArtistAvatarMeta(slug);
    return meta?.avatarUrl;
  } catch {
    return undefined;
  }
}

export type PublicArtistAvatarMeta = {
  avatarUrl?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  studioBadge?: 'pro' | 'free';
};

/** Avatar + optional Vesperfold seed for feed chips. */
export async function fetchPublicArtistAvatarMeta(
  slug?: string
): Promise<PublicArtistAvatarMeta | undefined> {
  if (!slug) return undefined;
  try {
    const asset = await readPublicAvatarAsset(slug);
    const snap = await getDoc(doc(db, 'publicProfiles', slug));
    const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    const useStar =
      data?.starMarkUseStar === true || asset?.source === 'vesperfold';
    const seed =
      typeof data?.starMarkSeed === 'number'
        ? data.starMarkSeed
        : undefined;

    const cachedBadge = parseStudioBadge(data?.studioBadge);

    const resolveBadge = async (): Promise<'pro' | 'free' | undefined> => {
      return (await fetchLiveStudioBadgeFromApi(slug)) || cachedBadge;
    };

    if (useStar) {
      return {
        starMarkUseStar: true,
        starMarkSeed: seed,
        studioBadge: await resolveBadge(),
      };
    }

    const customUrl = customFeedPhotoUrl(asset) || avatarFromPublicDoc(data || {});
    if (customUrl) {
      return { avatarUrl: customUrl, starMarkUseStar: false, studioBadge: await resolveBadge() };
    }

    const res = await fetch(`/api/profile/${encodeURIComponent(slug)}/avatar`);
    if (res.ok) {
      const body = (await res.json()) as {
        avatarUrl?: string | null;
        starMarkUseStar?: boolean;
        starMarkSeed?: number | null;
        studioBadge?: string | null;
      };
      const apiBadge = parseStudioBadge(body.studioBadge) || cachedBadge;
      if (body.starMarkUseStar) {
        return {
          starMarkUseStar: true,
          starMarkSeed:
            typeof body.starMarkSeed === 'number' ? body.starMarkSeed : undefined,
          studioBadge: apiBadge,
        };
      }
      const apiUrl =
        typeof body.avatarUrl === 'string' && body.avatarUrl.trim()
          ? body.avatarUrl.trim()
          : undefined;
      // Skip generative Vesperfold payloads; allow custom https + data:image photos.
      if (apiUrl && !apiUrl.startsWith('data:image/svg') && (/^https?:\/\//i.test(apiUrl) || /^data:image\//i.test(apiUrl))) {
        return { avatarUrl: apiUrl, starMarkUseStar: false, studioBadge: apiBadge };
      }
      return { starMarkUseStar: false, studioBadge: apiBadge };
    }

    if (!data) return undefined;
    return { avatarUrl: avatarFromPublicDoc(data), starMarkUseStar: false, studioBadge: cachedBadge };
  } catch {
    return undefined;
  }
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
    const raw = snap.docs
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
    return healGuestbookNeoAttribution(raw);
  } catch (err) {
    console.warn('[guestbook]', err);
    return [];
  }
}

/** Drop Mike-as-Neo lines; force real Neo lines to /neomaiya_sol. */
async function healGuestbookNeoAttribution(entries: GuestbookEntry[]): Promise<GuestbookEntry[]> {
  let neoUid: string | null = null;
  let neoSlug: string = NEOMAIYA_SOL.slug;
  try {
    const res = await fetch('/api/profile/neomaiya');
    if (res.ok) {
      const data = (await res.json()) as { userId?: string; slug?: string };
      if (typeof data.userId === 'string' && data.userId.trim()) neoUid = data.userId.trim();
      if (typeof data.slug === 'string' && data.slug.trim()) neoSlug = data.slug.trim();
    }
  } catch {
    /* offline / unavailable */
  }

  return entries.flatMap((entry) => {
    const neoLike = looksLikeNeomaiyaSol(entry.authorName, entry.authorSlug);
    if (!neoLike) return [entry];
    if (neoUid && entry.authorId !== neoUid) return [];
    // Legacy uid-suffixed Neo mirrors without a resolved Neo uid — hide.
    if (
      !neoUid &&
      entry.authorSlug &&
      entry.authorSlug !== neoSlug &&
      entry.authorSlug !== 'neomaiya-sol'
    ) {
      return [];
    }
    return [
      {
        ...entry,
        authorName: NEOMAIYA_SOL.displayName,
        authorSlug: neoSlug,
      },
    ];
  });
}

export async function deleteGuestbookEntry(
  profileOwnerId: string,
  entryId: string
): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, 'guestbooks', profileOwnerId, 'entries', entryId));
}

// ---------------------------------------------------------------------------
// The Board — one reply per visitor per pin
// ---------------------------------------------------------------------------

export type BoardPinReply = {
  id: string;
  authorId: string;
  authorName: string;
  authorSlug?: string;
  text: string;
  createdAt: string;
  pinId: string;
};

const MAX_BOARD_REPLY = 160;

export async function setBoardPinReply(
  profileOwnerId: string,
  pinId: string,
  text: string,
  author: { name: string; slug?: string }
): Promise<BoardPinReply> {
  const user = requireUser();
  if (profileOwnerId === user.uid) throw new Error('Reply under someone else’s pin from the wall instead.');
  const clean = text.trim().slice(0, MAX_BOARD_REPLY);
  if (!clean) throw new Error('Say something first.');
  if (!pinId.trim()) throw new Error('Missing pin.');
  const entry: BoardPinReply = {
    id: user.uid,
    authorId: user.uid,
    authorName: author.name || user.displayName || 'Artist',
    ...(author.slug ? { authorSlug: author.slug } : {}),
    text: clean,
    createdAt: new Date().toISOString(),
    pinId: pinId.trim().slice(0, 40),
  };
  const { id, ...data } = entry;
  await setDoc(doc(db, 'boardReplies', profileOwnerId, 'pins', entry.pinId, 'entries', id), data);
  return entry;
}

export async function fetchBoardPinReplies(
  profileOwnerId: string,
  pinId: string,
  max = 20
): Promise<BoardPinReply[]> {
  if (!profileOwnerId || !pinId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'boardReplies', profileOwnerId, 'pins', pinId, 'entries'), limitTo(max))
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
          pinId: String(data.pinId || pinId),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function deleteBoardPinReply(
  profileOwnerId: string,
  pinId: string,
  entryId: string
): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, 'boardReplies', profileOwnerId, 'pins', pinId, 'entries', entryId));
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
