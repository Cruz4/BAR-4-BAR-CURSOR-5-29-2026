import 'server-only';

/**
 * Artist Home config persistence.
 *
 * Canonical copy: users/{uid}/gamification/artistHome (owner-readable, Admin-written).
 * Public mirror: publicProfiles/{slug}.artistHome — what visitors render.
 * syncPublicProfile re-mirrors on every gamification sync so slug renames and
 * profile re-enables never lose the skin.
 */

import { getDb } from '@/lib/firebase/server';
import {
  defaultArtistHomeConfig,
  normalizeArtistHomeConfig,
  artistHomeForPublic,
  type ArtistHomeConfig,
} from '@/lib/profile/modules';

const CONFIG_DOC = (uid: string) => `users/${uid}/gamification/artistHome`;

export async function getArtistHomeConfig(userId: string): Promise<ArtistHomeConfig> {
  const db = await getDb();
  const snap = await db.doc(CONFIG_DOC(userId)).get();
  if (!snap.exists) return defaultArtistHomeConfig();
  return normalizeArtistHomeConfig(snap.data());
}

/** True when the artist has already persisted an Artist Home doc. */
export async function hasPersistedArtistHomeConfig(userId: string): Promise<boolean> {
  const db = await getDb();
  const snap = await db.doc(CONFIG_DOC(userId)).get();
  return snap.exists;
}

export async function saveArtistHomeConfig(
  userId: string,
  config: ArtistHomeConfig
): Promise<ArtistHomeConfig> {
  const db = await getDb();
  const normalized = stripEmptyContact(stripAlbumRoomCovers(normalizeArtistHomeConfig(config)));
  await db.doc(CONFIG_DOC(userId)).set(
    { ...normalized, updatedAt: new Date().toISOString() },
    { merge: false }
  );
  await mirrorArtistHomeToPublicProfile(userId, normalized);
  return normalized;
}

/** Don't persist a request-mode chip with no line to reveal. */
function stripEmptyContact(config: ArtistHomeConfig): ArtistHomeConfig {
  if (config.featured.contact?.value) return config;
  if (!config.featured.contact) return config;
  const { contact: _drop, ...featured } = config.featured;
  return { ...config, featured };
}

/** Album vinyl covers resolve live — strip those. Keep custom room banners. */
function stripAlbumRoomCovers(config: ArtistHomeConfig): ArtistHomeConfig {
  const rooms = config.featured.albumRooms;
  if (!rooms?.length) return config;
  return {
    ...config,
    featured: {
      ...config.featured,
      albumRooms: rooms.map(({ coverArtUrl: _c, ...room }) => room),
    },
  };
}

/** Copy the config onto the public profile doc when the profile is live. */
export async function mirrorArtistHomeToPublicProfile(
  userId: string,
  config?: ArtistHomeConfig
): Promise<void> {
  const db = await getDb();
  const summarySnap = await db.doc(`users/${userId}/gamification/summary`).get();
  const summary = summarySnap.data() as
    | { publicProfile?: boolean; profileSlug?: string }
    | undefined;
  if (!summary?.publicProfile || !summary.profileSlug) return;

  const resolved = artistHomeForPublic(config ?? (await getArtistHomeConfig(userId)));
  await db
    .doc(`publicProfiles/${summary.profileSlug}`)
    .set({ artistHome: resolved, updatedAt: new Date().toISOString() }, { merge: true });
}
