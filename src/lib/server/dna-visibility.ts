import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import {
  canonicalDnaShareIds,
  dnaShareIdentity,
  isDnaShareLineage,
  releaseShareIdFromShareDocument,
  shareDocumentVisibility,
} from '@/lib/release-management';

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
  const dnaLive = visibility.dnaLive && liveDnaIds.has(shareId);
  let releaseLive = visibility.releaseLive;
  if (data.type === 'album' && !releaseLive) {
    const releaseHubId = releaseShareIdFromShareDocument(data);
    if (releaseHubId && releaseHubId.toUpperCase() !== shareId.toUpperCase()) {
      const altSnap = await db.doc(`shares/${releaseHubId}`).get();
      if (altSnap.exists) {
        const altVisibility = shareDocumentVisibility(altSnap.data() as Record<string, unknown>);
        if (altVisibility.releaseLive) releaseLive = true;
      }
    }
  }
  return { dnaLive, releaseLive };
}

/** When an older DNA URL was superseded by a newer live snapshot, return the canonical id. */
export async function resolveSupersededDnaShareRedirect(
  db: Firestore,
  shareId: string,
  data: Record<string, unknown>
): Promise<string | undefined> {
  if (!isDnaShareLineage(data)) return undefined;
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId.trim() : '';
  if (!ownerId) return undefined;

  const ownerSnaps = await db.collection('shares').where('ownerId', '==', ownerId).get();
  const records = ownerSnaps.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as Record<string, unknown>,
  }));
  const identity = dnaShareIdentity(data);
  const canonicalIds = canonicalDnaShareIds(records);
  const canonicalId = [...canonicalIds].find((id) => {
    const record = records.find((entry) => entry.id === id);
    return record ? dnaShareIdentity(record.data) === identity : false;
  });
  if (!canonicalId || canonicalId.toUpperCase() === shareId.toUpperCase()) return undefined;

  const canonicalRecord = records.find((entry) => entry.id === canonicalId);
  if (!canonicalRecord) return undefined;
  if (!shareDocumentVisibility(canonicalRecord.data).dnaLive) return undefined;
  return canonicalId;
}
