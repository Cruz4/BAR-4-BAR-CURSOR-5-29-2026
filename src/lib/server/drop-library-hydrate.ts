import 'server-only';
import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { normalizeDropAudio, type DropLibraryEntry } from '@/lib/drop-commerce';
import type { DropLibraryItem, DropLibraryTrack } from '@/lib/drop-library';

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
    return hydrated;
  });
}
