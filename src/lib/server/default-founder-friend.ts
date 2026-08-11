import 'server-only';

import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  NEOMAIYA_PLAYGROUND_FRIEND,
  NEOMAIYA_SOL,
  looksLikeNeomaiyaSol,
  pickNeomaiyaGuestbookWelcome,
} from '@/lib/profile/neomaiya-sol';
import { resolveNeomaiyaPublicSlug } from '@/lib/server/neomaiya-profile';

function friendshipIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/**
 * Drop accepted friendships that look like Neomaiya Sol but aren't her
 * current Auth account (common after she re-created her profile / uid).
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
    .where('status', '==', 'accepted')
    .limit(120)
    .get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as {
      uids?: string[];
      profiles?: Record<string, { name?: string; slug?: string }>;
    };
    const otherId = (data.uids || []).find((u) => u !== userId);
    if (!otherId || otherId === realNeoUid) continue;

    const profile = data.profiles?.[otherId];
    if (!looksLikeNeomaiyaSol(profile?.name, profile?.slug)) continue;

    try {
      const other = await auth.getUser(otherId);
      if (other.email?.trim().toLowerCase() === NEOMAIYA_SOL.email.toLowerCase()) {
        continue;
      }
    } catch {
      // Auth user gone — safe to remove the stale edge.
    }

    await docSnap.ref.delete();
  }
}

/**
 * Neo should never see herself (or playground / stale Neo mirrors) in her circle.
 */
async function cleanupNeomaiyaOwnCircle(db: Firestore, neoUid: string): Promise<void> {
  const snap = await db
    .collection('friendships')
    .where('uids', 'array-contains', neoUid)
    .limit(120)
    .get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as {
      uids?: string[];
      profiles?: Record<string, { name?: string; slug?: string }>;
    };
    const uids = data.uids || [];
    const otherId = uids.find((u) => u !== neoUid);

    // Broken self-pair or playground Neo.
    if (!otherId || otherId === neoUid || otherId === NEOMAIYA_PLAYGROUND_FRIEND.userId) {
      await docSnap.ref.delete();
      continue;
    }

    const profile = data.profiles?.[otherId];
    // Stale Neo clone accounts still labeled as Neomaiya Sol in her circle.
    if (looksLikeNeomaiyaSol(profile?.name, profile?.slug)) {
      await docSnap.ref.delete();
    }
  }
}

/**
 * Every new (and returning-without-seed) artist starts with Neomaiya Sol as
 * an accepted friend, plus her guestbook welcome on their Artist Home.
 * Admin-only writes — client rules cannot create accepted friendships.
 *
 * Seed once: if the artist later unfriends Neo, do not recreate the edge on
 * every usage-init. They can send a normal request to reconnect.
 */
export async function ensureDefaultFounderWelcome(
  db: Firestore,
  auth: Auth,
  newUserId: string,
  newUser: { name: string; slug?: string }
): Promise<void> {
  if (!newUserId) return;

  let neo;
  try {
    neo = await auth.getUserByEmail(NEOMAIYA_SOL.email);
  } catch {
    console.warn('[founder-welcome] Neomaiya Sol account not found for', NEOMAIYA_SOL.email);
    return;
  }

  if (neo.uid === newUserId) {
    await cleanupNeomaiyaOwnCircle(db, neo.uid);
    return;
  }

  await cleanupStaleNeomaiyaFriendships(db, auth, newUserId, neo.uid);

  const neoName = neo.displayName?.trim() || NEOMAIYA_SOL.displayName;
  const neoSlug = await resolveNeomaiyaPublicSlug(db, neo.uid);

  // Keep Neo's gamification slug on the live public doc (avoids seeding stale chips).
  try {
    await db.doc(`users/${neo.uid}/gamification/summary`).set({ profileSlug: neoSlug }, { merge: true });
  } catch {
    /* ignore */
  }

  const meName = newUser.name.trim() || 'Artist';
  const now = new Date().toISOString();

  const pairId = friendshipIdFor(newUserId, neo.uid);
  const friendshipRef = db.doc(`friendships/${pairId}`);
  const friendshipSnap = await friendshipRef.get();
  const userRef = db.doc(`users/${newUserId}`);
  const userSnap = await userRef.get();
  const alreadySeeded = Boolean(
    (userSnap.data() as { founderWelcome?: { friendshipSeededAt?: string } } | undefined)
      ?.founderWelcome?.friendshipSeededAt
  );
  let dismissed = false;
  try {
    const dismissalSnap = await db.doc(`founderFriendDismissals/${pairId}`).get();
    dismissed = dismissalSnap.exists;
  } catch {
    /* ignore */
  }

  const neoProfile = {
    name: neoName,
    slug: neoSlug,
  };
  const meProfile = {
    name: meName,
    ...(newUser.slug ? { slug: newUser.slug } : {}),
  };

  if (!friendshipSnap.exists) {
    if (alreadySeeded || dismissed) {
      // Artist or Neo removed the friendship after the welcome seed — respect it.
    } else {
      const uids = [newUserId, neo.uid].sort() as [string, string];
      await friendshipRef.set({
        uids,
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
    // Refresh Neo's live slug/name (fixes stale neomaiya-sol-* chips).
    // Neo-originated pending invites are upgraded to accepted — she is the
    // founder welcome, not a normal request that needs Accept.
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
    if (!alreadySeeded) {
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

  const guestbookRef = db.doc(`guestbooks/${newUserId}/entries/${neo.uid}`);
  const guestbookSnap = await guestbookRef.get();
  if (!guestbookSnap.exists) {
    await guestbookRef.set({
      authorId: neo.uid,
      authorName: neoName,
      authorSlug: neoSlug,
      text: pickNeomaiyaGuestbookWelcome(newUserId),
      createdAt: now,
      seededBy: 'founder-welcome',
    });
  } else {
    await guestbookRef.set(
      {
        authorName: neoName,
        authorSlug: neoSlug,
      },
      { merge: true }
    );
  }
}
