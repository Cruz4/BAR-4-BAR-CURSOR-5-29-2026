import type { Firestore } from 'firebase-admin/firestore';
import type { Album, Track } from '@/lib/types';
import { orderAlbumTracks, trackOrderFromTracks } from '@/lib/album-track-order';
import {
  canManageReleaseShare,
  houseReleaseVaultRef,
  type HouseReleaseVaultRef,
} from '@/lib/house-artist-link';
import { stripForFirestore } from '@/lib/utils';

export type HouseWorkspace = {
  shareId: string;
  kind: 'album' | 'track';
  album: Album;
  trackId?: string;
};

function safeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/');
}

export async function loadShareForManager(
  db: Firestore,
  shareId: string,
  userId: string
): Promise<{ share: Record<string, unknown>; ref: HouseReleaseVaultRef | null } | null> {
  if (!safeId(shareId)) return null;
  const snap = await db.doc(`shares/${shareId}`).get();
  if (!snap.exists) return null;
  const share = (snap.data() || {}) as Record<string, unknown>;
  if (!canManageReleaseShare(share, userId)) return null;
  return { share, ref: houseReleaseVaultRef(share) };
}

export async function readVaultAlbum(
  db: Firestore,
  ownerId: string,
  albumId: string
): Promise<Album | null> {
  if (!safeId(ownerId) || !safeId(albumId)) return null;
  const albumRef = db.doc(`users/${ownerId}/albums/${albumId}`);
  const [albumSnap, tracksSnap] = await Promise.all([
    albumRef.get(),
    albumRef.collection('tracks').get(),
  ]);
  if (!albumSnap.exists) return null;
  const albumData = albumSnap.data() as Omit<Album, 'tracks'> & { tracks?: unknown };
  const orderedTracks = orderAlbumTracks(
    tracksSnap.docs.map((doc) => ({ ...(doc.data() as Track), id: doc.id, albumId })),
    albumData,
  );
  return {
    ...albumData,
    id: albumId,
    ownerId,
    tracks: orderedTracks,
    trackOrder: trackOrderFromTracks(orderedTracks),
  } as Album;
}

export async function loadHouseWorkspace(
  db: Firestore,
  shareId: string,
  userId: string
): Promise<HouseWorkspace | null> {
  const loaded = await loadShareForManager(db, shareId, userId);
  if (!loaded?.ref) return null;
  const album = await readVaultAlbum(db, loaded.ref.ownerId, loaded.ref.albumId);
  if (!album) return null;
  return {
    shareId,
    kind: loaded.ref.kind,
    album,
    ...(loaded.ref.trackId ? { trackId: loaded.ref.trackId } : {}),
  };
}

const ALBUM_PATCH_KEYS = [
  'title',
  'theme',
  'coverArtUrl',
  'dropPrice',
  'releaseDiscovery',
  'direction',
  'trackOrder',
  'dropRightsAttestedAt',
] as const;

const TRACK_PATCH_KEYS = [
  'title',
  'coverArtUrl',
  'sections',
  'vibe',
  'dropAudio',
  'dropPrice',
  'dropRightsAttestedAt',
  'releaseDiscovery',
  'direction',
  'status',
] as const;

function pickFields<T extends Record<string, unknown>>(source: T, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

export async function saveHouseWorkspace(
  db: Firestore,
  shareId: string,
  userId: string,
  album: Album,
  deletedTrackIds: string[] = []
): Promise<HouseWorkspace | null> {
  const loaded = await loadShareForManager(db, shareId, userId);
  if (!loaded?.ref) return null;
  if (album.id !== loaded.ref.albumId) return null;
  const albumRef = db.doc(`users/${loaded.ref.ownerId}/albums/${loaded.ref.albumId}`);
  const albumSnap = await albumRef.get();
  if (!albumSnap.exists) return null;

  const now = new Date().toISOString();
  const tracks = Array.isArray(album.tracks) ? album.tracks : [];
  const trackOrder = trackOrderFromTracks(tracks);
  const albumPatch = stripForFirestore({
    ...pickFields(album as unknown as Record<string, unknown>, ALBUM_PATCH_KEYS),
    trackOrder,
    updatedAt: now,
  });
  const batch = db.batch();
  batch.set(albumRef, albumPatch, { merge: true });

  const knownIds = new Set<string>();
  for (const track of tracks) {
    if (!safeId(track.id)) continue;
    knownIds.add(track.id);
    const trackPatch = stripForFirestore({
      ...pickFields(track as unknown as Record<string, unknown>, TRACK_PATCH_KEYS),
      albumId: loaded.ref.albumId,
      ownerId: loaded.ref.ownerId,
      updatedAt: now,
    });
    batch.set(albumRef.collection('tracks').doc(track.id), trackPatch, { merge: true });
  }
  for (const trackId of deletedTrackIds) {
    if (!safeId(trackId) || knownIds.has(trackId)) continue;
    batch.delete(albumRef.collection('tracks').doc(trackId));
  }
  await batch.commit();
  const saved = await readVaultAlbum(db, loaded.ref.ownerId, loaded.ref.albumId);
  if (!saved) return null;
  return {
    shareId,
    kind: loaded.ref.kind,
    album: saved,
    ...(loaded.ref.trackId ? { trackId: loaded.ref.trackId } : {}),
  };
}
