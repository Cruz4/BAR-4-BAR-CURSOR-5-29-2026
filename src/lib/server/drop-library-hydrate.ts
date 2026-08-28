import 'server-only';
import type { DocumentReference, DocumentSnapshot, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { normalizeDropAudio, type DropLibraryEntry } from '@/lib/drop-commerce';
import type { DropLibraryItem, DropLibraryTrack } from '@/lib/drop-library';
import { isHouseReleaseDocument, shareDocumentVisibility } from '@/lib/release-management';
import { albumTrackOrderIds, orderAlbumTracks } from '@/lib/album-track-order';

type OrderedPayloadTrack = Record<string, unknown> & { id: string; createdAt: string };

function publicCoverUrl(url?: string): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (u.startsWith('data:')) return undefined;
  if (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('/')) return u;
  return undefined;
}

function tracksFromPayload(
  payload: Record<string, unknown>,
  entry: DropLibraryEntry,
  savedOrder?: string[],
): DropLibraryTrack[] {
  if (!Array.isArray(payload.tracks)) return [];
  const unlocked =
    entry.scope === 'album'
      ? null
      : new Set((entry.trackIds || []).filter(Boolean));
  const out: DropLibraryTrack[] = [];
  const rows = payload.tracks.flatMap<OrderedPayloadTrack>((row) => {
    if (!row || typeof row !== 'object') return [];
    const value = row as Record<string, unknown>;
    const id = typeof value.id === 'string' ? value.id : '';
    return id
      ? [{ ...value, id, createdAt: typeof value.createdAt === 'string' ? value.createdAt : '' }]
      : [];
  });
  const orderedRows = orderAlbumTracks(rows, {
    trackOrder: savedOrder?.length ? savedOrder : albumTrackOrderIds(payload),
  });
  for (const o of orderedRows) {
    const id = o.id;
    if (!id) continue;
    if (unlocked && !unlocked.has(id)) continue;
    const audio = normalizeDropAudio(o.dropAudio);
    const title =
      typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Untitled';
    out.push({
      id,
      title,
      durationSec: audio?.durationSec,
      ...(typeof o.releaseShareId === 'string' && o.releaseShareId.trim() && o.releaseStatus !== 'unlisted'
        ? { releaseShareId: o.releaseShareId.trim() }
        : {}),
    });
  }
  return out;
}

function safeDocId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/');
}

async function loadAlbumOrders(
  db: Firestore,
  shares: DocumentSnapshot[],
): Promise<Map<string, string[]>> {
  const refs = new Map<string, DocumentReference>();
  for (const snap of shares) {
    const data = snap.data() as Record<string, unknown> | undefined;
    if (data?.type !== 'album' || !safeDocId(data.ownerId) || !safeDocId(data.projectId)) continue;
    refs.set(`${data.ownerId}:${data.projectId}`, db.doc(`users/${data.ownerId}/albums/${data.projectId}`));
  }
  if (refs.size === 0) return new Map();
  const result = new Map<string, string[]>();
  const entries = [...refs.entries()];
  for (let i = 0; i < entries.length; i += 80) {
    const batchEntries = entries.slice(i, i + 80);
    const albums = await db.getAll(...batchEntries.map(([, ref]) => ref));
    albums.forEach((snap, index) => {
      if (!snap.exists) return;
      const order = albumTrackOrderIds(snap.data() as { trackOrder?: unknown; tracks?: unknown });
      if (order.length) result.set(batchEntries[index][0], order);
    });
  }
  return result;
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
  const albumOrders = await loadAlbumOrders(db, snaps);

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
    const tracks = tracksFromPayload(
      payload,
      item,
      albumOrders.get(`${item.ownerId}:${item.projectId}`),
    );
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
  options: { own?: boolean; houseRelease?: boolean; trackOrder?: string[] } = {}
): DropLibraryItem | null {
  const data = doc.data() as Record<string, unknown>;
  // House releases stay in members' Libraries after public sale is taken
  // offline. A full removal clears the House flag and removes this grant.
  if (!shareDocumentVisibility(data).releaseLive && !options.houseRelease) return null;
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
      ...(data.houseLibraryNotice === true && shareDocumentVisibility(data).releaseLive
        ? { houseLibraryNotice: true }
        : {}),
      ...(data.houseLibraryNotice === true &&
      shareDocumentVisibility(data).releaseLive &&
      houseLibraryNoticeAt
        ? { houseLibraryNoticeAt }
        : {}),
    } : {}),
    ...(artistName ? { artistName } : {}),
    ...(cover ? { coverArtUrl: cover } : {}),
  };

  if (data.type === 'album') {
    const rows = Array.isArray(payload.tracks)
      ? orderAlbumTracks(
          payload.tracks.flatMap<OrderedPayloadTrack>((row) => {
            if (!row || typeof row !== 'object') return [];
            const value = row as Record<string, unknown>;
            const id = typeof value.id === 'string' ? value.id : '';
            return id
              ? [{ ...value, id, createdAt: typeof value.createdAt === 'string' ? value.createdAt : '' }]
              : [];
          }),
          { trackOrder: options.trackOrder?.length ? options.trackOrder : albumTrackOrderIds(payload) },
        )
      : [];
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
        ...(typeof o.releaseShareId === 'string' && o.releaseShareId.trim() && o.releaseStatus !== 'unlisted'
          ? { releaseShareId: o.releaseShareId.trim() }
          : {}),
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
  const orders = await loadAlbumOrders(db, snap.docs);
  return snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return libraryItemFromShare(doc, {
        own: true,
        trackOrder: orders.get(`${data.ownerId}:${data.projectId}`),
      });
    })
    .filter((item): item is DropLibraryItem => Boolean(item))
    .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
}

/** Admin-selected live releases shared into every current and future member Library. */
export async function listHouseReleaseLibraryItems(db: Firestore): Promise<DropLibraryItem[]> {
  const snap = await db.collection('shares').where('houseRelease', '==', true).get();
  const houseDocs = snap.docs.filter((doc) => isHouseReleaseDocument(doc.data() as Record<string, unknown>));
  const orders = await loadAlbumOrders(db, houseDocs);
  return houseDocs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return libraryItemFromShare(doc, {
        houseRelease: true,
        trackOrder: orders.get(`${data.ownerId}:${data.projectId}`),
      });
    })
    .filter((item): item is DropLibraryItem => Boolean(item))
    .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
}
