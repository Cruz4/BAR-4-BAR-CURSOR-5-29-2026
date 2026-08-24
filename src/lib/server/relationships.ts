import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import type {
  SupportDashboard,
  SupportRelationshipRow,
  SupportRelationshipState,
} from '@/lib/relationships';
import { nextSupportRelationship, type SupportRelationshipAction } from '@/lib/relationships';

type RelationshipProfile = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  live: boolean;
};

async function relationshipProfile(db: Firestore, userId: string): Promise<RelationshipProfile> {
  const [userSnap, summarySnap] = await Promise.all([
    db.doc(`users/${userId}`).get(),
    db.doc(`users/${userId}/gamification/summary`).get(),
  ]);
  if (!userSnap.exists) throw new Error('Account not found.');
  const user = userSnap.data() || {};
  const summary = summarySnap.data() || {};
  const live = summary.publicProfile === true && typeof summary.profileSlug === 'string' && summary.profileSlug.trim().length > 0;
  return {
    userId,
    displayName:
      typeof user.displayName === 'string' && user.displayName.trim()
        ? user.displayName.trim().slice(0, 120)
        : 'Music Fan',
    ...(live ? { profileSlug: String(summary.profileSlug).trim() } : {}),
    live,
  };
}

async function relationshipBlocked(db: Firestore, actorId: string, targetId: string): Promise<boolean> {
  const [actorBlock, targetBlock] = await Promise.all([
    db.doc(`users/${actorId}/blocks/${targetId}`).get(),
    db.doc(`users/${targetId}/blocks/${actorId}`).get(),
  ]);
  return actorBlock.exists || targetBlock.exists;
}

function rowFromDoc(id: string, data: Record<string, unknown>): SupportRelationshipRow {
  return {
    userId: id,
    displayName:
      typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName.trim()
        : 'Music Fan',
    ...(typeof data.profileSlug === 'string' && data.profileSlug.trim()
      ? { profileSlug: data.profileSlug.trim() }
      : {}),
    innerCircle: data.innerCircle === true,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
  };
}

export async function getSupportRelationshipState(
  db: Firestore,
  viewerId: string,
  targetId: string
): Promise<SupportRelationshipState> {
  const [edge, followersCount, innerCount] = await Promise.all([
    viewerId ? db.doc(`users/${viewerId}/following/${targetId}`).get() : Promise.resolve(null),
    db.collection(`users/${targetId}/followers`).count().get(),
    db.collection(`users/${targetId}/followers`).where('innerCircle', '==', true).count().get(),
  ]);
  return {
    following: Boolean(edge?.exists),
    innerCircle: edge?.data()?.innerCircle === true,
    followerCount: followersCount.data().count,
    innerCircleCount: innerCount.data().count,
  };
}

export async function setSupportRelationship(
  db: Firestore,
  input: {
    actorId: string;
    targetId: string;
    action: SupportRelationshipAction;
  }
): Promise<{
  state: SupportRelationshipState;
  actor: RelationshipProfile;
  target: RelationshipProfile;
  newlyFollowed: boolean;
  newlyInnerCircle: boolean;
}> {
  if (!input.actorId || !input.targetId || input.actorId === input.targetId) {
    throw new Error('Choose another profile.');
  }
  const [actor, target, blocked] = await Promise.all([
    relationshipProfile(db, input.actorId),
    relationshipProfile(db, input.targetId),
    relationshipBlocked(db, input.actorId, input.targetId),
  ]);
  if (!target.live) throw new Error('That profile is offline.');
  if (blocked) throw new Error('This relationship is unavailable.');

  const followingRef = db.doc(`users/${input.actorId}/following/${input.targetId}`);
  const followerRef = db.doc(`users/${input.targetId}/followers/${input.actorId}`);
  let newlyFollowed = false;
  let newlyInnerCircle = false;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(followingRef);
    const previous = existing.data() || {};
    const now = new Date().toISOString();
    const next = nextSupportRelationship(
      existing.exists ? previous.innerCircle === true : null,
      input.action
    );
    if (!next.exists) {
      tx.delete(followingRef);
      tx.delete(followerRef);
      return;
    }
    const innerCircle = next.innerCircle;
    newlyFollowed = !existing.exists;
    newlyInnerCircle = innerCircle && previous.innerCircle !== true;
    const createdAt = typeof previous.createdAt === 'string' ? previous.createdAt : now;
    tx.set(followingRef, {
      targetUserId: target.userId,
      displayName: target.displayName,
      ...(target.profileSlug ? { profileSlug: target.profileSlug } : {}),
      innerCircle,
      createdAt,
      updatedAt: now,
    });
    tx.set(followerRef, {
      followerUserId: actor.userId,
      displayName: actor.displayName,
      ...(actor.profileSlug ? { profileSlug: actor.profileSlug } : {}),
      innerCircle,
      createdAt,
      updatedAt: now,
    });
  });

  return {
    state: await getSupportRelationshipState(db, input.actorId, input.targetId),
    actor,
    target,
    newlyFollowed,
    newlyInnerCircle,
  };
}

export async function getSupportDashboard(db: Firestore, userId: string): Promise<SupportDashboard> {
  const [followersSnap, followingSnap] = await Promise.all([
    db.collection(`users/${userId}/followers`).limit(500).get(),
    db.collection(`users/${userId}/following`).limit(500).get(),
  ]);
  const followers = followersSnap.docs
    .map((doc) => rowFromDoc(doc.id, doc.data()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const following = followingSnap.docs
    .map((doc) => rowFromDoc(doc.id, doc.data()))
    .sort((a, b) => Number(b.innerCircle) - Number(a.innerCircle) || b.updatedAt.localeCompare(a.updatedAt));
  return {
    followers,
    following,
    totals: {
      followers: followers.length,
      innerCircleSupporters: followers.filter((row) => row.innerCircle).length,
      following: following.length,
      inMyInnerCircle: following.filter((row) => row.innerCircle).length,
    },
  };
}
