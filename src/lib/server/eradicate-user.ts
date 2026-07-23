import 'server-only';

import type { CollectionReference, DocumentReference, Firestore } from 'firebase-admin/firestore';
import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  clearIdentityRegistry,
  writeIdentityTombstone,
} from '@/lib/server/identity-registry';
import { cancelActiveStripeBillingForUser } from '@/lib/server/cancel-user-stripe-billing';

const BATCH_SIZE = 400;

async function deleteQueryBatch(colRef: CollectionReference): Promise<number> {
  const snapshot = await colRef.limit(BATCH_SIZE).get();
  if (snapshot.empty) return 0;

  const batch = colRef.firestore.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  if (snapshot.size < BATCH_SIZE) return snapshot.size;
  return snapshot.size + (await deleteQueryBatch(colRef));
}

/** Delete all documents in a subcollection (e.g. users/{id}/usageLogs). */
async function deleteSubcollection(
  parentPath: string,
  subcollectionId: string,
  db: Firestore
): Promise<number> {
  const colRef = db.collection(`${parentPath}/${subcollectionId}`);
  return deleteQueryBatch(colRef);
}

async function deleteUserAlbums(userId: string, db: Firestore): Promise<{ albums: number; tracks: number }> {
  const albumsSnap = await db.collection(`users/${userId}/albums`).get();
  let trackCount = 0;

  for (const albumDoc of albumsSnap.docs) {
    trackCount += await deleteSubcollection(`users/${userId}/albums/${albumDoc.id}`, 'tracks', db);
    await albumDoc.ref.delete();
  }

  return { albums: albumsSnap.size, tracks: trackCount };
}

async function deleteUserShares(userId: string, db: Firestore): Promise<number> {
  const sharesSnap = await db.collection('shares').where('ownerId', '==', userId).get();
  if (sharesSnap.empty) return 0;
  const batch = db.batch();
  sharesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return sharesSnap.size;
}

async function deletePublicProfiles(userId: string, db: Firestore): Promise<number> {
  const profilesSnap = await db.collection('publicProfiles').where('userId', '==', userId).get();
  if (profilesSnap.empty) return 0;
  const batch = db.batch();
  profilesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return profilesSnap.size;
}

async function deleteLeaderboardEntries(userId: string, db: Firestore): Promise<number> {
  const weeksSnap = await db.collection('leaderboard_weekly').get();
  if (weeksSnap.empty) return 0;

  let deleted = 0;
  let batch = db.batch();
  let ops = 0;

  for (const weekDoc of weeksSnap.docs) {
    const entryRef = db.doc(`leaderboard_weekly/${weekDoc.id}/entries/${userId}`);
    batch.delete(entryRef);
    ops += 1;
    deleted += 1;
    if (ops >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return deleted;
}

async function deleteReferralRecords(userId: string, db: Firestore): Promise<number> {
  const [asReferrer, asReferred] = await Promise.all([
    db.collection('referrals').where('referrerId', '==', userId).get(),
    db.collection('referrals').where('referredUserId', '==', userId).get(),
  ]);

  const refs = new Map<string, DocumentReference>();
  asReferrer.docs.forEach((doc) => refs.set(doc.id, doc.ref));
  asReferred.docs.forEach((doc) => refs.set(doc.id, doc.ref));

  if (refs.size === 0) return 0;

  const batch = db.batch();
  refs.forEach((ref) => batch.delete(ref));
  await batch.commit();
  return refs.size;
}

export type EradicateMode = 'admin' | 'self';

export type EradicateUserOptions = {
  /**
   * admin — full wipe; email registry cleared so they can return as a brand-new artist.
   * self — tombstone written so welcome Ink cannot be farmed on re-signup.
   */
  mode?: EradicateMode;
};

export type EradicateUserResult = {
  userId: string;
  authDeleted: boolean;
  albumsDeleted: number;
  tracksDeleted: number;
  sharesDeleted: number;
  publicProfilesDeleted: number;
  identityRegistryCleared: boolean;
  analyticsEventsDeleted: number;
  stripeSubscriptionsCanceled: number;
};

async function deleteAnalyticsEventsForUser(userId: string, db: Firestore): Promise<number> {
  let deleted = 0;
  // Paginate — analytics_events can be large for active users.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db
      .collection('analytics_events')
      .where('userId', '==', userId)
      .limit(BATCH_SIZE)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < BATCH_SIZE) break;
  }
  return deleted;
}

