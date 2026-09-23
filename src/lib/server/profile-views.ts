import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { enrichProfileViewTick, type VisitorContext } from '@/lib/server/reach-analytics';

export async function resolveCanonicalProfileSlug(
  db: Firestore,
  ownerId: string,
  hintSlug?: string
): Promise<string | null> {
  const uid = ownerId.trim();
  if (!uid) return null;

  try {
    const summarySnap = await db.doc(`users/${uid}/gamification/summary`).get();
    const claimed =
      typeof summarySnap.data()?.profileSlug === 'string'
        ? String(summarySnap.data()!.profileSlug).trim()
        : '';
    if (claimed) {
      const claimedSnap = await db.doc(`publicProfiles/${claimed}`).get();
      if (claimedSnap.exists && String(claimedSnap.data()?.userId || '') === uid) return claimed;
    }
  } catch {
    /* fall through */
  }

  if (hintSlug?.trim()) {
    const { resolvePublicProfileSlugDoc } = await import('@/lib/server/profile-slug');
    const resolved = await resolvePublicProfileSlugDoc(db, hintSlug.trim());
    if (resolved?.userId === uid) return resolved.slug;
  }

  try {
    const byUser = await db.collection('publicProfiles').where('userId', '==', uid).limit(5).get();
    if (byUser.docs.length === 1) return byUser.docs[0]!.id;
    const underscore = byUser.docs.find((d) => d.id.includes('_') && !d.id.includes('-'));
    if (underscore) return underscore.id;
    return byUser.docs[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Mirror a wall-post viewer tick onto Artist Home reach (same visitor id). */
export async function mirrorPostViewTickToProfile(
  db: Firestore,
  input: {
    ownerId: string;
    tickId: string;
    viewerId?: string | null;
    guestId?: string | null;
    at?: string;
    hintSlug?: string;
  }
): Promise<void> {
  const ownerId = input.ownerId.trim();
  const tickId = input.tickId.trim().slice(0, 120);
  if (!ownerId || !tickId) return;

  const slug = await resolveCanonicalProfileSlug(db, ownerId, input.hintSlug);
  if (!slug) return;

  const profileRef = db.doc(`publicProfiles/${slug}`);
  const tickRef = profileRef.collection('profileViewTicks').doc(tickId);
  const tickSnap = await tickRef.get();
  if (tickSnap.exists) return;

  const uid = input.viewerId?.trim() || '';
  const guest = (input.guestId || '').trim().toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 64);
  const nowIso = input.at || new Date().toISOString();
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
    source: 'wall_post',
  });
  await batch.commit();
}

/** Unique people who opened an Artist Home. Owner views never count. */
export async function recordProfileView(
  db: Firestore,
  input: {
    slug: string;
    ownerId: string;
    viewerId?: string | null;
    guestId?: string | null;
    ctx?: VisitorContext;
  }
): Promise<{ counted: boolean; profileViewCount?: number }> {
  const ownerId = input.ownerId.trim();
  if (!ownerId) return { counted: false };

  const canonical =
    (await resolveCanonicalProfileSlug(db, ownerId, input.slug)) ||
    input.slug.trim().slice(0, 80);
  const slug = canonical.trim().slice(0, 80);
  if (!slug) return { counted: false };

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
    ...enrichProfileViewTick(input.ctx || {}),
  });
  await batch.commit();

  const after = Number.isFinite(existing) && existing > 0 ? existing : 0;
  return { counted: true, profileViewCount: after + 1 };
}

/** Total wall post opens for an artist (deduped per post, repeats across posts count). */
export async function sumWallPostOpensForOwner(db: Firestore, ownerId: string): Promise<number> {
  const uid = ownerId.trim();
  if (!uid) return 0;
  try {
    const posts = await db.collection('posts').where('ownerId', '==', uid).get();
    let sum = 0;
    for (const doc of posts.docs) {
      const n = Number(doc.data()?.viewCount);
      if (Number.isFinite(n) && n > 0) sum += Math.floor(n);
    }
    return sum;
  } catch {
    return 0;
  }
}

export function readProfileViewCount(data: Record<string, unknown> | undefined): number {
  const n = Number(data?.profileViewCount);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

async function profileTickCountForSlug(db: Firestore, slug: string): Promise<number> {
  const clean = slug.trim().slice(0, 80);
  if (!clean) return 0;
  try {
    const countSnap = await db.collection(`publicProfiles/${clean}/profileViewTicks`).count().get();
    const fromTicks = countSnap.data().count;
    return Number.isFinite(fromTicks) && fromTicks >= 0 ? fromTicks : 0;
  } catch {
    return 0;
  }
}

/** Sum ticks + legacy fields across every publicProfiles doc for this artist (slug renames). */
export async function resolveProfileViewCountForOwner(
  db: Firestore,
  ownerId: string,
  primarySlug: string,
  primaryData: Record<string, unknown> | undefined
): Promise<number> {
  const uid = ownerId.trim();
  let maxField = readProfileViewCount(primaryData);
  let maxLegacy = readLegacyProfilePageLoads(primaryData);
  let tickSum = await profileTickCountForSlug(db, primarySlug);

  if (!uid) {
    return Math.max(maxField, tickSum, maxLegacy > 0 ? maxLegacy : 0);
  }

  try {
    const docs = await db.collection('publicProfiles').where('userId', '==', uid).get();
    for (const doc of docs.docs) {
      if (doc.id === primarySlug.trim()) continue;
      const d = doc.data() || {};
      maxField = Math.max(maxField, readProfileViewCount(d));
      maxLegacy = Math.max(maxLegacy, readLegacyProfilePageLoads(d));
      tickSum += await profileTickCountForSlug(db, doc.id);
    }
  } catch {
    /* keep primary-only */
  }

  const legacyBoost = maxLegacy > 0 ? maxLegacy : 0;
  if (tickSum > 0) return Math.max(tickSum, legacyBoost);
  return Math.max(maxField, legacyBoost);
}

/** Unique profile visits = stored counter vs tick docs (whichever is higher). */
export async function resolveProfileViewCount(
  db: Firestore,
  slug: string,
  data: Record<string, unknown> | undefined,
  ownerId?: string
): Promise<number> {
  const uid = typeof ownerId === 'string' ? ownerId.trim() : typeof data?.userId === 'string' ? data.userId.trim() : '';
  if (uid) {
    return resolveProfileViewCountForOwner(db, uid, slug, data);
  }
  const fromField = readProfileViewCount(data);
  const fromTicks = await profileTickCountForSlug(db, slug);
  const legacy = readLegacyProfilePageLoads(data);
  if (fromTicks > 0) return Math.max(fromTicks, legacy > 0 ? legacy : 0);
  return Math.max(fromField, legacy > 0 ? legacy : 0);
}

const LEGACY_PROFILE_VIEW_KEYS = [
  'views',
  'pageViews',
  'profilePageViews',
  'legacyPageLoads',
  'legacyProfileViews',
] as const;

/** Older counters that may exist on publicProfiles before unique ticks. */
export function readLegacyProfilePageLoads(data: Record<string, unknown> | undefined): number {
  let max = 0;
  for (const key of LEGACY_PROFILE_VIEW_KEYS) {
    const n = Number(data?.[key]);
    if (Number.isFinite(n) && n > max) max = Math.floor(n);
  }
  return max;
}

/** Header + API: unique deduped landings only (never legacy share.views). */
export function displayProfileReachCount(_data: Record<string, unknown> | undefined): number {
  return readProfileViewCount(_data);
}
