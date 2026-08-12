import 'server-only';

import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  NEOMAIYA_PLAYGROUND_FRIEND,
  NEOMAIYA_SOL,
  NEOMAIYA_SOL_LEGACY_EMAILS,
  isLegacyNeomaiyaSolEmail,
  isNeomaiyaSolEmail,
  looksLikeNeomaiyaSol,
} from '@/lib/profile/neomaiya-sol';
import {
  JORDIE_CRUZ,
  pickJordieGuestbookWelcome,
} from '@/lib/profile/jordie-cruz';
import { resolveNeomaiyaPublicSlug } from '@/lib/server/neomaiya-profile';

function friendshipIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

async function resolveJordiePublicSlug(db: Firestore, jordieUid: string): Promise<string> {
  try {
    const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');
    const live = await resolveLiveUnderscoreProfileSlug(db, jordieUid, {
      displayName: JORDIE_CRUZ.displayName,
      currentSlugHint: JORDIE_CRUZ.slug,
    });
    if (live) return live;
  } catch {
    /* keep preferred */
  }
  return JORDIE_CRUZ.slug;
}

type ChipProfile = { name: string; slug?: string };

/** Accepted founder edge (Neo or Jordie). Clears dismissals when force=true. */
async function upsertAcceptedFounderFriendship(
  db: Firestore,
  ownerId: string,
  founderUid: string,
  meProfile: ChipProfile,
  founderProfile: ChipProfile,
  opts?: { force?: boolean; seededBy?: string }
): Promise<'wrote' | 'skipped'> {
  if (!ownerId || !founderUid || ownerId === founderUid) return 'skipped';

  const pairId = friendshipIdFor(ownerId, founderUid);
  const force = Boolean(opts?.force);
  const seededBy = opts?.seededBy || 'founder-welcome';
  const now = new Date().toISOString();

  if (force) {
    try {
      await db.doc(`founderFriendDismissals/${pairId}`).delete();
    } catch {
      /* ignore */
    }
  } else {
    try {
      if ((await db.doc(`founderFriendDismissals/${pairId}`).get()).exists) {
        return 'skipped';
      }
    } catch {
      /* continue */
    }
  }

  const friendshipRef = db.doc(`friendships/${pairId}`);
  const existing = await friendshipRef.get();
  const prev = (existing.data() || {}) as Record<string, unknown>;
  const prevProfiles =
    prev.profiles && typeof prev.profiles === 'object'
      ? (prev.profiles as Record<string, unknown>)
      : {};

  await friendshipRef.set(
    {
      uids: [ownerId, founderUid].sort(),
      requestedBy: typeof prev.requestedBy === 'string' ? prev.requestedBy : founderUid,
      status: 'accepted',
      profiles: {
        ...prevProfiles,
        [ownerId]: {
          ...((prevProfiles[ownerId] as object) || {}),
          ...meProfile,
        },
        [founderUid]: founderProfile,
      },
      createdAt:
        typeof prev.createdAt === 'string' && prev.createdAt.trim() ? prev.createdAt : now,
      respondedAt: now,
      seededBy,
    },
    { merge: true }
  );
  return 'wrote';
}

async function removeNeoFounderGuestbook(
  db: Firestore,
  ownerId: string,
  neoUid: string | null
): Promise<void> {
  if (neoUid) {
    try {
      await db.doc(`guestbooks/${ownerId}/entries/${neoUid}`).delete();
    } catch {
      /* ignore */
    }
  }
  // Catch leftover Neo-named founder lines under other doc ids.
  try {
    const snap = await db.collection(`guestbooks/${ownerId}/entries`).limit(40).get();
    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      const seeded = data.seededBy === 'founder-welcome';
      const name = String(data.authorName || '');
      const slug = String(data.authorSlug || '');
      if (seeded && looksLikeNeomaiyaSol(name, slug)) {
        await docSnap.ref.delete();
      }
    }
  } catch {
    /* ignore */
  }
}

async function upsertJordieGuestbook(
  db: Firestore,
  ownerId: string,
  jordieUid: string,
  jordieSlug: string
): Promise<void> {
  const now = new Date().toISOString();
  const guestbookRef = db.doc(`guestbooks/${ownerId}/entries/${jordieUid}`);
  const gbSnap = await guestbookRef.get();
  if (!gbSnap.exists) {
    await guestbookRef.set({
      authorId: jordieUid,
      authorName: JORDIE_CRUZ.displayName,
      authorSlug: jordieSlug,
      text: pickJordieGuestbookWelcome(ownerId),
      createdAt: now,
      seededBy: 'founder-welcome',
    });
  } else {
    await guestbookRef.set(
      {
        authorId: jordieUid,
        authorName: JORDIE_CRUZ.displayName,
        authorSlug: jordieSlug,
      },
      { merge: true }
    );
  }
}

/** Auth uids that used to be mistaken for Neo (e.g. neomaiyasol@ → Mike Hills). */
export async function resolveLegacyNeomaiyaUids(auth: Auth, realNeoUid: string): Promise<string[]> {
  const out: string[] = [];
  for (const email of NEOMAIYA_SOL_LEGACY_EMAILS) {
    try {
      const user = await auth.getUserByEmail(email);
      if (user.uid && user.uid !== realNeoUid) out.push(user.uid);
    } catch {
      /* account gone */
    }
  }
  return out;
}

