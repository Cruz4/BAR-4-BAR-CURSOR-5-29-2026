import 'server-only';

import { getDb } from '@/lib/firebase/server';
import type { Album, Track } from '@/lib/types';

export async function loadOwnerTrack(
  uid: string,
  albumId: string,
  trackId: string
): Promise<{ album: Album; track: Track } | null> {
  const db = await getDb();
  const albumSnap = await db.doc(`users/${uid}/albums/${albumId}`).get();
  if (!albumSnap.exists) return null;
  const album = albumSnap.data() as Album;
  const trackSnap = await db.doc(`users/${uid}/albums/${albumId}/tracks/${trackId}`).get();
  if (!trackSnap.exists) return null;
  const track = trackSnap.data() as Track;
  if (track.ownerId !== uid) return null;
  return { album: { ...album, id: albumId }, track: { ...track, id: trackId, albumId } };
}
