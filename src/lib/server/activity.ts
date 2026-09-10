import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import {
  DEFAULT_ACTIVITY_PREFS,
  SYSTEM_ACTOR_ID,
  SYSTEM_ACTOR_NAME,
  isActivityType,
  isCraftActivityType,
  prefsAllowsPush,
  pushCopyForActivity,
  type ActivityDirection,
  type ActivityEvent,
  type ActivityFeedPage,
  type ActivityPrefs,
  type ActivitySummary,
  type ActivityType,
} from '@/lib/activity/types';
import { profileHref } from '@/lib/profile/profile-slug';
import { activityPostHash } from '@/lib/activity/post-deep-link';
import { shareDocCommerceFlags } from '@/lib/drop-commerce';
import { emergingEntryPath } from '@/lib/emerging-ranking';
import {
  effectiveHouseReleaseReadAt,
  houseReleasePingEventId,
  houseReleasePingSortAt,
  isHouseReleasePingUnread,
} from '@/lib/house-release-ping';
import { isLiveMusicFanOnly } from '@/lib/server/music-fan-eligibility';
import { listPushTokensFromDoc, sendWebPushToTokens } from '@/lib/server/push-devices';

export type EmitActivityInput = {
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorSlug?: string;
  /** Recipient of the "received" event. Required unless resolved from post/share. */
  recipientId?: string;
  recipientName?: string;
  recipientSlug?: string;
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
  if (input.type === 'door_knock' && recipientSlug) {
    return profileHref(recipientSlug) || '/activity';
  }
  if (input.type === 'friend_accepted') return '/friends';
  if (input.type === 'contact_accepted' && input.actorSlug) {
    return profileHref(input.actorSlug) || '/activity';
  }
  if (input.type === 'drop_sold') return '/earnings';
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

async function creditSharedSongLove(postId: string, actorId: string): Promise<void> {
  const db = await getDb();
  const post = await db.doc(`posts/${postId}`).get();
  const data = post.data() || {};
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const embedded = typeof data.embedUrl === 'string' ? data.embedUrl : '';
  const rawShareId = embedded.match(/\/(?:song|share)\/([^/?#]+)/)?.[1];
  if (!post.exists || !ownerId || !rawShareId || actorId === ownerId) return;
  if (!(await isLiveMusicFanOnly(db, ownerId))) return;
  const shareId = decodeURIComponent(rawShareId);
  const [share, love] = await Promise.all([
    db.doc(`shares/${shareId}`).get(),
    db.doc(`posts/${postId}/likes/${actorId}`).get(),
  ]);
  const originalOwnerId = typeof share.data()?.ownerId === 'string' ? share.data()!.ownerId : '';
  const shareData = share.data() || {};
  const payload = shareData.data && typeof shareData.data === 'object'
    ? shareData.data as Record<string, unknown>
    : {};
  const isPressedSong = shareData.type !== 'album' && shareDocCommerceFlags('track', {
    dropAudio: payload.dropAudio,
    dropPrice: payload.dropPrice,
  }).hasDropAudio;
  if (!share.exists || !love.exists || !isPressedSong || !originalOwnerId || originalOwnerId === ownerId || originalOwnerId === actorId) return;
  const tick = db.doc(`posts/${postId}/momentumTicks/love_${actorId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(tick)).exists) return;
    tx.set(tick, { actorId, shareId, createdAt: new Date().toISOString() });
    tx.set(db.doc(emergingEntryPath(ownerId)), {
      userId: ownerId,
      sharedLoves: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
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
    relationships: data.relationships !== false,
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

export async function maybePush(
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
    const [pushSnap, summary] = await Promise.all([
      db.doc(`users/${recipientId}/activityMeta/push`).get(),
      getActivitySummary(recipientId).catch(() => ({ unreadReceived: 1 } as ActivitySummary)),
    ]);
    const tokens = listPushTokensFromDoc(pushSnap.data() as Record<string, unknown> | undefined);
    if (!tokens.length) return;

    await sendWebPushToTokens({
      tokens,
      title,
      body,
      href,
      type,
      unread: summary.unreadReceived,
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
  const shareId = input.shareId?.trim().toUpperCase() || undefined;
  let resolvedShareHref: string | undefined;
  const postId = input.postId?.trim() || undefined;
  const commentId = input.commentId?.trim() || undefined;

  if (input.type === 'profile_imprint_saved') {
    recipientId = input.recipientId?.trim() || '';
    recipientName = input.recipientName?.trim() || 'Artist';
    recipientSlug = await resolveProfileSlug(recipientId, input.recipientSlug);
    if (!preview && postId) {
      const postSnap = await db.collection('posts').doc(postId).get();
      const post = postSnap.data() || {};
      if (typeof post.text === 'string') {
        preview = post.text.trim().slice(0, 120);
      }
    }
  } else if (
    (input.type === 'post_love' ||
      input.type === 'post_reply' ||
      input.type === 'post_reverb' ||
      input.type === 'post_imprint_saved') &&
    postId
  ) {
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
      input.type === 'drop_unlocked' ||
      input.type === 'drop_sold') &&
    shareId
  ) {
    const shareSnap = await db.collection('shares').doc(shareId).get();
    if (!shareSnap.exists) return { ok: false };
    const share = shareSnap.data() || {};
    const payload = share.data && typeof share.data === 'object'
      ? share.data as Record<string, unknown>
      : {};
    const pressed = share.type !== 'album' && shareDocCommerceFlags('track', {
      dropAudio: payload.dropAudio,
      dropPrice: payload.dropPrice,
    }).hasDropAudio;
    if (
      pressed &&
      (input.type === 'drop_loved' || input.type === 'drop_reply' || input.type === 'drop_unlocked')
    ) {
      resolvedShareHref = `/song/${shareId}`;
    }
    if (input.type === 'drop_reply' && input.recipientId) {
      recipientId = input.recipientId.trim();
      recipientName = input.recipientName?.trim() || 'Artist';
      recipientSlug = await resolveProfileSlug(recipientId);
    } else {
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
  const href = buildHref(
    { ...input, actorSlug, ...(resolvedShareHref && !input.href ? { href: resolvedShareHref } : {}) },
    recipientSlug
  ) || '/activity';
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

  if (input.type === 'post_love' && postId && !commentId) {
    await creditSharedSongLove(postId, input.actorId).catch((error) => {
      console.warn('[activity/shared-song-love]', error);
    });
  }

  const { title, body } = pushCopyForActivity(
    input.type,
    input.actorName || 'Artist',
    preview
  );

  void maybePush(recipientId, input.type, title, body, href);

  return { ok: true };
}

function activityIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      try {
        return (toDate as () => Date)().toISOString();
      } catch {
        return '';
      }
    }
  }
  return '';
}

function activityEventFromData(
  id: string,
  data: Record<string, unknown>
): ActivityEvent | null {
  if (!isActivityType(data.type)) return null;
  const direction: ActivityDirection = data.direction === 'given' ? 'given' : 'received';
  return {
    id,
    type: data.type,
    direction,
    createdAt: activityIso(data.createdAt),
    actorId: typeof data.actorId === 'string' ? data.actorId : '',
    actorName:
      typeof data.actorName === 'string' && data.actorName.trim()
        ? data.actorName.trim()
        : 'Artist',
    ...(typeof data.actorSlug === 'string' ? { actorSlug: data.actorSlug } : {}),
    ...(typeof data.targetUserId === 'string' ? { targetUserId: data.targetUserId } : {}),
    ...(typeof data.targetName === 'string' ? { targetName: data.targetName } : {}),
    ...(typeof data.targetSlug === 'string' ? { targetSlug: data.targetSlug } : {}),
    ...(typeof data.postId === 'string' ? { postId: data.postId } : {}),
    ...(typeof data.commentId === 'string' ? { commentId: data.commentId } : {}),
    ...(typeof data.shareId === 'string' ? { shareId: data.shareId } : {}),
    ...(typeof data.lockId === 'string' ? { lockId: data.lockId } : {}),
    ...(typeof data.preview === 'string' ? { preview: data.preview } : {}),
    ...(typeof data.href === 'string' ? { href: data.href } : {}),
    readAt: data.readAt === null ? null : activityIso(data.readAt) || undefined,
    homeDeliveredAt:
      data.homeDeliveredAt === null
        ? null
        : activityIso(data.homeDeliveredAt) || undefined,
  };
}

const HOUSE_ACTIVITY_LIMIT = 100;

async function listHouseReleaseActivity(userId: string): Promise<ActivityEvent[]> {
  const db = await getDb();
  const pings = await db
    .collection('houseReleasePings')
    .orderBy('createdAt', 'desc')
    .limit(HOUSE_ACTIVITY_LIMIT)
    .get();
  if (pings.empty) return [];

  const byShare = new Map<string, (typeof pings.docs)[number]>();
  for (const doc of pings.docs) {
    const data = doc.data() || {};
    const shareId = typeof data.shareId === 'string' ? data.shareId.trim().toUpperCase() : '';
    if (!shareId) continue;
    const stableId = houseReleasePingEventId(shareId);
    const existing = byShare.get(shareId);
    if (!existing) {
      byShare.set(shareId, doc);
      continue;
    }
    if (doc.id === stableId) {
      byShare.set(shareId, doc);
      continue;
    }
    if (existing.id === stableId) continue;
    if (
      houseReleasePingSortAt(data).localeCompare(houseReleasePingSortAt(existing.data() || {})) > 0
    ) {
      byShare.set(shareId, doc);
    }
  }

  const uniqueDocs = [...byShare.values()].sort((a, b) =>
    houseReleasePingSortAt(b.data() || {}).localeCompare(houseReleasePingSortAt(a.data() || {}))
  );

  const readRefs = uniqueDocs.map((ping) =>
    db.doc(`users/${userId}/activityGlobalReads/${ping.id}`)
  );
  const reads = readRefs.length ? await db.getAll(...readRefs) : [];
  return uniqueDocs.map((ping, index) => {
    const data = ping.data() || {};
    const readData = reads[index]?.data() || {};
    const pingedAt = houseReleasePingSortAt(data);
    const storedReadAt = readData.readAt === null
      ? null
      : activityIso(readData.readAt) || null;
    return {
      id: ping.id,
      type: 'house_release',
      direction: 'received',
      createdAt: pingedAt,
      actorId: SYSTEM_ACTOR_ID,
      actorName: SYSTEM_ACTOR_NAME,
      preview: typeof data.title === 'string' ? data.title : 'New House release',
      href: typeof data.href === 'string' ? data.href : '/library',
      readAt: effectiveHouseReleaseReadAt(pingedAt, storedReadAt),
    } satisfies ActivityEvent;
  });
}

export async function getActivitySummary(userId: string): Promise<ActivitySummary> {
  const db = await getDb();
  const [local, houseEvents] = await Promise.all([
    db.doc(`users/${userId}/activityMeta/summary`).get(),
    listHouseReleaseActivity(userId),
  ]);
  const localUnread = typeof local.data()?.unreadReceived === 'number'
    ? Math.max(0, Math.floor(local.data()!.unreadReceived))
    : 0;
  const unreadHouseReleases = houseEvents.filter((event) => !event.readAt).length;
  return {
    unreadReceived: localUnread + unreadHouseReleases,
    unreadHouseReleases,
    updatedAt: typeof local.data()?.updatedAt === 'string' ? local.data()!.updatedAt : '',
  };
}

/**
 * Read stored activity without depending on a direction/createdAt compound index.
 * The cursor advances over every scanned document so received and sent history can
 * each be paginated without silently dropping already-read rows.
 */
export async function listActivityFeedPage(
  userId: string,
  direction: ActivityDirection,
  requestedLimit = 60,
  cursor?: string
): Promise<ActivityFeedPage> {
  const db = await getDb();
  const pageSize = Math.min(100, Math.max(1, Math.floor(requestedLimit) || 60));
  const collection = db.collection(`users/${userId}/activity`);
  let after = cursor ? await collection.doc(cursor).get() : null;
  if (cursor && !after?.exists) after = null;

  const events: ActivityEvent[] = [];
  let nextCursor: string | null = null;
  let exhausted = false;

  while (events.length < pageSize && !exhausted) {
    let query = collection.orderBy('createdAt', 'desc').limit(200);
    if (after?.exists) query = query.startAfter(after);
    const snap = await query.get();
    if (snap.empty) break;

    let lastScanned = snap.docs[0];
    for (const doc of snap.docs) {
      lastScanned = doc;
      const event = activityEventFromData(doc.id, doc.data() as Record<string, unknown>);
      if (!event || event.direction !== direction) continue;
      if (
        event.type === 'door_knock' &&
        direction === 'received' &&
        event.homeDeliveredAt == null
      ) {
        continue;
      }
      events.push(event);
      if (events.length >= pageSize) break;
    }

    nextCursor = lastScanned.id;
    const consumedWholeBatch = lastScanned.id === snap.docs[snap.docs.length - 1]?.id;
    exhausted = consumedWholeBatch && snap.size < 200;
    after = lastScanned;
  }

  if (direction === 'received' && !cursor) {
    const houseEvents = await listHouseReleaseActivity(userId);
    events.push(...houseEvents);
    events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return { events, nextCursor: exhausted ? null : nextCursor };
}

export async function markActivityRead(userId: string, eventIds: string[]): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let marked = 0;
  let markedGlobal = 0;
  const unique = [...new Set(eventIds)].filter(Boolean).slice(0, 50);

  for (const eventId of unique) {
    if (eventId.startsWith('house_')) {
      const [ping, receipt] = await Promise.all([
        db.doc(`houseReleasePings/${eventId}`).get(),
        db.doc(`users/${userId}/activityGlobalReads/${eventId}`).get(),
      ]);
      if (!ping.exists) continue;
      const pingedAt = houseReleasePingSortAt(ping.data() || {});
      const storedReadAt = receipt.data()?.readAt === null
        ? null
        : activityIso(receipt.data()?.readAt) || null;
      if (!isHouseReleasePingUnread(pingedAt, storedReadAt)) continue;
      await receipt.ref.set({ readAt: now }, { merge: true });
      marked += 1;
      markedGlobal += 1;
      continue;
    }
    const ref = db.doc(`users/${userId}/activity/${eventId}`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const data = snap.data() || {};
    if (data.direction !== 'received' || data.readAt) continue;
    await ref.update({ readAt: now });
    marked += 1;
  }

  const markedLocal = marked - markedGlobal;
  if (markedLocal > 0 || markedGlobal > 0) {
    const summaryRef = db.doc(`users/${userId}/activityMeta/summary`);
    await db.runTransaction(async (tx) => {
      const s = await tx.get(summaryRef);
      const current = typeof s.data()?.unreadReceived === 'number' ? s.data()!.unreadReceived : 0;
      const currentHouse =
        typeof s.data()?.unreadHouseReleases === 'number' ? s.data()!.unreadHouseReleases : 0;
      tx.set(
        summaryRef,
        {
          ...(markedLocal > 0
            ? { unreadReceived: Math.max(0, current - markedLocal) }
            : {}),
          ...(markedGlobal > 0
            ? { unreadHouseReleases: Math.max(0, currentHouse - markedGlobal) }
            : {}),
          updatedAt: now,
        },
        { merge: true }
      );
    });
  }

  return marked;
}

export async function markActivityUnread(userId: string, eventIds: string[]): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const unique = [...new Set(eventIds)].filter(Boolean).slice(0, 50);
  if (!unique.length) return 0;

  const houseIds = unique.filter((eventId) => eventId.startsWith('house_'));
  let houseMarked = 0;
  for (const eventId of houseIds) {
    const [ping, receipt] = await Promise.all([
      db.doc(`houseReleasePings/${eventId}`).get(),
      db.doc(`users/${userId}/activityGlobalReads/${eventId}`).get(),
    ]);
    const pingedAt = houseReleasePingSortAt(ping.data() || {});
    const storedReadAt = receipt.data()?.readAt === null
      ? null
      : activityIso(receipt.data()?.readAt) || null;
    if (!ping.exists || isHouseReleasePingUnread(pingedAt, storedReadAt)) continue;
    await receipt.ref.set({ readAt: null }, { merge: true });
    houseMarked += 1;
  }
  const localIds = unique.filter((eventId) => !eventId.startsWith('house_'));
  if (!localIds.length) return houseMarked;
  const eventRefs = localIds.map((eventId) => db.doc(`users/${userId}/activity/${eventId}`));
  const summaryRef = db.doc(`users/${userId}/activityMeta/summary`);

  return db.runTransaction(async (tx) => {
    const snapshots = await Promise.all(eventRefs.map((ref) => tx.get(ref)));
    const unreadSnaps = snapshots
      .filter((snap) => {
        const data = snap.data() || {};
        return snap.exists && data.direction === 'received' && Boolean(data.readAt);
      });
    const unreadRefs = unreadSnaps.map((snap) => snap.ref);
    const houseReleaseCount = unreadSnaps.filter(
      (snap) => snap.data()?.type === 'house_release'
    ).length;

    if (!unreadRefs.length) return houseMarked;

    unreadRefs.forEach((ref) => tx.update(ref, { readAt: null }));
    tx.set(
      summaryRef,
      {
        unreadReceived: FieldValue.increment(unreadRefs.length),
        ...(houseReleaseCount > 0
          ? { unreadHouseReleases: FieldValue.increment(houseReleaseCount) }
          : {}),
        updatedAt: now,
      },
      { merge: true }
    );
    return unreadRefs.length + houseMarked;
  });
}

export async function markAllActivityRead(userId: string): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let marked = 0;

  while (true) {
    const snap = await db
      .collection(`users/${userId}/activity`)
      .where('direction', '==', 'received')
      .where('readAt', '==', null)
      .limit(400)
      .get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { readAt: now }));
    await batch.commit();
    marked += snap.size;
    if (snap.size < 400) break;
  }

  const houseEvents = await listHouseReleaseActivity(userId);
  const unreadHouseEvents = houseEvents.filter((event) => !event.readAt);
  for (let index = 0; index < unreadHouseEvents.length; index += 400) {
    const batch = db.batch();
    unreadHouseEvents.slice(index, index + 400).forEach((event) => {
      batch.set(
        db.doc(`users/${userId}/activityGlobalReads/${event.id}`),
        { readAt: now },
        { merge: true }
      );
    });
    await batch.commit();
  }
  marked += unreadHouseEvents.length;

  await db.doc(`users/${userId}/activityMeta/summary`).set(
    { unreadReceived: 0, unreadHouseReleases: 0, updatedAt: now },
    { merge: true }
  );
  return marked;
}

export async function markAllActivityUnread(userId: string): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let marked = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db
      .collection(`users/${userId}/activity`)
      .where('direction', '==', 'received')
      .orderBy('createdAt', 'desc')
      .limit(400);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;

    const toUnread = snap.docs.filter((doc) => Boolean(doc.data().readAt));
    if (toUnread.length) {
      const batch = db.batch();
      toUnread.forEach((doc) => batch.update(doc.ref, { readAt: null }));
      await batch.commit();
      marked += toUnread.length;
    }
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 400) break;
  }

  const houseEvents = await listHouseReleaseActivity(userId);
  const readHouseEvents = houseEvents.filter((event) => event.readAt);
  for (let index = 0; index < readHouseEvents.length; index += 400) {
    const batch = db.batch();
    readHouseEvents.slice(index, index + 400).forEach((event) => {
      batch.set(
        db.doc(`users/${userId}/activityGlobalReads/${event.id}`),
        { readAt: null },
        { merge: true }
      );
    });
    await batch.commit();
  }
  marked += readHouseEvents.length;

  if (marked > 0) {
    const houseMarked = readHouseEvents.length;
    await db.doc(`users/${userId}/activityMeta/summary`).set(
      {
        unreadReceived: FieldValue.increment(marked),
        ...(houseMarked > 0 ? { unreadHouseReleases: FieldValue.increment(houseMarked) } : {}),
        updatedAt: now,
      },
      { merge: true }
    );
  }
  return marked;
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
