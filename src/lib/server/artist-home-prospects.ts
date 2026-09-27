import 'server-only';

import { createHash, randomBytes } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import {
  defaultArtistHomeConfig,
  normalizeArtistHomeConfig,
  artistHomeForPublic,
  type ArtistHomeConfig,
} from '@/lib/profile/modules';
import {
  isValidProfileSlug,
  normalizeProfileSlugInput,
  slugBaseFromDisplayName,
} from '@/lib/profile/profile-slug';
import {
  saveArtistHomeConfig,
  hasPersistedArtistHomeConfig,
} from '@/lib/server/artist-home';
import { updateGamificationSettings } from '@/lib/server/gamification';
import type {
  ArtistHomeProspectAdminRow,
  ArtistHomeProspectRecord,
  ArtistHomeProspectStatus,
  ArtistHomeProspectWallPost,
} from '@/lib/artist-home-prospect';

const COLLECTION = 'artistHomeProspects';

export function newViewToken(): string {
  return randomBytes(24).toString('base64url');
}

export function newClaimSecret(): string {
  return randomBytes(18).toString('base64url');
}

export function hashClaimSecret(secret: string): string {
  return createHash('sha256').update(secret.trim()).digest('hex');
}

function normalizeEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const email = item.trim().toLowerCase();
    if (email.includes('@')) out.add(email);
  }
  return [...out];
}

function normalizeWallPosts(raw: unknown): ArtistHomeProspectWallPost[] {
  if (!Array.isArray(raw)) return [];
  const out: ArtistHomeProspectWallPost[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const text = typeof row.text === 'string' ? row.text.trim().slice(0, 1000) : '';
    if (!text) continue;
    const id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim().slice(0, 80)
        : `${Date.now().toString().padStart(13, '0')}_${Math.random().toString(36).slice(2, 8)}`;
    out.push({
      id,
      text,
      ...(typeof row.embedUrl === 'string' && row.embedUrl.trim()
        ? { embedUrl: row.embedUrl.trim().slice(0, 500) }
        : {}),
      ...(typeof row.imageUrl === 'string' && row.imageUrl.trim()
        ? { imageUrl: row.imageUrl.trim().slice(0, 2000) }
        : {}),
      createdAt:
        typeof row.createdAt === 'string' && row.createdAt.trim()
          ? row.createdAt.trim()
          : new Date().toISOString(),
    });
    if (out.length >= 24) break;
  }
  return out;
}

function docToRecord(id: string, data: Record<string, unknown>): ArtistHomeProspectRecord {
  return {
    id,
    viewToken: String(data.viewToken || ''),
    slug: String(data.slug || ''),
    displayName: String(data.displayName || 'Artist').trim().slice(0, 120) || 'Artist',
    status: (['draft', 'ready', 'sent', 'claimed', 'archived'].includes(String(data.status))
      ? String(data.status)
      : 'draft') as ArtistHomeProspectStatus,
    inviteEmails: normalizeEmails(data.inviteEmails),
    artistHome: normalizeArtistHomeConfig(data.artistHome),
    wallPosts: normalizeWallPosts(data.wallPosts),
    profilePhotoUrl:
      typeof data.profilePhotoUrl === 'string' && data.profilePhotoUrl.trim()
        ? data.profilePhotoUrl.trim().slice(0, 2000)
        : null,
    profilePhotoMode:
      data.profilePhotoMode === 'custom' ||
      data.profilePhotoMode === 'collage' ||
      data.profilePhotoMode === 'initials'
        ? data.profilePhotoMode
        : undefined,
    internalNotes:
      typeof data.internalNotes === 'string' ? data.internalNotes.trim().slice(0, 4000) : undefined,
    contactLabel:
      typeof data.contactLabel === 'string' ? data.contactLabel.trim().slice(0, 120) : undefined,
    createdAt: String(data.createdAt || new Date().toISOString()),
    updatedAt: String(data.updatedAt || new Date().toISOString()),
    createdByAdminUid:
      typeof data.createdByAdminUid === 'string' ? data.createdByAdminUid : undefined,
    publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : undefined,
    sentAt: typeof data.sentAt === 'string' ? data.sentAt : undefined,
    claimedAt: typeof data.claimedAt === 'string' ? data.claimedAt : undefined,
    claimedByUserId:
      typeof data.claimedByUserId === 'string' ? data.claimedByUserId : undefined,
    viewCount: Number.isFinite(Number(data.viewCount)) ? Number(data.viewCount) : 0,
    lastViewedAt: typeof data.lastViewedAt === 'string' ? data.lastViewedAt : undefined,
  };
}