/**
 * Per-artist cleanup: drop friendships + guestbook lines authored by the
 * wrong Neo email account so Mike Hills never appears as founder welcome.
 */
async function purgeLegacyNeomaiyaArtifactsForUser(
  db: Firestore,
  userId: string,
  realNeoUid: string,
  legacyUids: string[]
): Promise<void> {
  for (const legacyUid of legacyUids) {
    if (!legacyUid || legacyUid === realNeoUid || legacyUid === userId) continue;

    const pairId = friendshipIdFor(userId, legacyUid);
    try {
      await db.doc(`friendships/${pairId}`).delete();
    } catch {
      /* ignore */
    }

    try {
      await db.doc(`guestbooks/${userId}/entries/${legacyUid}`).delete();
    } catch {
      /* ignore */
    }

    try {
      await db.doc(`founderFriendDismissals/${pairId}`).delete();
    } catch {
      /* ignore */
    }
  }

  // Catch renamed accounts (Mike no longer on legacy email): any guestbook line
  // that *claims* to be Neo but isn't the live Neo uid.
  try {
    const gbSnap = await db.collection(`guestbooks/${userId}/entries`).limit(80).get();
    for (const docSnap of gbSnap.docs) {
      const data = docSnap.data() || {};
      const authorId = String(data.authorId || docSnap.id);
      if (authorId === realNeoUid) {
        // Heal slug/name on the real Neo welcome.
        if (
          looksLikeNeomaiyaSol(String(data.authorName || ''), String(data.authorSlug || '')) ||
          data.seededBy === 'founder-welcome'
        ) {
          await docSnap.ref.set(
            {
              authorId: realNeoUid,
              authorName: NEOMAIYA_SOL.displayName,
              authorSlug: NEOMAIYA_SOL.slug,
            },
            { merge: true }
          );
        }
        continue;
      }
      const name = String(data.authorName || '');
      const slug = String(data.authorSlug || '');
      const seeded = data.seededBy === 'founder-welcome';
      if (seeded || looksLikeNeomaiyaSol(name, slug)) {
        await docSnap.ref.delete();
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Drop accepted friendships that look like Neomaiya Sol but aren't her
 * current Auth account (common after she re-created her profile / uid).
 * Also drops edges to legacy Neo emails even after they renamed (Mike Hills).
 * Does NOT delete real artists who only have a stale Neo-looking chip slug.
 */
async function cleanupStaleNeomaiyaFriendships(
  db: Firestore,
  auth: Auth,
  userId: string,
  realNeoUid: string
): Promise<void> {
  const snap = await db
    .collection('friendships')
    .where('uids', 'array-contains', userId)
    .limit(200)
    .get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as {
      uids?: string[];
      profiles?: Record<string, { name?: string; slug?: string }>;
    };
    const otherId = (data.uids || []).find((u) => u !== userId);
    if (!otherId || otherId === realNeoUid) continue;

    try {
      const other = await auth.getUser(otherId);
      const otherEmail = other.email?.trim().toLowerCase() || '';
      if (isNeomaiyaSolEmail(otherEmail)) continue;
      if (isLegacyNeomaiyaSolEmail(otherEmail)) {
        await docSnap.ref.delete();
      }
      // Stale Neo-looking chip on a real account — keep friendship.
    } catch {
      // Auth user gone: only drop if the chip still claims to be Neo.
      const profile = data.profiles?.[otherId];
      if (looksLikeNeomaiyaSol(profile?.name, profile?.slug)) {
        await docSnap.ref.delete();
      }
    }
  }
}

/**
 * Neo should never see herself (or playground / stale Neo mirrors) in her circle.
 * Only remove true mirrors / legacy mistaken Neo accounts — never wipe real friends.
 */
async function cleanupNeomaiyaOwnCircle(
  db: Firestore,
  auth: Auth,
  neoUid: string,
  legacyUids: string[]
): Promise<void> {
  const snap = await db
    .collection('friendships')
    .where('uids', 'array-contains', neoUid)
    .limit(200)
    .get();

  const legacySet = new Set(legacyUids);

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as {
      uids?: string[];
      profiles?: Record<string, { name?: string; slug?: string }>;
    };
    const uids = data.uids || [];
    const otherId = uids.find((u) => u !== neoUid);

    // Broken self-pair, playground Neo, or legacy mistaken Neo account.
    if (
      !otherId ||
      otherId === neoUid ||
      otherId === NEOMAIYA_PLAYGROUND_FRIEND.userId ||
      legacySet.has(otherId)
    ) {
      await docSnap.ref.delete();
      continue;
    }

    // Only drop Neo-looking chips when Auth proves it's not a real separate artist
    // (legacy email) or the Auth user is gone. Never delete just because the
    // friendship chip still carries a stale neomaiya_* slug.
    const profile = data.profiles?.[otherId];
    if (!looksLikeNeomaiyaSol(profile?.name, profile?.slug)) continue;

    try {
      const other = await auth.getUser(otherId);
      if (isNeomaiyaSolEmail(other.email)) continue;
      if (isLegacyNeomaiyaSolEmail(other.email)) {
        await docSnap.ref.delete();
      }
      // Real account with a stale Neo-looking chip — keep the friendship; live enrich fixes the link.
    } catch (err: unknown) {
      // Only delete when Auth confirms the user is gone — never on transient failures.
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code || '')
          : '';
      if (code === 'auth/user-not-found') {
        await docSnap.ref.delete();
      }
    }
  }
}

/**
 * Global-ish repair: strip legacy Neo uid from friendships that still list it,
 * and delete founder guestbook entries authored under that uid.
 * Reseeds the canonical Neo welcome for each touched artist.
 */
export async function repairMisattributedNeomaiyaIdentity(
  db: Firestore,
  auth: Auth
): Promise<{
  realNeoUid: string;
  legacyUids: string[];
  friendshipsDeleted: number;
  guestbookEntriesDeleted: number;
  artistsReseeded: number;
  profileSlug: string;
  circleAttempted: number;
  circleReseeded: number;
  circleSkipped: number;
  neoFriendCount: number;
  jordieAttempted: number;
  jordieReseeded: number;
  jordieFriendCount: number;
  jordieGuestbookMoved: number;
}> {
  let neo;
  try {
    neo = await auth.getUserByEmail(NEOMAIYA_SOL.email);
  } catch {
    throw new Error(`Canonical Neo account not found: ${NEOMAIYA_SOL.email}`);
  }

  // Keep Auth display name on the canonical account.
  try {
    if ((neo.displayName || '').trim() !== NEOMAIYA_SOL.displayName) {
      await auth.updateUser(neo.uid, { displayName: NEOMAIYA_SOL.displayName });
    }
  } catch {
    /* optional */
  }

  const legacyUids = await resolveLegacyNeomaiyaUids(auth, neo.uid);
  let friendshipsDeleted = 0;
  let guestbookEntriesDeleted = 0;
  const ownersToReseed = new Set<string>();

  for (const legacyUid of legacyUids) {
    const friendSnap = await db
      .collection('friendships')
      .where('uids', 'array-contains', legacyUid)
      .limit(500)
      .get();
    for (const docSnap of friendSnap.docs) {
      const uids = (docSnap.data()?.uids || []) as string[];
      for (const uid of uids) {
        if (uid && uid !== legacyUid) ownersToReseed.add(uid);
      }
      await docSnap.ref.delete();
      friendshipsDeleted += 1;
    }

    // Delete ALL guestbook lines by the legacy uid (not only founder-welcome).
    try {
      const gbSnap = await db
        .collectionGroup('entries')
        .where('authorId', '==', legacyUid)
        .limit(500)
        .get();
      for (const docSnap of gbSnap.docs) {
        if (!docSnap.ref.path.startsWith('guestbooks/')) continue;
        const ownerId = docSnap.ref.parent.parent?.id;
        if (ownerId) ownersToReseed.add(ownerId);
        await docSnap.ref.delete();
        guestbookEntriesDeleted += 1;
      }
    } catch (err) {
      console.warn('[neomaiya-repair] guestbook by authorId query failed', err);
    }
  }

  // Catch entries that still say "Neomaiya Sol" after Mike renamed / changed email.
  try {
    const namedSnap = await db
      .collectionGroup('entries')
      .where('authorName', '==', NEOMAIYA_SOL.displayName)
      .limit(500)
      .get();
    for (const docSnap of namedSnap.docs) {
      if (!docSnap.ref.path.startsWith('guestbooks/')) continue;
      const authorId = String(docSnap.data()?.authorId || docSnap.id);
      if (authorId === neo.uid) {
        await docSnap.ref.set(
          {
            authorId: neo.uid,
            authorName: NEOMAIYA_SOL.displayName,
            authorSlug: NEOMAIYA_SOL.slug,
          },
          { merge: true }
        );
        continue;
      }
      const ownerId = docSnap.ref.parent.parent?.id;
      if (ownerId) ownersToReseed.add(ownerId);
      await docSnap.ref.delete();
      guestbookEntriesDeleted += 1;
    }
  } catch (err) {
    console.warn('[neomaiya-repair] guestbook by authorName query failed', err);
  }

  // Founder-welcome seeds written under the wrong uid.
  try {
    const seededSnap = await db
      .collectionGroup('entries')
      .where('seededBy', '==', 'founder-welcome')
      .limit(500)
      .get();
    for (const docSnap of seededSnap.docs) {
      if (!docSnap.ref.path.startsWith('guestbooks/')) continue;
      const authorId = String(docSnap.data()?.authorId || docSnap.id);
      if (authorId === neo.uid) {
        await docSnap.ref.set(
          {
            authorId: neo.uid,
            authorName: NEOMAIYA_SOL.displayName,
            authorSlug: NEOMAIYA_SOL.slug,
          },
          { merge: true }
        );
        continue;
      }
      const ownerId = docSnap.ref.parent.parent?.id;
      if (ownerId) ownersToReseed.add(ownerId);
      await docSnap.ref.delete();
      guestbookEntriesDeleted += 1;
    }
  } catch (err) {
    console.warn('[neomaiya-repair] guestbook founder-welcome query failed', err);
  }

  await cleanupNeomaiyaOwnCircle(db, auth, neo.uid, legacyUids);

  // Claim clean /profile/neomaiya_sol for the real Neo account.
  let canonicalSlug: string = NEOMAIYA_SOL.slug;
  try {
    const { forceClaimNeomaiyaCanonicalSlug } = await import('@/lib/server/profile-slug');
    canonicalSlug = await forceClaimNeomaiyaCanonicalSlug(db, neo.uid);
    // Best-effort public mirror refresh so /profile/neomaiya_sol is live.
    try {
      const { updateGamificationSettings } = await import('@/lib/server/gamification');
      await updateGamificationSettings(neo.uid, {
        publicProfile: true,
        profileSlug: canonicalSlug,
        displayName: NEOMAIYA_SOL.displayName,
      });
    } catch {
      /* forceClaim already wrote summary */
    }
  } catch (err) {
    console.warn('[neomaiya-repair] canonical slug claim failed', err);
  }

  let artistsReseeded = 0;
  for (const ownerId of ownersToReseed) {
    if (!ownerId || ownerId === neo.uid) continue;
    let name = 'Artist';
    let slug: string | undefined;
    try {
      const userSnap = await db.doc(`users/${ownerId}`).get();
      const dn = userSnap.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) name = dn.trim();
    } catch {
      /* ignore */
    }
    try {
      const gamSnap = await db.doc(`users/${ownerId}/gamification/summary`).get();
      const s = gamSnap.data()?.profileSlug;
      if (typeof s === 'string' && s.trim()) slug = s.trim();
    } catch {
      /* ignore */
    }
    // Allow reseed even if previously marked — they had the wrong Neo.
    try {
      await db.doc(`users/${ownerId}`).set(
        { founderWelcome: { friendshipSeededAt: '' }, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      /* ignore */
    }
    try {
      await ensureDefaultFounderWelcome(db, auth, ownerId, {
        name,
        ...(slug ? { slug } : {}),
      });
      artistsReseeded += 1;
    } catch (err) {
      console.warn('[neomaiya-repair] reseed failed for', ownerId, err);
    }
  }

  // Best-effort: migrate hyphen / uid-tail vanity slugs across publicProfiles.
  try {
    const { migrateUserProfileSlugToUnderscore } = await import('@/lib/server/profile-slug');
    const { needsVanitySlugUpgrade } = await import('@/lib/profile/profile-slug');
    const pubSnap = await db.collection('publicProfiles').limit(500).get();
    const seen = new Set<string>();
    for (const docSnap of pubSnap.docs) {
      if (!needsVanitySlugUpgrade(docSnap.id)) continue;
      const uid = String(docSnap.data()?.userId || '');
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      try {
        await migrateUserProfileSlugToUnderscore(db, uid, {
          displayName:
            typeof docSnap.data()?.displayName === 'string'
              ? docSnap.data()!.displayName
              : undefined,
          currentSlugHint: docSnap.id,
        });
      } catch {
        /* continue */
      }
    }
  } catch (err) {
    console.warn('[neomaiya-repair] slug underscore migration skipped', err);
  }

  // Always finish by making Neo everyone's accepted friend again.
  let circleReseed = { attempted: 0, reseeded: 0, skipped: 0, neoFriendCount: 0 };
  try {
    circleReseed = await reseedNeomaiyaCircleForAllArtists(db, auth);
  } catch (err) {
    console.warn('[neomaiya-repair] full circle reseed failed', err);
  }

  let jordieReseed = {
    attempted: 0,
    reseeded: 0,
    skipped: 0,
    jordieFriendCount: 0,
    guestbookMoved: 0,
  };
  try {
    jordieReseed = await reseedJordieCruzCircleForAllArtists(db, auth);
  } catch (err) {
    console.warn('[neomaiya-repair] Jordie circle reseed failed', err);
  }

  return {
    realNeoUid: neo.uid,
    legacyUids,
    friendshipsDeleted,
    guestbookEntriesDeleted,
    artistsReseeded,
    profileSlug: canonicalSlug,
    circleAttempted: circleReseed.attempted,
    circleReseeded: circleReseed.reseeded,
    circleSkipped: circleReseed.skipped,
    neoFriendCount: circleReseed.neoFriendCount,
    jordieAttempted: jordieReseed.attempted,
    jordieReseeded: jordieReseed.reseeded,
    jordieFriendCount: jordieReseed.jordieFriendCount,
    jordieGuestbookMoved: jordieReseed.guestbookMoved,
  };
}

/**
 * Force-restore Neo as an accepted friend for every Auth artist.
 * Writes friendship docs directly (status=accepted) so Neo is in every circle
 * and every artist is in Neo's — even after prior seed/dismiss/wipe.
 */
export async function reseedNeomaiyaCircleForAllArtists(
  db: Firestore,
  auth: Auth
): Promise<{
  neoUid: string;
  attempted: number;
  reseeded: number;
  skipped: number;
  neoFriendCount: number;
}> {
  let neo;
  try {
    neo = await auth.getUserByEmail(NEOMAIYA_SOL.email);
  } catch {
    throw new Error(`Canonical Neo account not found: ${NEOMAIYA_SOL.email}`);
  }

  const neoSlug = await resolveNeomaiyaPublicSlug(db, neo.uid);
  const neoProfile = {
    name: NEOMAIYA_SOL.displayName,
    slug: neoSlug || NEOMAIYA_SOL.slug,
  };

  const ownerIds = new Set<string>();

  // 1) Every Firebase Auth account (paginated).
  try {
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const u of page.users) {
        if (u.uid && u.uid !== neo.uid) ownerIds.add(u.uid);
      }
      pageToken = page.pageToken;
    } while (pageToken);
  } catch (err) {
    console.warn('[neomaiya-reseed] auth.listUsers failed', err);
  }

  // 2) publicProfiles + users docs (covers any gap).
  try {
    const pub = await db.collection('publicProfiles').limit(1000).get();
    for (const docSnap of pub.docs) {
      const uid = String(docSnap.data()?.userId || '');
      if (uid && uid !== neo.uid) ownerIds.add(uid);
    }
  } catch (err) {
    console.warn('[neomaiya-reseed] publicProfiles scan failed', err);
  }
  try {
    const users = await db.collection('users').limit(1000).get();
    for (const docSnap of users.docs) {
      if (docSnap.id && docSnap.id !== neo.uid) ownerIds.add(docSnap.id);
    }
  } catch (err) {
    console.warn('[neomaiya-reseed] users scan failed', err);
  }

  let reseeded = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');

  for (const ownerId of ownerIds) {
    let name = 'Artist';
    let slugHint: string | undefined;

    try {
      const authUser = await auth.getUser(ownerId);
      if (authUser.displayName?.trim()) name = authUser.displayName.trim();
    } catch {
      /* may be deleted auth */
    }
    try {
      const userSnap = await db.doc(`users/${ownerId}`).get();
      const dn = userSnap.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) name = dn.trim();
    } catch {
      /* ignore */
    }
    try {
      const gamSnap = await db.doc(`users/${ownerId}/gamification/summary`).get();
      const s = gamSnap.data()?.profileSlug;
      if (typeof s === 'string' && s.trim()) slugHint = s.trim();
      const dn = gamSnap.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) name = dn.trim();
    } catch {
      /* ignore */
    }

    // Always write underscore vanity into Neo friendship chips — never hyphen/uid-tail leftovers.
    let slug: string | undefined;
    try {
      const live = await resolveLiveUnderscoreProfileSlug(db, ownerId, {
        displayName: name,
        currentSlugHint: slugHint,
      });
      if (live) slug = live;
    } catch (err) {
      console.warn('[neomaiya-reseed] underscore slug resolve failed', ownerId, err);
      if (slugHint && !slugHint.includes('-')) slug = slugHint;
    }

    const pairId = friendshipIdFor(ownerId, neo.uid);
    const meProfile = {
      name,
      ...(slug ? { slug } : {}),
    };

    try {
      await db.doc(`founderFriendDismissals/${pairId}`).delete();
    } catch {
      /* ignore */
    }

    try {
      const friendshipRef = db.doc(`friendships/${pairId}`);
      const existing = await friendshipRef.get();
      const prev = (existing.data() || {}) as Record<string, unknown>;
      const prevProfiles =
        prev.profiles && typeof prev.profiles === 'object'
          ? (prev.profiles as Record<string, unknown>)
          : {};

      await friendshipRef.set(
        {
          uids: [ownerId, neo.uid].sort(),
          requestedBy: typeof prev.requestedBy === 'string' ? prev.requestedBy : neo.uid,
          status: 'accepted',
          profiles: {
            ...prevProfiles,
            [ownerId]: {
              ...((prevProfiles[ownerId] as object) || {}),
              ...meProfile,
            },
            [neo.uid]: neoProfile,
          },
          createdAt:
            typeof prev.createdAt === 'string' && prev.createdAt.trim()
              ? prev.createdAt
              : now,
          respondedAt: now,
          seededBy: 'founder-welcome',
        },
        { merge: true }
      );

      await db.doc(`users/${ownerId}`).set(
        { founderWelcome: { friendshipSeededAt: now }, updatedAt: now },
        { merge: true }
      );

      // Guestbook welcome is Jordie Cruz now — do not write Neo guestbook lines.
      try {
        await removeNeoFounderGuestbook(db, ownerId, neo.uid);
      } catch {
        /* ignore */
      }

      reseeded += 1;
    } catch (err) {
      skipped += 1;
      console.warn('[neomaiya-reseed] failed for', ownerId, err);
    }
  }

  let neoFriendCount = 0;
  try {
    const neoSnap = await db
      .collection('friendships')
      .where('uids', 'array-contains', neo.uid)
      .where('status', '==', 'accepted')
      .limit(500)
      .get();
    neoFriendCount = neoSnap.size;
  } catch {
    try {
      const neoSnap = await db
        .collection('friendships')
        .where('uids', 'array-contains', neo.uid)
        .limit(500)
        .get();
      neoFriendCount = neoSnap.docs.filter((d) => d.data()?.status === 'accepted').length;
    } catch {
      /* ignore */
    }
  }

  return {
    neoUid: neo.uid,
    attempted: ownerIds.size,
    reseeded,
    skipped,
    neoFriendCount,
  };
}