/**
 * Full identity eradication — equivalent to deleting the user in Firebase Auth Console
 * plus wiping all studio data (albums, tracks, ink, gamification, shares).
 */
export async function eradicateUserIdentity(
  targetUserId: string,
  actorEmail: string,
  options: EradicateUserOptions = {}
): Promise<EradicateUserResult> {
  const mode: EradicateMode = options.mode ?? 'self';
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Admin credentials required');
  }

  const trimmedId = targetUserId.trim();
  if (!trimmedId) {
    throw new Error('Invalid user id');
  }

  const db = await getDb();
  const userRef = db.doc(`users/${trimmedId}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error('User not found');
  }

  const userData = userSnap.data() || {};
  const displayName = String(userData.displayName || 'Artist');

  const stripeBillingCancel = await cancelActiveStripeBillingForUser(trimmedId, userData);

  let userEmail = String(userData.email || '').trim();
  if (!userEmail) {
    try {
      const auth = await getAuth();
      const authUser = await auth.getUser(trimmedId);
      userEmail = String(authUser.email || '').trim();
    } catch {
      /* auth user may already be gone in admin eradicate */
    }
  }

  const balanceSnap = await db.doc(`users/${trimmedId}/usage/balance`).get();
  const balanceData = balanceSnap.data() || {};
  const hadWelcomeInk =
    balanceData.signupGranted === true ||
    (typeof balanceData.residencyBalance === 'number' && balanceData.residencyBalance > 0);
  const hadTrial =
    Boolean(userData.trialStartedAt) ||
    balanceData.trialInkGranted === true ||
    (typeof balanceData.trialInkBalance === 'number' && balanceData.trialInkBalance > 0);
  const hadProFeaturePreview = Boolean(userData.proFeaturePreviewExpiresAt);

  let identityRegistryCleared = false;
  if (userEmail) {
    if (mode === 'admin') {
      identityRegistryCleared = await clearIdentityRegistry(db, userEmail);
    } else {
      await writeIdentityTombstone(db, userEmail, trimmedId, {
        hadWelcomeInk,
        hadTrial,
        hadProFeaturePreview,
      });
    }
  }

  const analyticsEventsDeleted =
    mode === 'admin' ? await deleteAnalyticsEventsForUser(trimmedId, db) : 0;

  const { albums, tracks } = await deleteUserAlbums(trimmedId, db);

  const subcollections = ['usageLogs', 'usage', 'styleProfile', 'analytics', 'gamification'] as const;
  await Promise.all(
    subcollections.map((name) => deleteSubcollection(`users/${trimmedId}`, name, db))
  );

  const [sharesDeleted, publicProfilesDeleted] = await Promise.all([
    deleteUserShares(trimmedId, db),
    deletePublicProfiles(trimmedId, db),
    deleteLeaderboardEntries(trimmedId, db),
    deleteReferralRecords(trimmedId, db),
  ]);

  await userRef.delete();

  let authDeleted = false;
  try {
    const auth = await getAuth();
    await auth.deleteUser(trimmedId);
    authDeleted = true;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/user-not-found') {
      throw err;
    }
  }

  await db.collection('system/logs/entries').add({
    action: 'user_eradicated',
    userId: trimmedId,
    userName: actorEmail,
    timestamp: new Date().toISOString(),
    details: `Eradicated ${displayName} (${mode}): ${albums} albums, ${tracks} tracks, auth=${authDeleted}, registryCleared=${identityRegistryCleared}, analytics=${analyticsEventsDeleted}, stripeCanceled=${stripeBillingCancel.canceledSubscriptionIds.length}`,
  });

  return {
    userId: trimmedId,
    authDeleted,
    albumsDeleted: albums,
    tracksDeleted: tracks,
    sharesDeleted,
    publicProfilesDeleted,
    identityRegistryCleared,
    analyticsEventsDeleted,
    stripeSubscriptionsCanceled: stripeBillingCancel.canceledSubscriptionIds.length,
  };
}