function rowFromRecord(r: ArtistHomeProspectRecord): ArtistHomeProspectAdminRow {
  return {
    id: r.id,
    slug: r.slug,
    displayName: r.displayName,
    status: r.status,
    inviteEmails: r.inviteEmails,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    publishedAt: r.publishedAt,
    sentAt: r.sentAt,
    claimedAt: r.claimedAt,
    viewCount: r.viewCount,
    contactLabel: r.contactLabel,
  };
}

export async function listArtistHomeProspects(
  limit = 200
): Promise<ArtistHomeProspectAdminRow[]> {
  const db = await getDb();
  const snap = await db
    .collection(COLLECTION)
    .orderBy('updatedAt', 'desc')
    .limit(Math.min(500, Math.max(1, limit)))
    .get();
  return snap.docs.map((doc) => rowFromRecord(docToRecord(doc.id, doc.data() as Record<string, unknown>)));
}

export async function getArtistHomeProspectById(
  id: string
): Promise<ArtistHomeProspectRecord | null> {
  const db = await getDb();
  const snap = await db.doc(`${COLLECTION}/${id}`).get();
  if (!snap.exists) return null;
  return docToRecord(snap.id, (snap.data() || {}) as Record<string, unknown>);
}

export async function getArtistHomeProspectByViewToken(
  viewToken: string
): Promise<ArtistHomeProspectRecord | null> {
  const token = viewToken.trim();
  if (!token) return null;
  const db = await getDb();
  const snap = await db
    .collection(COLLECTION)
    .where('viewToken', '==', token)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const record = docToRecord(doc.id, doc.data() as Record<string, unknown>);
  if (record.status === 'archived' || record.status === 'claimed') return null;
  return record;
}

async function slugTakenByOther(
  db: Firestore,
  slug: string,
  prospectId: string
): Promise<boolean> {
  const profileSnap = await db.doc(`publicProfiles/${slug}`).get();
  if (!profileSnap.exists) return false;
  const data = profileSnap.data() || {};
  const userId = typeof data.userId === 'string' ? data.userId : '';
  const heldProspect = typeof data.prospectId === 'string' ? data.prospectId : '';
  if (userId) return true;
  if (heldProspect && heldProspect !== prospectId) return true;
  return false;
}

function resolveSlugCandidate(displayName: string, desired?: string): string {
  const desiredClean = desired ? normalizeProfileSlugInput(desired) : '';
  const base = desiredClean || slugBaseFromDisplayName(displayName);
  return isValidProfileSlug(base) ? base : 'artist';
}