/**
 * Force-restore Jordie Cruz as accepted friend for every artist + his guestbook
 * welcome. Removes Neo founder guestbook lines (welcome is Jordie's). Keeps Neo friendships.
 */
export async function reseedJordieCruzCircleForAllArtists(
  db: Firestore,
  auth: Auth
): Promise<{
  jordieUid: string;
  attempted: number;
  reseeded: number;
  skipped: number;
  jordieFriendCount: number;
  guestbookMoved: number;
}> {
  let jordie;
  try {
    jordie = await auth.getUserByEmail(JORDIE_CRUZ.email);
  } catch {
    throw new Error(`Canonical Jordie account not found: ${JORDIE_CRUZ.email}`);
  }

  let neoUid: string | null = null;
  try {
    neoUid = (await auth.getUserByEmail(NEOMAIYA_SOL.email)).uid;
  } catch {
    /* optional */
  }

  const jordieSlug = await resolveJordiePublicSlug(db, jordie.uid);
  const jordieProfile = {
    name: JORDIE_CRUZ.displayName,
    slug: jordieSlug,
  };

  const ownerIds = new Set<string>();
  try {
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const u of page.users) {
        if (u.uid && u.uid !== jordie.uid) ownerIds.add(u.uid);
      }
      pageToken = page.pageToken;
    } while (pageToken);
  } catch (err) {
    console.warn('[jordie-reseed] auth.listUsers failed', err);
  }
  try {
    const pub = await db.collection('publicProfiles').limit(1000).get();
    for (const docSnap of pub.docs) {
      const uid = String(docSnap.data()?.userId || '');
      if (uid && uid !== jordie.uid) ownerIds.add(uid);
    }
  } catch {
    /* ignore */
  }
  try {
    const users = await db.collection('users').limit(1000).get();
    for (const docSnap of users.docs) {
      if (docSnap.id && docSnap.id !== jordie.uid) ownerIds.add(docSnap.id);
    }
  } catch {
    /* ignore */
  }

  let reseeded = 0;
  let skipped = 0;
  let guestbookMoved = 0;
  const now = new Date().toISOString();
  const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');

  for (const ownerId of ownerIds) {
    let name = 'Artist';
    let slugHint: string | undefined;
    try {
      const authUser = await auth.getUser(ownerId);
      if (authUser.displayName?.trim()) name = authUser.displayName.trim();
    } catch {
      /* may be gone */
    }
    try {
      const userSnap = await db.doc(`users/${ownerId}`).get();
      const dn = userSnap.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) name = dn.trim();
    } catch {
      /* ignore */
    }
    try {
      const gamSnap = await db.doc(`users/${ownerId}/gamification/summary`).get();
      const s = gamSnap.data()?.profileSlug;
      if (typeof s === 'string' && s.trim()) slugHint = s.trim();
      const dn = gamSnap.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) name = dn.trim();
    } catch {
      /* ignore */
    }

    let slug: string | undefined;
    try {
      const live = await resolveLiveUnderscoreProfileSlug(db, ownerId, {
        displayName: name,
        currentSlugHint: slugHint,
      });
      if (live) slug = live;
    } catch {
      if (slugHint && !slugHint.includes('-')) slug = slugHint;
    }

    const meProfile = {
      name,
      ...(slug ? { slug } : {}),
    };

    try {
      await upsertAcceptedFounderFriendship(
        db,
        ownerId,
        jordie.uid,
        meProfile,
        jordieProfile,
        { force: true, seededBy: 'founder-welcome' }
      );

      await removeNeoFounderGuestbook(db, ownerId, neoUid);
      await upsertJordieGuestbook(db, ownerId, jordie.uid, jordieSlug);
      guestbookMoved += 1;

      await db.doc(`users/${ownerId}`).set(
        {
          founderWelcome: { jordieSeededAt: now },
          updatedAt: now,
        },
        { merge: true }
      );

      reseeded += 1;
    } catch (err) {
      skipped += 1;
      console.warn('[jordie-reseed] failed for', ownerId, err);
    }
  }

  let jordieFriendCount = 0;
  try {
    const snap = await db
      .collection('friendships')
      .where('uids', 'array-contains', jordie.uid)
      .where('status', '==', 'accepted')
      .limit(500)
      .get();
    jordieFriendCount = snap.size;
  } catch {
    try {
      const snap = await db
        .collection('friendships')
        .where('uids', 'array-contains', jordie.uid)
        .limit(500)
        .get();
      jordieFriendCount = snap.docs.filter((d) => d.data()?.status === 'accepted').length;
    } catch {
      /* ignore */
    }
  }

  return {
    jordieUid: jordie.uid,
    attempted: ownerIds.size,
    reseeded,
    skipped,
    jordieFriendCount,
    guestbookMoved,
  };
}

