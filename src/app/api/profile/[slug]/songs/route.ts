import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { normalizeDropAudio, dropPriceSummary, normalizeDropPrice } from '@/lib/drop-commerce';
import { resolvePublicProfileSlugDoc } from '@/lib/server/profile-slug';
import { shareDocumentVisibility } from '@/lib/release-management';
import { publicMusicMetadataFromTrack } from '@/lib/music-discovery-metadata';
import { isHouseReleaseCreditedToUser, isHouseReleaseVisibleOnHome, resolveHouseArtistId } from '@/lib/house-artist-link';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';

export const runtime = 'nodejs';
const PAGE_SIZE = 15;

type ProfileSongRow = {
  shareId: string;
  ownerId: string;
  albumId: string;
  trackId: string;
  type: 'track';
  title: string;
  hasDropAudio: true;
  houseRelease?: boolean;
  metadata: ReturnType<typeof publicMusicMetadataFromTrack>;
  price: ReturnType<typeof normalizeDropPrice>;
  dropPriceSummary: ReturnType<typeof dropPriceSummary>;
  playCount: number;
  previewCount: number;
  purchaseCount: number;
  updatedAt: string;
};

function payloadOf(raw: Record<string, unknown>): Record<string, unknown> {
  return raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : {};
}

function updatedAtOf(raw: Record<string, unknown>): string {
  return typeof raw.updatedAt === 'string'
    ? raw.updatedAt
    : typeof raw.createdAt === 'string'
      ? raw.createdAt
      : '';
}

function songKey(row: Pick<ProfileSongRow, 'shareId' | 'trackId'>): string {
  return `${row.shareId}::${row.trackId || ''}`;
}

function trackRowFromShare(
  shareId: string,
  raw: Record<string, unknown>,
  fallbackOwnerId: string,
  houseRelease: boolean
): ProfileSongRow | null {
  if (raw.type === 'album') return null;
  const data = payloadOf(raw);
  const audio = normalizeDropAudio(data.dropAudio);
  if (!audio) return null;
  const price = normalizeDropPrice(data.dropPrice);
  const ownerId = typeof raw.ownerId === 'string' && raw.ownerId.trim() ? raw.ownerId.trim() : fallbackOwnerId;
  return {
    shareId,
    ownerId,
    albumId: typeof data.albumId === 'string' ? data.albumId : '',
    trackId: typeof raw.projectId === 'string' ? raw.projectId : typeof data.id === 'string' ? data.id : '',
    type: 'track',
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 120) : 'Untitled track',
    hasDropAudio: true,
    ...(houseRelease ? { houseRelease: true } : {}),
    metadata: publicMusicMetadataFromTrack(data),
    price,
    dropPriceSummary: dropPriceSummary(price),
    playCount: Math.max(0, Number(raw.playCount) || 0),
    previewCount: Math.max(0, Number(raw.previewCount) || 0),
    purchaseCount: Math.max(0, Number(raw.purchaseCount) || 0),
    updatedAt: updatedAtOf(raw),
  };
}

