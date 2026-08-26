import 'server-only';
import type { DocumentSnapshot, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { normalizeDropAudio, type DropLibraryEntry } from '@/lib/drop-commerce';
import type { DropLibraryItem, DropLibraryTrack } from '@/lib/drop-library';
import { isHouseReleaseDocument, isShareDocumentPublic } from '@/lib/release-management';

function publicCoverUrl(url?: string): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (u.startsWith('data:')) return undefined;
  if (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('/')) return u;
  return undefined;
}

function tracksFromPayload(payload: Record<string, unknown>, entry: DropLibraryEntry): DropLibraryTrack[] {
  if (!Array.isArray(payload.tracks)) return [];
  const unlocked =
    entry.scope === 'album'
      ? null
      : new Set((entry.trackIds || []).filter(Boolean));
  const out: DropLibraryTrack[] = [];
  for (const row of payload.tracks) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : '';
    if (!id) continue;
    if (unlocked && !unlocked.has(id)) continue;
    const audio = normalizeDropAudio(o.dropAudio);
    const title =
      typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Untitled';
    out.push({
      id,
      title,
      durationSec: audio?.durationSec,
    });
  }
  return out;
}

export async function hydrateDropLibraryItems(
  db: Firestore,
  items: DropLibraryEntry[]
): Promise<DropLibraryItem[]> {
  if (items.length === 0) return [];
  const refs = items.map((item) => db.collection('shares').doc(item.shareId));
  const snaps: DocumentSnapshot[] = [];
  for (let i = 0; i < refs.length; i += 80) {
    const batch = await db.getAll(...refs.slice(i, i + 80));
    snaps.push(...batch);
  }
  const byId = new Map(snaps.map((snap) => [snap.id, snap]));

  return items.map((item) => {
    const snap = byId.get(item.shareId);
    if (!snap?.exists) return item;
    const data = snap.data() as Record<string, unknown> | undefined;
    const payload = (data?.data as Record<string, unknown> | undefined) ?? {};
    const artistName =
      typeof data?.ownerName === 'string' && data.ownerName.trim()
        ? data.ownerName.trim()
        : undefined;
    const ctxCover =
      payload.sharedAlbumContext && typeof payload.sharedAlbumContext === 'object'
        ? (payload.sharedAlbumContext as { coverArtUrl?: unknown }).coverArtUrl
        : undefined;
    const fromOwn =
      typeof payload.coverArtUrl === 'string' && payload.coverArtUrl.trim()
        ? payload.coverArtUrl.trim()
        : undefined;
    const fromCtx = typeof ctxCover === 'string' && ctxCover.trim() ? ctxCover.trim() : undefined;
    const rawCover = fromOwn || fromCtx;
    const audio =
      normalizeDropAudio(payload.dropAudio) ||
      (Array.isArray(payload.tracks)
        ? payload.tracks
            .map((row) =>
              row && typeof row === 'object'
                ? normalizeDropAudio((row as Record<string, unknown>).dropAudio)
                : undefined
            )
            .find(Boolean)
        : undefined);
    const tracks = tracksFromPayload(payload, item);
    const durationSec =
      audio?.durationSec ??
      (tracks.length
        ? tracks.reduce((sum, track) => sum + (track.durationSec || 0), 0) || undefined
        : undefined);
    const hydrated: DropLibraryItem = { ...item };
    if (artistName) hydrated.artistName = artistName;
    const cover = publicCoverUrl(rawCover);
    if (cover) hydrated.coverArtUrl = cover;
    if (durationSec) hydrated.durationSec = durationSec;
    if (tracks.length) hydrated.tracks = tracks;
    if (item.own) hydrated.own = true;
    return hydrated;
  });
}

function sharePurchasedAt(data: Record<string, unknown>): string {
  if (typeof data.updatedAt === 'string') return data.updatedAt;
  if (typeof data.createdAt === 'string') return data.createdAt;
  return new Date().toISOString();
}