/**
 * Every new (and returning-without-seed) artist starts with:
 * - Neomaiya Sol as an accepted friend
 * - Jordie Cruz as an accepted friend + guestbook welcome
 *
 * Admin-only writes — client rules cannot create accepted friendships.
 * Seed once per founder: intentional unfriend is respected via dismissals / seed flags.
 */
export async function ensureDefaultFounderWelcome(
  db: Firestore,
  auth: Auth,
  newUserId: string,
  newUser: { name: string; slug?: string }
): Promise<void> {
  if (!newUserId) return;

  let neo: { uid: string } | null = null;
  try {
    neo = await auth.getUserByEmail(NEOMAIYA_SOL.email);
  } catch {
    console.warn('[founder-welcome] Neomaiya Sol account not found for', NEOMAIYA_SOL.email);
  }

  let jordie: { uid: string } | null = null;
  try {
    jordie = await auth.getUserByEmail(JORDIE_CRUZ.email);
  } catch {
    console.warn('[founder-welcome] Jordie Cruz account not found for', JORDIE_CRUZ.email);
  }

  if (!neo && !jordie) return;

  if (neo && neo.uid === newUserId) {
    const legacyUids = await resolveLegacyNeomaiyaUids(auth, neo.uid);
    await cleanupNeomaiyaOwnCircle(db, auth, neo.uid, legacyUids);
    // Neo still gets Jordie as a friend (no guestbook on her own page from self).
    if (jordie && jordie.uid !== neo.uid) {
      const jordieSlug = await resolveJordiePublicSlug(db, jordie.uid);
      const meName = newUser.name.trim() || NEOMAIYA_SOL.displayName;
      let meSlug = newUser.slug?.trim() || NEOMAIYA_SOL.slug;
      try {
        const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');
        const live = await resolveLiveUnderscoreProfileSlug(db, neo.uid, {
          displayName: meName,
          currentSlugHint: meSlug,
        });
        if (live) meSlug = live;
      } catch {
        /* keep */
      }
      await upsertAcceptedFounderFriendship(
        db,
        neo.uid,
        jordie.uid,
        { name: meName, slug: meSlug },
        { name: JORDIE_CRUZ.displayName, slug: jordieSlug },
        { seededBy: 'founder-welcome' }
      );
    }
    return;
  }

  if (jordie && jordie.uid === newUserId) {
    // Jordie gets Neo as a friend; no self guestbook.
    if (neo && neo.uid !== jordie.uid) {
      const neoSlug = await resolveNeomaiyaPublicSlug(db, neo.uid);
      const meName = newUser.name.trim() || JORDIE_CRUZ.displayName;
      let meSlug = newUser.slug?.trim() || JORDIE_CRUZ.slug;
      try {
        const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');
        const live = await resolveLiveUnderscoreProfileSlug(db, jordie.uid, {
          displayName: meName,
          currentSlugHint: meSlug,
        });
        if (live) meSlug = live;
      } catch {
        /* keep */
      }
      await upsertAcceptedFounderFriendship(
        db,
        jordie.uid,
        neo.uid,
        { name: meName, slug: meSlug },
        { name: NEOMAIYA_SOL.displayName, slug: neoSlug || NEOMAIYA_SOL.slug },
        { seededBy: 'founder-welcome' }
      );
    }
    return;
  }

  if (neo) {
    const legacyUids = await resolveLegacyNeomaiyaUids(auth, neo.uid);
    await purgeLegacyNeomaiyaArtifactsForUser(db, newUserId, neo.uid, legacyUids);
    await cleanupStaleNeomaiyaFriendships(db, auth, newUserId, neo.uid);
  }

  const meName = newUser.name.trim() || 'Artist';
  const now = new Date().toISOString();
  const userRef = db.doc(`users/${newUserId}`);
  const userSnap = await userRef.get();
  const welcome = (
    userSnap.data() as {
      founderWelcome?: { friendshipSeededAt?: string; jordieSeededAt?: string };
    } | undefined
  )?.founderWelcome;
  const neoAlreadySeeded = Boolean(
    typeof welcome?.friendshipSeededAt === 'string' && welcome.friendshipSeededAt.trim()
  );
  const jordieAlreadySeeded = Boolean(
    typeof welcome?.jordieSeededAt === 'string' && welcome.jordieSeededAt.trim()
  );

  let meSlug = newUser.slug?.trim() || undefined;
  try {
    const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');
    const live = await resolveLiveUnderscoreProfileSlug(db, newUserId, {
      displayName: meName,
      currentSlugHint: meSlug,
    });
    if (live) meSlug = live;
  } catch {
    /* keep hint */
  }
  const meProfile = {
    name: meName,
    ...(meSlug ? { slug: meSlug } : {}),
  };

  // --- Neo friendship (no guestbook) ---
  if (neo) {
    const neoSlug = (await resolveNeomaiyaPublicSlug(db, neo.uid)) || NEOMAIYA_SOL.slug;
    const neoProfile = { name: NEOMAIYA_SOL.displayName, slug: neoSlug };
    const pairId = friendshipIdFor(newUserId, neo.uid);
    let dismissed = false;
    try {
      dismissed = (await db.doc(`founderFriendDismissals/${pairId}`).get()).exists;
    } catch {
      /* ignore */
    }
    const friendshipRef = db.doc(`friendships/${pairId}`);
    const friendshipSnap = await friendshipRef.get();

    if (!friendshipSnap.exists) {
      if (!neoAlreadySeeded && !dismissed) {
        await friendshipRef.set({
          uids: [newUserId, neo.uid].sort(),
          requestedBy: neo.uid,
          status: 'accepted',
          profiles: {
            [newUserId]: meProfile,
            [neo.uid]: neoProfile,
          },
          createdAt: now,
          respondedAt: now,
          seededBy: 'founder-welcome',
        });
        await userRef.set(
          { founderWelcome: { friendshipSeededAt: now }, updatedAt: now },
          { merge: true }
        );
      }
    } else {
      const prev = friendshipSnap.data() || {};
      const neoPending =
        prev.status === 'pending' && String(prev.requestedBy || '') === neo.uid;
      await friendshipRef.set(
        {
          ...(neoPending
            ? {
                status: 'accepted',
                respondedAt: now,
                seededBy: prev.seededBy || 'founder-welcome',
              }
            : {}),
          profiles: {
            ...(prev.profiles || {}),
            [newUserId]: {
              ...(prev.profiles?.[newUserId] || {}),
              ...meProfile,
            },
            [neo.uid]: neoProfile,
          },
        },
        { merge: true }
      );
      if (!neoAlreadySeeded) {
        await userRef.set(
          { founderWelcome: { friendshipSeededAt: now }, updatedAt: now },
          { merge: true }
        );
      }
      if (neoPending) {
        try {
          const { clearFriendRequestActivityFromActor } = await import('@/lib/server/activity');
          await clearFriendRequestActivityFromActor(newUserId, neo.uid);
        } catch {
          /* optional */
        }
      }
    }

    try {
      await db.doc(`users/${neo.uid}/gamification/summary`).set(
        { profileSlug: neoSlug, displayName: NEOMAIYA_SOL.displayName },
        { merge: true }
      );
    } catch {
      /* ignore */
    }
  }

  // --- Jordie friendship + guestbook (replaces Neo guestbook) ---
  if (jordie) {
    const jordieSlug = await resolveJordiePublicSlug(db, jordie.uid);
    const jordieProfile = { name: JORDIE_CRUZ.displayName, slug: jordieSlug };
    const pairId = friendshipIdFor(newUserId, jordie.uid);
    let dismissed = false;
    try {
      dismissed = (await db.doc(`founderFriendDismissals/${pairId}`).get()).exists;
    } catch {
      /* ignore */
    }
    const friendshipSnap = await db.doc(`friendships/${pairId}`).get();

    if (!friendshipSnap.exists && (jordieAlreadySeeded || dismissed)) {
      // Respect intentional unfriend after seed.
    } else if (!dismissed) {
      await upsertAcceptedFounderFriendship(
        db,
        newUserId,
        jordie.uid,
        meProfile,
        jordieProfile,
        { seededBy: 'founder-welcome' }
      );
      if (!jordieAlreadySeeded) {
        await userRef.set(
          { founderWelcome: { jordieSeededAt: now }, updatedAt: now },
          { merge: true }
        );
      }
    }

    // Always prefer Jordie for the welcome line (even if friendship was dismissed,
    // leave guestbook alone if they unfriended — only write when friendship exists
    // or was just seeded).
    const afterFriend = await db.doc(`friendships/${pairId}`).get();
    if (afterFriend.exists && afterFriend.data()?.status === 'accepted') {
      await removeNeoFounderGuestbook(db, newUserId, neo?.uid || null);
      await upsertJordieGuestbook(db, newUserId, jordie.uid, jordieSlug);
      if (!jordieAlreadySeeded) {
        await userRef.set(
          { founderWelcome: { jordieSeededAt: now }, updatedAt: now },
          { merge: true }
        );
      }
    }
  } else if (neo) {
    // Fallback: if Jordie Auth account is missing, keep Neo guestbook so sandbox isn't blank.
    const guestbookRef = db.doc(`guestbooks/${newUserId}/entries/${neo.uid}`);
    const guestbookSnap = await guestbookRef.get();
    const neoSlug = (await resolveNeomaiyaPublicSlug(db, neo.uid)) || NEOMAIYA_SOL.slug;
    if (!guestbookSnap.exists) {
      const { pickNeomaiyaGuestbookWelcome } = await import('@/lib/profile/neomaiya-sol');
      await guestbookRef.set({
        authorId: neo.uid,
        authorName: NEOMAIYA_SOL.displayName,
        authorSlug: neoSlug,
        text: pickNeomaiyaGuestbookWelcome(newUserId),
        createdAt: now,
        seededBy: 'founder-welcome',
      });
    }
  }
}
