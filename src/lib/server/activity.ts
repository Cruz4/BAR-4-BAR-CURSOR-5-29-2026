import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getDb } from '@/lib/firebase/server';
import { getPublicAppUrl } from '@/lib/app-url';
import {
  DEFAULT_ACTIVITY_PREFS,
  SYSTEM_ACTOR_ID,
  isCraftActivityType,
  prefsAllowsPush,
  pushCopyForActivity,
  type ActivityPrefs,
  type ActivityType,
} from '@/lib/activity/types';
import { profileHref } from '@/lib/profile/profile-slug';
import { activityPostHash } from '@/lib/activity/post-deep-link';

export type EmitActivityInput = {
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorSlug?: string;
  /** Recipient of the "received" event. Required unless resolved from post/share. */
  recipientId?: string;
  recipientName?: string;
  postId?: string;
  commentId?: string;
  shareId?: string;
  lockId?: string;
  preview?: string;
  href?: string;
};

function chronoId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}_${r}`;
}

function buildHref(input: EmitActivityInput, recipientSlug?: string): string | undefined {
  if (input.href) return input.href;
  if (input.lockId) return `/lock/${input.lockId}`;
  if (input.postId && recipientSlug) {
    const hash = activityPostHash(input.postId, {
      commentId: input.commentId,
      comments: input.type === 'post_reply',
    });
    return profileHref(recipientSlug, hash) || '/activity';
  }
  if (input.postId) return `/activity`;
  if (input.shareId) return `/share/${input.shareId}`;
  if (input.type === 'friend_request' || input.type === 'contact_request') return '/activity?tab=requests';
  if (input.type === 'fold_pass' && input.href) return input.href;
  if (input.type === 'fold_pass') return '/msgs';
  if (input.type === 'friend_accepted' && input.actorSlug) {
    return profileHref(input.actorSlug) || '/friends';
  }
  if (input.type === 'friend_accepted') return '/friends';
  if (input.type === 'contact_accepted' && input.actorSlug) {
    return profileHref(input.actorSlug) || '/activity';
  }
  return '/activity';
}

async function resolveProfileSlug(userId: string, known?: string): Promise<string | undefined> {
  if (known?.trim()) return known.trim();
  if (!userId) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(`users/${userId}/gamification/summary`).get();
    const slug = snap.data()?.profileSlug;
    return typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function loadPrefs(userId: string): Promise<ActivityPrefs> {
  const db = await getDb();
  const snap = await db.doc(`users/${userId}/activityMeta/prefs`).get();
  if (!snap.exists) return { ...DEFAULT_ACTIVITY_PREFS };
  const data = snap.data() || {};
  return {
    ...DEFAULT_ACTIVITY_PREFS,
    pushEnabled: data.pushEnabled === true,
    friendRequests: data.friendRequests !== false,
    friendAccepted: data.friendAccepted !== false,
    postLoves: data.postLoves !== false,
    postReplies: data.postReplies !== false,
    dnaImports: data.dnaImports !== false,
    lockCasts: data.lockCasts !== false,
    craftReminders: data.craftReminders !== false,
    foldBars: data.foldBars !== false,
    collabSheets: data.collabSheets !== false,
    firstDrops: data.firstDrops !== false,
  };
}

async function maybePush(
  recipientId: string,
  type: ActivityType,
  title: string,
  body: string,
  href: string
) {
  try {
    const prefs = await loadPrefs(recipientId);
    if (!prefsAllowsPush(prefs, type)) return;

    const db = await getDb();
    const pushSnap = await db.doc(`users/${recipientId}/activityMeta/push`).get();
    const token = typeof pushSnap.data()?.fcmToken === 'string' ? pushSnap.data()!.fcmToken : null;
    if (!token) return;

    const origin = getPublicAppUrl();
    const absoluteLink = href.startsWith('http') ? href : `${origin}${href.startsWith('/') ? '' : '/'}${href}`;

    await getMessaging().send({
      token,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: absoluteLink },
        notification: {
          icon: `${origin}/Logo.png`,
          badge: `${origin}/Logo.png`,
        },
      },
      data: {
        href: absoluteLink,
        type,
      },
    });
  } catch (err) {
    console.warn('[activity/push]', err);
  }
}

/**
 * Writes received + given activity docs, bumps unread, optionally pushes.
 * No-ops when actor === recipient.
 */
export async function emitActivityEvent(input: EmitActivityInput): Promise<{ ok: boolean }> {
  const db = await getDb();
  let recipientId = input.recipientId?.trim() || '';
  let recipientName = input.recipientName?.trim() || 'Artist';
  let recipientSlug: string | undefined;
  let preview = input.preview?.trim().slice(0, 160) || undefined;
  let shareId = input.shareId?.trim().toUpperCase() || undefined;
  const postId = input.postId?.trim() || undefined;
  const commentId = input.commentId?.trim() || undefined;

  if ((input.type === 'post_love' || input.type === 'post_reply' || input.type === 'post_reverb') && postId) {
    if (input.type === 'post_love' && commentId) {
      const commentSnap = await db.collection('posts').doc(postId).collection('comments').doc(commentId).get();
      if (!commentSnap.exists) return { ok: false };
      const comment = commentSnap.data() || {};
      recipientId = String(comment.authorId || '');
      recipientName = String(comment.authorName || 'Artist');
      recipientSlug = await resolveProfileSlug(
        recipientId,
        typeof comment.authorSlug === 'string' ? comment.authorSlug : undefined
      );
      if (!preview && typeof comment.text === 'string') {
        preview = comment.text.trim().slice(0, 120);
      }
    } else if (input.type === 'post_reply' && input.recipientId) {
      recipientId = input.recipientId.trim();
      recipientName = input.recipientName?.trim() || 'Artist';
      recipientSlug = await resolveProfileSlug(recipientId);
      if (!preview && commentId) {
        const commentSnap = await db.collection('posts').doc(postId).collection('comments').doc(commentId).get();
        const parentText = commentSnap.data()?.text;
        if (typeof parentText === 'string') preview = parentText.trim().slice(0, 120);
      }
    } else {
      const postSnap = await db.collection('posts').doc(postId).get();
      if (!postSnap.exists) return { ok: false };
      const post = postSnap.data() || {};
      recipientId = String(post.ownerId || '');
      recipientName = String(post.ownerName || 'Artist');
      recipientSlug = await resolveProfileSlug(
        recipientId,
        typeof post.ownerSlug === 'string' ? post.ownerSlug : undefined
      );
      if (!preview && typeof post.text === 'string') {
        preview = post.text.trim().slice(0, 120);
      }
    }
  }

  if (
    (input.type === 'dna_import' ||
      input.type === 'drop_loved' ||
      input.type === 'drop_reply' ||
      input.type === 'drop_unlocked') &&
    shareId
  ) {
    if (input.type === 'drop_reply' && input.recipientId) {
      recipientId = input.recipientId.trim();
      recipientName = input.recipientName?.trim() || 'Artist';
      recipientSlug = await resolveProfileSlug(recipientId);
    } else {
      const shareSnap = await db.collection('shares').doc(shareId).get();
      if (!shareSnap.exists) return { ok: false };
      const share = shareSnap.data() || {};
      recipientId = String(share.ownerId || '');
      recipientName = String(share.ownerName || 'Artist');
      const title =
        share.data && typeof share.data === 'object' && typeof (share.data as { title?: string }).title === 'string'
          ? (share.data as { title: string }).title
          : 'DNA Drop';
      if (!preview) preview = title;
    }
  }

  if (!recipientId) {
    return { ok: true };
  }
  if (recipientId === input.actorId && input.actorId !== SYSTEM_ACTOR_ID) {
    return { ok: true };
  }

  if (!recipientSlug) {
    recipientSlug = await resolveProfileSlug(recipientId);
  }

  const actorSlug = await resolveProfileSlug(input.actorId, input.actorSlug);

  const now = new Date().toISOString();
  const href = buildHref({ ...input, actorSlug }, recipientSlug) || '/activity';
  const base = {
    type: input.type,
    createdAt: now,
    actorId: input.actorId,
    actorName: input.actorName || 'Artist',
    ...(actorSlug ? { actorSlug } : {}),
    ...(postId ? { postId } : {}),
    ...(commentId ? { commentId } : {}),
    ...(shareId ? { shareId } : {}),
    ...(input.lockId ? { lockId: input.lockId } : {}),
    ...(preview ? { preview } : {}),
    href,
  };

  const receivedId = chronoId();
  const skipGiven =
    input.actorId === SYSTEM_ACTOR_ID || isCraftActivityType(input.type);

  const batch = db.batch();
  batch.set(db.doc(`users/${recipientId}/activity/${receivedId}`), {
    ...base,
    id: receivedId,
    direction: 'received',
    readAt: null,
  });
  if (!skipGiven) {
    const givenId = chronoId();
    batch.set(db.doc(`users/${input.actorId}/activity/${givenId}`), {
      ...base,
      id: givenId,
      direction: 'given',
      targetUserId: recipientId,
      targetName: recipientName,
      ...(recipientSlug ? { targetSlug: recipientSlug } : {}),
      readAt: now, // given items don't count as unread
    });
  }
  batch.set(
    db.doc(`users/${recipientId}/activityMeta/summary`),
    {
      unreadReceived: FieldValue.increment(1),
      updatedAt: now,
    },
    { merge: true }
  );
  await batch.commit();

  const { title, body } = pushCopyForActivity(
    input.type,
    input.actorName || 'Artist',
    preview
  );

  void maybePush(recipientId, input.type, title, body, href);

  return { ok: true };
}

export async function markActivityRead(userId: string, eventIds: string[]): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let marked = 0;
  const unique = [...new Set(eventIds)].filter(Boolean).slice(0, 50);

  for (const eventId of unique) {
    const ref = db.doc(`users/${userId}/activity/${eventId}`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const data = snap.data() || {};
    if (data.direction !== 'received' || data.readAt) continue;
    await ref.update({ readAt: now });
    marked += 1;
  }

  if (marked > 0) {
    const summaryRef = db.doc(`users/${userId}/activityMeta/summary`);
    await db.runTransaction(async (tx) => {
      const s = await tx.get(summaryRef);
      const current = typeof s.data()?.unreadReceived === 'number' ? s.data()!.unreadReceived : 0;
      tx.set(
        summaryRef,
        {
          unreadReceived: Math.max(0, current - marked),
          updatedAt: now,
        },
        { merge: true }
      );
    });
  }

  return marked;
}

export async function markAllActivityRead(userId: string): Promise<number> {
  const db = await getDb();
  const snap = await db
    .collection(`users/${userId}/activity`)
    .where('direction', '==', 'received')
    .where('readAt', '==', null)
    .limit(100)
    .get();

  if (snap.empty) {
    await db.doc(`users/${userId}/activityMeta/summary`).set(
      { unreadReceived: 0, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return 0;
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { readAt: now }));
  batch.set(
    db.doc(`users/${userId}/activityMeta/summary`),
    { unreadReceived: 0, updatedAt: now },
    { merge: true }
  );
  await batch.commit();
  return snap.size;
}

/**
 * Mark inbox friend_request rows from a given actor as read (Admin SDK).
 * Used when Neo's invite is upgraded to an accepted friendship so Accept UI dies.
 */
export async function clearFriendRequestActivityFromActor(
  recipientId: string,
  actorId: string
): Promise<number> {
  if (!recipientId || !actorId || recipientId === actorId) return 0;
  const db = await getDb();
  const snap = await db
    .collection(`users/${recipientId}/activity`)
    .where('direction', '==', 'received')
    .where('type', '==', 'friend_request')
    .where('actorId', '==', actorId)
    .limit(40)
    .get();

  if (snap.empty) return 0;

  const now = new Date().toISOString();
  let marked = 0;
  const batch = db.batch();
  for (const d of snap.docs) {
    const data = d.data() || {};
    if (data.readAt) continue;
    batch.update(d.ref, { readAt: now });
    marked += 1;
  }
  if (marked > 0) {
    batch.set(
      db.doc(`users/${recipientId}/activityMeta/summary`),
      {
        unreadReceived: FieldValue.increment(-marked),
        updatedAt: now,
      },
      { merge: true }
    );
  }
  await batch.commit();
  return marked;
}
