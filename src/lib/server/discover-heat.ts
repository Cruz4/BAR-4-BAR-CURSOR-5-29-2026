import 'server-only';

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { DISCOVER_HEAT_POINTS, type DiscoverHeatKind } from '@/lib/discover-heat';

function heatTickId(kind: DiscoverHeatKind, actorKey: string): string {
  const safe = actorKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return `${kind}_${safe}`;
}

export function discoverHeatTickId(kind: DiscoverHeatKind, actorKey: string): string {
  return heatTickId(kind, actorKey);
}

/**
 * Add verified heat once per tick. Self-actions do not count.
 * Recording stays on even when the Discover mix switch is off, so a later test has real signal.
 */
export async function grantDiscoverHeat(
  db: Firestore,
  input: {
    postId: string;
    kind: DiscoverHeatKind;
    tickKey: string;
    actorId?: string | null;
  }
): Promise<boolean> {
  const postId = input.postId.trim();
  const tickKey = input.tickKey.trim();
  if (!postId || !tickKey) return false;
  const points = DISCOVER_HEAT_POINTS[input.kind];
  const postRef = db.collection('posts').doc(postId);
  const tickRef = postRef.collection('heatTicks').doc(heatTickId(input.kind, tickKey));
  const actorId = input.actorId?.trim() || '';

  return db.runTransaction(async (tx) => {
    const [postSnap, tickSnap] = await Promise.all([tx.get(postRef), tx.get(tickRef)]);
    if (!postSnap.exists || tickSnap.exists) return false;
    const ownerId = String(postSnap.data()?.ownerId || '');
    if (actorId && ownerId && actorId === ownerId) return false;
    const now = new Date().toISOString();
    tx.set(tickRef, {
      kind: input.kind,
      points,
      actorId: actorId || null,
      at: now,
    });
    tx.set(
      postRef,
      {
        discoverHeat: FieldValue.increment(points),
        lastEngagedAt: now,
      },
      { merge: true }
    );
    return true;
  });
}

/** Remove one verified tick and its points. Heat never goes below zero. */
export async function revokeDiscoverHeat(
  db: Firestore,
  input: {
    postId: string;
    kind: DiscoverHeatKind;
    tickKey: string;
    actorId: string;
  }
): Promise<boolean> {
  const postId = input.postId.trim();
  const actorId = input.actorId.trim();
  const tickKey = input.tickKey.trim();
  if (!postId || !actorId || !tickKey) return false;
  const postRef = db.collection('posts').doc(postId);
  const tickRef = postRef.collection('heatTicks').doc(heatTickId(input.kind, tickKey));

  return db.runTransaction(async (tx) => {
    const [postSnap, tickSnap] = await Promise.all([tx.get(postRef), tx.get(tickRef)]);
    if (!postSnap.exists || !tickSnap.exists) return false;
    const tickActor = String(tickSnap.data()?.actorId || '');
    if (tickActor && tickActor !== actorId) return false;
    const points = Math.max(0, Math.floor(Number(tickSnap.data()?.points) || DISCOVER_HEAT_POINTS[input.kind]));
    const current = Math.max(0, Math.floor(Number(postSnap.data()?.discoverHeat) || 0));
    tx.delete(tickRef);
    tx.set(
      postRef,
      {
        discoverHeat: Math.max(0, current - points),
        lastEngagedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  });
}
