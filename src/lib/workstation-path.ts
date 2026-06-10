import type { Album } from '@/lib/types';
import {
  getLastWorkedTrackPath,
  isTrackEditorPath,
  LAST_WORKED_TRACK_KEY,
} from '@/lib/studio-tips-session';

export function parseTrackEditorPath(path: string): { albumId: string; trackId: string } | null {
  const base = path.split('?')[0].split('#')[0];
  const match = base.match(/^\/albums\/([^/]+)\/tracks\/([^/]+)$/);
  if (!match) return null;
  return { albumId: match[1], trackId: match[2] };
}

export function trackExistsInVault(albums: Album[], path: string): boolean {
  const parsed = parseTrackEditorPath(path);
  if (!parsed) return false;
  const album = albums.find((a) => a.id === parsed.albumId);
  return Boolean(album?.tracks?.some((t) => t.id === parsed.trackId));
}

export function clearStaleLastWorkedTrackPath(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LAST_WORKED_TRACK_KEY);
  } catch {
    /* ignore */
  }
}

/** First loose track, else first album track — for quest / tour fallbacks. */
export function resolveFirstTrackPath(albums: Album[]): string | null {
  const unassigned = albums.find((a) => a.id === 'unassigned');
  if (unassigned?.tracks?.[0]) {
    return `/albums/unassigned/tracks/${unassigned.tracks[0].id}`;
  }

  for (const album of albums) {
    if (album.id === 'unassigned' || !album.tracks?.length) continue;
    return `/albums/${album.id}/tracks/${album.tracks[0].id}`;
  }

  return null;
}

/** Valid last-opened track, else first available track in vault. */
export function resolveWorkstationTrackPath(albums: Album[]): string | null {
  const last = getLastWorkedTrackPath();
  if (last && trackExistsInVault(albums, last)) return last.split('?')[0];

  if (last) clearStaleLastWorkedTrackPath();
  return resolveFirstTrackPath(albums);
}

export function appendQuery(path: string, query: Record<string, string>): string {
  const [base, existing] = path.split('?');
  const params = new URLSearchParams(existing || '');
  for (const [key, value] of Object.entries(query)) {
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function isTrackEditorPathValid(path: string | null | undefined): path is string {
  return Boolean(path && isTrackEditorPath(path.split('?')[0]));
}
