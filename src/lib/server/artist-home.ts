import 'server-only';

/**
 * Artist Home config persistence.
 *
 * Canonical copy: users/{uid}/gamification/artistHome (owner-readable, Admin-written).
 * Public mirror: publicProfiles/{slug}.artistHome — what visitors render.
 * syncPublicProfile re-mirrors on every gamification sync so slug renames and
 * profile re-enables never lose the skin.
 */

import { getAdminBucket, getDb } from '@/lib/firebase/server';
import {
  defaultArtistHomeConfig,
  normalizeArtistHomeConfig,
  artistHomeForPublic,
  type ArtistHomeConfig,
} from '@/lib/profile/modules';
import {
  audioForPlay,
  isReleaseShareLive,
  loadShare,
  priceFromShare,
  userCanStreamFull,
} from '@/lib/server/drop-entitlements';

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
  const normalized = await validateFeaturedTrack(
    userId,
    stripEmptyContact(stripAlbumRoomCovers(normalizeArtistHomeConfig(config)))
  );
  await db.doc(CONFIG_DOC(userId)).set(
    { ...normalized, updatedAt: new Date().toISOString() },
    { merge: false }
  );
  await mirrorArtistHomeToPublicProfile(userId, normalized);
  return normalized;
}

async function validateFeaturedTrack(
  userId: string,
  config: ArtistHomeConfig
): Promise<ArtistHomeConfig> {
  const selected = config.featured.featuredTrack;
  if (!selected) return config;

  const db = await getDb();
  const share = await loadShare(db, selected.shareId);
  if (!share) throw new Error('That featured track is no longer live.');
  if (!isReleaseShareLive(share)) throw new Error('That release is unpressed and cannot be featured publicly.');
  const audio = audioForPlay(share, selected.trackId);
  if (!audio?.storagePath) throw new Error('That featured track has no playable audio.');
  const entitled = await userCanStreamFull({ db, share, userId, trackId: selected.trackId });
  if (!entitled) throw new Error('Choose a track you own or purchased.');

  const details = priceFromShare(share, selected.trackId);
  const durationSec = Math.max(1, Number(audio.durationSec) || 30);
  const excerptStartSec = Math.max(
    0,
    Math.min(durationSec - Math.min(30, durationSec), selected.excerptStartSec)
  );
  let previewPath: string | undefined;
  if (excerptStartSec > 0.05) {
    const candidate = selected.previewPath?.trim() || '';
    const prefix = `profile-previews/${userId}/`;
    if (!candidate.startsWith(prefix) || candidate.includes('..') || candidate.includes('\\')) {
      throw new Error('Build the selected 30-second profile preview again.');
    }
    const [exists] = await getAdminBucket().file(candidate).exists();
    if (!exists) throw new Error('Build the selected 30-second profile preview again.');
    previewPath = candidate;
  }
  let firstPressRank: number | undefined;
  if (selected.showFirstPressBadge && share.ownerId !== userId) {
    const sales = await db
      .collection('users')
      .doc(share.ownerId)
      .collection('dropEarnings')
      .where('shareId', '==', share.id)
      .get();
    const firstBuyers = sales.docs
      .filter((doc) => doc.data().status !== 'failed' && Number(doc.data().amountCents || 0) > 0)
      .map((doc) => ({ buyerId: String(doc.data().buyerId || ''), createdAt: String(doc.data().createdAt || '') }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .filter((row, index, all) => row.buyerId && all.findIndex((candidate) => candidate.buyerId === row.buyerId) === index)
      .slice(0, 10);
    const rank = firstBuyers.findIndex((row) => row.buyerId === userId);
    if (rank < 0) throw new Error('First Press credit is only available to this song’s first 10 supporters.');
    firstPressRank = rank + 1;
  }

  return {
    ...config,
    featured: {
      ...config.featured,
      featuredTrack: {
        shareId: share.id,
        ...(selected.trackId ? { trackId: selected.trackId } : {}),
        title: details.title,
        artistName: share.ownerName?.trim() || 'Unknown artist',
        ownerId: share.ownerId,
        durationSec,
        excerptStartSec,
        source: share.ownerId === userId ? 'owned' : 'purchased',
        ...(firstPressRank ? { showFirstPressBadge: true, firstPressRank } : {}),
        ...(previewPath ? { previewPath } : {}),
      },
    },
  };
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
