import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';
import {
  normalizeDropAudio,
  normalizeDropPrice,
  type DropAudioMeta,
  type DropLibraryEntry,
  type DropPrice,
} from '@/lib/drop-commerce';
import type { Track } from '@/lib/types';

export type DropShareDoc = {
  id: string;
  type: 'album' | 'track';
  projectId: string;
  ownerId: string;
  ownerName?: string;
  data?: Record<string, unknown>;
  releaseStatus?: 'draft' | 'live' | 'unlisted';
  dnaStatus?: 'live' | 'unlisted';
};

export async function loadShare(db: Firestore, shareId: string): Promise<DropShareDoc | null> {
  const snap = await db.collection('shares').doc(shareId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const projectId = typeof data.projectId === 'string' ? data.projectId : '';
  if (!ownerId || !projectId) return null;
  return {
    id: snap.id,
    type: data.type === 'album' ? 'album' : 'track',
    projectId,
    ownerId,
    ownerName: typeof data.ownerName === 'string' ? data.ownerName : undefined,
    data: (data.data as Record<string, unknown> | undefined) ?? undefined,
    releaseStatus:
      data.releaseStatus === 'draft' || data.releaseStatus === 'live' || data.releaseStatus === 'unlisted'
        ? data.releaseStatus
        : undefined,
    dnaStatus: data.dnaStatus === 'live' || data.dnaStatus === 'unlisted' ? data.dnaStatus : undefined,
  };
}

/** Explicitly hidden/draft releases are not discoverable or purchasable. Legacy shares stay live. */
export function isReleaseShareLive(share: DropShareDoc): boolean {
  const nested = share.data?.releaseStatus;
  const status = share.releaseStatus || (nested === 'draft' || nested === 'live' || nested === 'unlisted' ? nested : undefined);
  return status !== 'draft' && status !== 'unlisted';
}

/** Explicitly hidden DNA pages stay private. Legacy DNA shares stay live. */
export function isDnaShareLive(share: DropShareDoc): boolean {
  const nested = share.data?.dnaStatus;
  const status = share.dnaStatus || (nested === 'live' || nested === 'unlisted' ? nested : undefined);
  return status !== 'unlisted';
}

export function priceFromShare(
  share: DropShareDoc,
  trackId?: string
): { price: DropPrice; title: string; audio?: DropAudioMeta; unlockTrackIds: string[] } {
  const payload = share.data ?? {};
  const title =
    typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Untitled';

  if (share.type === 'track') {
    return {
      price: normalizeDropPrice(payload.dropPrice),
      title,
      audio: normalizeDropAudio(payload.dropAudio),
      unlockTrackIds: [share.projectId],
    };
  }

  const tracks = Array.isArray(payload.tracks) ? (payload.tracks as Track[]) : [];
  if (trackId) {
    const track = tracks.find((t) => t.id === trackId);
    return {
      price: normalizeDropPrice(track?.dropPrice ?? payload.dropPrice),
      title: track?.title?.trim() || title,
      audio: normalizeDropAudio(track?.dropAudio),
      unlockTrackIds: [trackId],
    };
  }

  return {
    price: normalizeDropPrice(payload.dropPrice),
    title,
    audio: undefined,
    unlockTrackIds: tracks.map((t) => t.id).filter(Boolean),
  };
}

export function audioForPlay(share: DropShareDoc, trackId?: string): DropAudioMeta | undefined {
  const payload = share.data ?? {};
  if (share.type === 'track') return normalizeDropAudio(payload.dropAudio);
  const tracks = Array.isArray(payload.tracks) ? (payload.tracks as Track[]) : [];
  const id = trackId || tracks.find((t) => normalizeDropAudio(t.dropAudio))?.id;
  const track = tracks.find((t) => t.id === id);
  return normalizeDropAudio(track?.dropAudio);
}

export async function getLibraryEntry(
  db: Firestore,
  userId: string,
  shareId: string
): Promise<DropLibraryEntry | null> {
  const snap = await db.collection('users').doc(userId).collection('dropLibrary').doc(shareId).get();
  if (!snap.exists) return null;
  return snap.data() as DropLibraryEntry;
}

export function albumShareIdFromTrackPayload(data?: Record<string, unknown>): string | undefined {
  const ctx = data?.sharedAlbumContext as { shareId?: string } | undefined;
  return typeof ctx?.shareId === 'string' && ctx.shareId.trim() ? ctx.shareId.trim() : undefined;
}

export async function userCanStreamFull(opts: {
  db: Firestore;
  share: DropShareDoc;
  userId?: string | null;
  trackId?: string;
}): Promise<boolean> {
  const { db, share, userId, trackId } = opts;
  if (userId && userId === share.ownerId) return true;
  if (!userId) return false;

  const thisShare = await getLibraryEntry(db, userId, share.id);
  if (thisShare) {
    if (share.type === 'album' && trackId) {
      return thisShare.scope === 'album' || Boolean(thisShare.trackIds?.includes(trackId));
    }
    return true;
  }

  if (share.type === 'track') {
    const albumShareId = albumShareIdFromTrackPayload(share.data);
    if (albumShareId) {
      const albumEntry = await getLibraryEntry(db, userId, albumShareId);
      if (
        albumEntry &&
        (albumEntry.scope === 'album' || albumEntry.trackIds?.includes(share.projectId))
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function grantDropLibrary(
  db: Firestore,
  buyerId: string,
  entry: DropLibraryEntry
): Promise<void> {
  const ref = db.collection('users').doc(buyerId).collection('dropLibrary').doc(entry.shareId);
  const existing = await ref.get();
  const prev = existing.exists ? (existing.data() as DropLibraryEntry) : null;
  const trackIds = Array.from(new Set([...(prev?.trackIds ?? []), ...entry.trackIds]));
  await ref.set(
    {
      ...entry,
      trackIds,
      purchasedAt: prev?.purchasedAt || entry.purchasedAt,
      amountCents: (prev?.amountCents ?? 0) + entry.amountCents,
    },
    { merge: true }
  );
}