function coverFromPayload(payload: Record<string, unknown>): string | undefined {
  const ctxCover =
    payload.sharedAlbumContext && typeof payload.sharedAlbumContext === 'object'
      ? (payload.sharedAlbumContext as { coverArtUrl?: unknown }).coverArtUrl
      : undefined;
  const fromOwn =
    typeof payload.coverArtUrl === 'string' && payload.coverArtUrl.trim()
      ? payload.coverArtUrl.trim()
      : undefined;
  const fromCtx = typeof ctxCover === 'string' && ctxCover.trim() ? ctxCover.trim() : undefined;
  return publicCoverUrl(fromOwn || fromCtx);
}

function artistFromShare(data: Record<string, unknown>): string | undefined {
  return typeof data.ownerName === 'string' && data.ownerName.trim()
    ? data.ownerName.trim()
    : undefined;
}

function libraryItemFromShare(
  doc: QueryDocumentSnapshot,
  options: { own?: boolean; houseRelease?: boolean } = {}
): DropLibraryItem | null {
  const data = doc.data() as Record<string, unknown>;
  if (!isShareDocumentPublic(data)) return null;
  const payload = (data.data as Record<string, unknown> | undefined) ?? {};
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const projectId = typeof data.projectId === 'string' ? data.projectId : '';
  if (!ownerId || !projectId) return null;
  const purchasedAt = sharePurchasedAt(data);
  const artistName = artistFromShare(data);
  const cover = coverFromPayload(payload);
  const houseLibraryNoticeAt = typeof data.houseLibraryNoticeAt === 'string'
    ? data.houseLibraryNoticeAt
    : undefined;
  const shared = {
    shareId: doc.id,
    ownerId,
    projectId,
    amountCents: 0,
    purchasedAt,
    ...(options.own ? { own: true } : {}),
    ...(options.houseRelease ? {
      houseRelease: true,
      free: true,
      ...(data.houseLibraryNotice === true ? { houseLibraryNotice: true } : {}),
      ...(data.houseLibraryNotice === true && houseLibraryNoticeAt ? { houseLibraryNoticeAt } : {}),
    } : {}),
    ...(artistName ? { artistName } : {}),
    ...(cover ? { coverArtUrl: cover } : {}),
  };

  if (data.type === 'album') {
    const rows = Array.isArray(payload.tracks) ? payload.tracks : [];
    const tracks: DropLibraryTrack[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      if (!id) continue;
      const audio = normalizeDropAudio(o.dropAudio);
      if (!audio) continue;
      tracks.push({
        id,
        title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Untitled',
        durationSec: audio.durationSec,
      });
    }
    if (tracks.length === 0) return null;
    const durationSec = tracks.reduce((sum, track) => sum + (track.durationSec || 0), 0) || undefined;
    return {
      ...shared,
      scope: 'album',
      title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Untitled album',
      trackIds: tracks.map((track) => track.id),
      tracks,
      ...(durationSec ? { durationSec } : {}),
    };
  }

  const audio = normalizeDropAudio(payload.dropAudio);
  if (!audio) return null;
  return {
    ...shared,
    scope: 'track',
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Untitled track',
    trackIds: [projectId],
    albumId: typeof payload.albumId === 'string' ? payload.albumId : undefined,
    ...(audio.durationSec ? { durationSec: audio.durationSec } : {}),
  };
}

/** Live First Drops the artist pressed — playable in Library without a purchase. */
export async function listOwnerPressedLibraryItems(db: Firestore, userId: string): Promise<DropLibraryItem[]> {
  if (!userId) return [];
  const snap = await db.collection('shares').where('ownerId', '==', userId).get();
  return snap.docs
    .map((doc) => libraryItemFromShare(doc, { own: true }))
    .filter((item): item is DropLibraryItem => Boolean(item))
    .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
}

/** Admin-selected live releases shared into every current and future member Library. */
export async function listHouseReleaseLibraryItems(db: Firestore): Promise<DropLibraryItem[]> {
  const snap = await db.collection('shares').where('houseRelease', '==', true).get();
  return snap.docs
    .filter((doc) => isHouseReleaseDocument(doc.data() as Record<string, unknown>))
    .map((doc) => libraryItemFromShare(doc, { houseRelease: true }))
    .filter((item): item is DropLibraryItem => Boolean(item))
    .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
}