function flattenHouseAlbum(
  shareId: string,
  raw: Record<string, unknown>,
  fallbackOwnerId: string
): ProfileSongRow[] {
  const data = payloadOf(raw);
  const albumTitle =
    typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 120) : 'Untitled album';
  const albumId =
    typeof raw.projectId === 'string'
      ? raw.projectId
      : typeof data.id === 'string'
        ? data.id
        : '';
  const ownerId = typeof raw.ownerId === 'string' && raw.ownerId.trim() ? raw.ownerId.trim() : fallbackOwnerId;
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const updatedAt = updatedAtOf(raw);
  return tracks.flatMap((track) => {
    if (!track || typeof track !== 'object') return [];
    const row = track as Record<string, unknown>;
    const audio = normalizeDropAudio(row.dropAudio);
    if (!audio) return [];
    const trackId = typeof row.id === 'string' ? row.id.trim() : '';
    if (!trackId) return [];
    const nestedShare =
      typeof row.releaseShareId === 'string' && row.releaseShareId.trim()
        ? row.releaseShareId.trim()
        : typeof row.shareId === 'string' && row.shareId.trim()
          ? row.shareId.trim()
          : shareId;
    const price = normalizeDropPrice(row.dropPrice);
    return [{
      shareId: nestedShare,
      ownerId,
      albumId,
      trackId,
      type: 'track' as const,
      title: typeof row.title === 'string' && row.title.trim() ? row.title.trim().slice(0, 120) : 'Untitled track',
      hasDropAudio: true as const,
      houseRelease: true,
      metadata: publicMusicMetadataFromTrack({
        ...row,
        sharedAlbumContext: { title: albumTitle, shareId },
      }),
      price,
      dropPriceSummary: dropPriceSummary(price),
      playCount: Math.max(0, Number(raw.playCount) || 0),
      previewCount: Math.max(0, Number(raw.previewCount) || 0),
      purchaseCount: Math.max(0, Number(raw.purchaseCount) || 0),
      updatedAt,
    }];
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const db = await getDb();
    const owner = await resolvePublicProfileSlugDoc(db, slug);
    if (!owner) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const cursor = new URL(req.url).searchParams.get('cursor') || '';
    const [ownerSnap, houseSnap, homeSnap] = await Promise.all([
      db.collection('shares').where('ownerId', '==', owner.userId).get(),
      db.collection('shares').where('houseRelease', '==', true).get(),
      db.doc(`users/${owner.userId}/gamification/artistHome`).get(),
    ]);
    const hiddenHouseIds = normalizeArtistHomeConfig(homeSnap.data()).featured.hiddenHouseReleaseShareIds;
    const byKey = new Map<string, ProfileSongRow>();

    const ingest = (shareId: string, raw: Record<string, unknown>, creditedHouse: boolean) => {
      if (!shareDocumentVisibility(raw).releaseLive) return;
      const houseRelease = raw.houseRelease === true || creditedHouse;
      if (houseRelease && !isHouseReleaseVisibleOnHome(shareId, hiddenHouseIds)) return;
      if (raw.type === 'album') {
        if (!houseRelease) return;
        for (const row of flattenHouseAlbum(shareId, raw, owner.userId)) {
          if (!isHouseReleaseVisibleOnHome(row.shareId, hiddenHouseIds)) continue;
          const key = songKey(row);
          if (!byKey.has(key)) byKey.set(key, row);
        }
        return;
      }
      const row = trackRowFromShare(shareId, raw, owner.userId, houseRelease);
      if (!row) return;
      if (houseRelease && !isHouseReleaseVisibleOnHome(row.shareId, hiddenHouseIds)) return;
      const key = songKey(row);
      const existing = byKey.get(key);
      if (!existing) byKey.set(key, row);
      else if (houseRelease) byKey.set(key, { ...existing, ...row, houseRelease: true });
    };

    for (const doc of ownerSnap.docs) {
      const raw = doc.data() as Record<string, unknown>;
      const houseArtistId = resolveHouseArtistId(raw);
      if (raw.houseRelease === true && houseArtistId && houseArtistId !== owner.userId) continue;
      ingest(doc.id, raw, raw.houseRelease === true && isHouseReleaseCreditedToUser(raw, owner.userId));
    }

    for (const doc of houseSnap.docs) {
      const raw = (doc.data() || {}) as Record<string, unknown>;
      if (!isHouseReleaseCreditedToUser(raw, owner.userId)) continue;
      ingest(doc.id, raw, true);
    }

    const songs = [...byKey.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const start = cursor
      ? Math.max(0, songs.findIndex((song) => songKey(song) === cursor) + 1)
      : 0;
    const page = songs.slice(start, start + PAGE_SIZE);
    return NextResponse.json({
      songs: page,
      nextCursor: start + PAGE_SIZE < songs.length ? songKey(page.at(-1)!) : null,
      total: songs.length,
    }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch (error) {
    console.error('[profile/songs]', error);
    return NextResponse.json({ error: 'Could not load music releases' }, { status: 500 });
  }
}
