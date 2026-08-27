import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { canonicalDnaShareIds, shareDocumentVisibility } from '@/lib/release-management';

export async function canonicalLiveDnaShareIds(
  db: Firestore,
  requestedShareIds: string[]
): Promise<Set<string>> {
  const ids = [...new Set(requestedShareIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return new Set();
  const requested = await db.getAll(...ids.map((id) => db.doc(`shares/${id}`)));
  const ownerIds = [...new Set(
    requested
      .map((snap) => snap.data()?.ownerId)
      .filter((ownerId): ownerId is string => typeof ownerId === 'string' && Boolean(ownerId))
  )];
  const ownerSnaps = await Promise.all(
    ownerIds.map((ownerId) => db.collection('shares').where('ownerId', '==', ownerId).get())
  );
  const records = ownerSnaps.flatMap((snap) =>
    snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  );
  const canonical = canonicalDnaShareIds(records);
  return new Set(
    requested
      .filter((snap) =>
        snap.exists &&
        canonical.has(snap.id) &&
        shareDocumentVisibility(snap.data() as Record<string, unknown>).dnaLive
      )
      .map((snap) => snap.id)
  );
}

export async function canonicalShareVisibility(db: Firestore, shareId: string) {
  const shareSnap = await db.doc(`shares/${shareId}`).get();
  if (!shareSnap.exists) return null;
  const data = shareSnap.data() as Record<string, unknown>;
  const visibility = shareDocumentVisibility(data);
  const liveDnaIds = await canonicalLiveDnaShareIds(db, [shareId]);
  return {
    dnaLive: visibility.dnaLive && liveDnaIds.has(shareId),
    releaseLive: visibility.releaseLive,
  };
}