export async function createArtistHomeProspect(input: {
  displayName: string;
  slug?: string;
  inviteEmails?: string[];
  contactLabel?: string;
  internalNotes?: string;
  createdByAdminUid: string;
}): Promise<{ record: ArtistHomeProspectRecord; claimSecret: string }> {
  const db = await getDb();
  const now = new Date().toISOString();
  const displayName = input.displayName.trim().slice(0, 120) || 'Artist';
  let slug = resolveSlugCandidate(displayName, input.slug);
  const prospectId = db.collection(COLLECTION).doc().id;

  for (let i = 0; i < 40; i++) {
    const candidate = i === 0 ? slug : `${slug.slice(0, Math.max(2, 28))}_${i + 1}`;
    if (!isValidProfileSlug(candidate)) continue;
    if (!(await slugTakenByOther(db, candidate, prospectId))) {
      slug = candidate;
      break;
    }
  }

  const viewToken = newViewToken();
  const claimSecret = newClaimSecret();
  const artistHome = defaultArtistHomeConfig();
  artistHome.featured = {
    ...artistHome.featured,
    tagline: `A home for ${displayName} on AKAsheet`,
  };

  const payload = {
    viewToken,
    slug,
    displayName,
    status: 'draft' as ArtistHomeProspectStatus,
    inviteEmails: normalizeEmails(input.inviteEmails),
    claimSecretHash: hashClaimSecret(claimSecret),
    artistHome,
    wallPosts: [],
    internalNotes: input.internalNotes?.trim().slice(0, 4000) || '',
    contactLabel: input.contactLabel?.trim().slice(0, 120) || '',
    createdAt: now,
    updatedAt: now,
    createdByAdminUid: input.createdByAdminUid,
    viewCount: 0,
  };

  await db.doc(`${COLLECTION}/${prospectId}`).set(payload);
  return {
    record: docToRecord(prospectId, payload as Record<string, unknown>),
    claimSecret,
  };
}

export async function updateArtistHomeProspect(
  id: string,
  patch: {
    displayName?: string;
    slug?: string;
    status?: ArtistHomeProspectStatus;
    inviteEmails?: string[];
    artistHome?: ArtistHomeConfig;
    wallPosts?: ArtistHomeProspectWallPost[];
    profilePhotoUrl?: string | null;
    profilePhotoMode?: 'collage' | 'custom' | 'initials';
    internalNotes?: string;
    contactLabel?: string;
    markSent?: boolean;
  }
): Promise<ArtistHomeProspectRecord> {
  const db = await getDb();
  const ref = db.doc(`${COLLECTION}/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Prospect not found.');
  const current = docToRecord(snap.id, (snap.data() || {}) as Record<string, unknown>);
  if (current.status === 'claimed') throw new Error('This profile was already claimed.');

  const now = new Date().toISOString();
  const next: Record<string, unknown> = { updatedAt: now };

  if (typeof patch.displayName === 'string') {
    next.displayName = patch.displayName.trim().slice(0, 120) || current.displayName;
  }
  if (typeof patch.slug === 'string') {
    const slug = normalizeProfileSlugInput(patch.slug);
    if (!isValidProfileSlug(slug)) throw new Error('That profile link is not allowed.');
    if (await slugTakenByOther(db, slug, id)) throw new Error('That profile link is already taken.');
    next.slug = slug;
  }
  if (patch.status) {
    if (!['draft', 'ready', 'sent', 'archived'].includes(patch.status)) {
      throw new Error('Invalid status.');
    }
    next.status = patch.status;
  }
  if (patch.inviteEmails) next.inviteEmails = normalizeEmails(patch.inviteEmails);
  if (patch.artistHome) {
    const normalized = normalizeArtistHomeConfig(patch.artistHome);
    const { featuredTrack: _drop, ...featured } = normalized.featured;
    next.artistHome = { ...normalized, featured };
  }
  if (patch.wallPosts) next.wallPosts = normalizeWallPosts(patch.wallPosts);
  if (patch.profilePhotoUrl !== undefined) {
    next.profilePhotoUrl =
      patch.profilePhotoUrl && patch.profilePhotoUrl.trim()
        ? patch.profilePhotoUrl.trim().slice(0, 2000)
        : null;
  }
  if (patch.profilePhotoMode) next.profilePhotoMode = patch.profilePhotoMode;
  if (typeof patch.internalNotes === 'string') {
    next.internalNotes = patch.internalNotes.trim().slice(0, 4000);
  }
  if (typeof patch.contactLabel === 'string') {
    next.contactLabel = patch.contactLabel.trim().slice(0, 120);
  }
  if (patch.markSent) next.sentAt = now;

  await ref.set(next, { merge: true });
  const merged = docToRecord(id, { ...(snap.data() || {}), ...next } as Record<string, unknown>);

  if (['ready', 'sent'].includes(merged.status)) {
    await mirrorProspectToPublicProfile(db, merged);
  }

  return merged;
}

async function mirrorProspectToPublicProfile(
  db: Firestore,
  record: ArtistHomeProspectRecord
): Promise<void> {
  if (!record.slug || !isValidProfileSlug(record.slug)) return;
  const artistHome = artistHomeForPublic(record.artistHome);
  const wallPosts = record.wallPosts.map((post) => ({
    ...post,
    ownerId: '',
    ownerName: record.displayName,
    ownerSlug: record.slug,
  }));
  await db.doc(`publicProfiles/${record.slug}`).set(
    {
      userId: '',
      prospectId: record.id,
      prospectStatus: record.status,
      displayName: record.displayName,
      displayNameLower: record.displayName.trim().toLowerCase(),
      artistHome,
      prospectWallPosts: wallPosts,
      profilePhotoMode: record.profilePhotoMode || 'custom',
      ...(record.profilePhotoUrl ? { profilePhotoUrl: record.profilePhotoUrl } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  if (!record.publishedAt) {
    await db.doc(`${COLLECTION}/${record.id}`).set(
      { publishedAt: new Date().toISOString() },
      { merge: true }
    );
  }
}

export async function publishArtistHomeProspect(id: string): Promise<ArtistHomeProspectRecord> {
  return updateArtistHomeProspect(id, { status: 'ready' });
}

export async function unpublishArtistHomeProspect(id: string): Promise<ArtistHomeProspectRecord> {
  const db = await getDb();
  const record = await getArtistHomeProspectById(id);
  if (!record) throw new Error('Prospect not found.');
  if (record.status === 'claimed') throw new Error('Already claimed.');
  if (record.slug) {
    const snap = await db.doc(`publicProfiles/${record.slug}`).get();
    if (snap.exists && String(snap.data()?.prospectId || '') === id) {
      await snap.ref.delete();
    }
  }
  return updateArtistHomeProspect(id, { status: 'draft' });
}

export async function regenerateProspectClaimSecret(
  id: string
): Promise<{ claimSecret: string }> {
  const db = await getDb();
  const ref = db.doc(`${COLLECTION}/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Prospect not found.');
  const claimSecret = newClaimSecret();
  await ref.set(
    {
      claimSecretHash: hashClaimSecret(claimSecret),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return { claimSecret };
}

export async function recordProspectView(id: string): Promise<void> {
  const db = await getDb();
  await db.doc(`${COLLECTION}/${id}`).set(
    {
      viewCount: FieldValue.increment(1),
      lastViewedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function verifyProspectClaimSecret(
  prospectId: string,
  claimSecret: string | undefined
): Promise<boolean> {
  const db = await getDb();
  const snap = await db.doc(`${COLLECTION}/${prospectId}`).get();
  if (!snap.exists) return false;
  const hash = String(snap.data()?.claimSecretHash || '');
  if (!hash) return true;
  if (!claimSecret?.trim()) return false;
  return hashClaimSecret(claimSecret) === hash;
}

async function seedProspectWallPosts(
  db: Firestore,
  userId: string,
  displayName: string,
  slug: string,
  posts: ArtistHomeProspectWallPost[]
): Promise<void> {
  if (!posts.length) return;
  const batch = db.batch();
  for (const post of posts.slice(0, 24)) {
    const ref = db.collection('posts').doc(post.id);
    batch.set(ref, {
      ownerId: userId,
      ownerName: displayName,
      ownerSlug: slug,
      text: post.text,
      ...(post.embedUrl ? { embedUrl: post.embedUrl } : {}),
      ...(post.imageUrl ? { imageUrl: post.imageUrl } : {}),
      createdAt: post.createdAt || new Date().toISOString(),
      sourceKind: 'post',
    });
  }
  await batch.commit();
}

export async function claimArtistHomeProspect(input: {
  userId: string;
  userEmail: string;
  prospectId: string;
  claimSecret?: string;
}): Promise<{ slug: string; displayName: string }> {
  const db = await getDb();
  const ref = db.doc(`${COLLECTION}/${input.prospectId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('This invite is no longer available.');
  const record = docToRecord(snap.id, (snap.data() || {}) as Record<string, unknown>);
  if (record.status === 'claimed') throw new Error('This profile was already claimed.');
  if (!['ready', 'sent'].includes(record.status)) {
    throw new Error('This profile is not ready to claim yet.');
  }

  const email = input.userEmail.trim().toLowerCase();
  if (record.inviteEmails.length > 0) {
    if (!email || !record.inviteEmails.includes(email)) {
      throw new Error('Sign in with the email address we sent this invite to.');
    }
  }

  const secretOk = await verifyProspectClaimSecret(input.prospectId, input.claimSecret);
  if (!secretOk) throw new Error('Invalid or missing claim link. Use the link from your invite.');

  if (await hasPersistedArtistHomeConfig(input.userId)) {
    throw new Error('You already have an Artist Home on this account.');
  }

  const profileSnap = await db.doc(`publicProfiles/${record.slug}`).get();
  const heldProspect = profileSnap.exists ? String(profileSnap.data()?.prospectId || '') : '';
  if (profileSnap.exists) {
    const ownerId = String(profileSnap.data()?.userId || '');
    if (ownerId && ownerId !== input.userId) {
      throw new Error('That profile link is already taken.');
    }
    if (heldProspect && heldProspect !== record.id) {
      throw new Error('That profile link is already taken.');
    }
  }

  const now = new Date().toISOString();
  await saveArtistHomeConfig(input.userId, record.artistHome);
  await updateGamificationSettings(input.userId, {
    displayName: record.displayName,
    profileSlug: record.slug,
    allowProspectId: record.id,
    publicProfile: true,
    profilePhotoMode: record.profilePhotoMode || (record.profilePhotoUrl ? 'custom' : 'initials'),
    profilePhotoUrl: record.profilePhotoUrl || null,
  });

  await seedProspectWallPosts(db, input.userId, record.displayName, record.slug, record.wallPosts);

  await ref.set(
    {
      status: 'claimed',
      claimedAt: now,
      claimedByUserId: input.userId,
      updatedAt: now,
    },
    { merge: true }
  );

  await db.doc(`publicProfiles/${record.slug}`).set(
    {
      userId: input.userId,
      prospectId: FieldValue.delete(),
      prospectStatus: FieldValue.delete(),
      prospectWallPosts: FieldValue.delete(),
      displayName: record.displayName,
      displayNameLower: record.displayName.trim().toLowerCase(),
      updatedAt: now,
    },
    { merge: true }
  );

  return { slug: record.slug, displayName: record.displayName };
}

export function prospectPublicProfileFromRecord(
  record: ArtistHomeProspectRecord
): Record<string, unknown> {
  const wallPosts = record.wallPosts.map((post) => ({
    ...post,
    ownerId: '',
    ownerName: record.displayName,
    ownerSlug: record.slug,
  }));
  return {
    slug: record.slug,
    displayName: record.displayName,
    userId: '',
    prospectId: record.id,
    prospectStatus: record.status,
    artistHome: artistHomeForPublic(record.artistHome),
    prospectWallPosts: wallPosts,
    profilePhotoMode: record.profilePhotoMode || 'custom',
    profilePhotoUrl: record.profilePhotoUrl || null,
    albumCoverUrls: [],
    liveDnaDrops: [],
    xp: 0,
    currentStreak: 0,
  };
}
