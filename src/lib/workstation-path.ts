import type { Album, Track } from '@/lib/types';
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

export const PENDING_OPEN_GENERATOR_REMIX_KEY = 'b4b-pending-open-generator-remix';
export const OPEN_GENERATOR_REMIX_EVENT = 'b4b-open-generator-remix';

function normalizePathname(path: string): string {
  const base = path.split('?')[0].split('#')[0];
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
}

export function isCurrentTrackPath(path: string): boolean {
  if (typeof window === 'undefined') return false;
  return normalizePathname(window.location.pathname) === normalizePathname(path);
}

export function markPendingOpenGeneratorRemix(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_OPEN_GENERATOR_REMIX_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumePendingOpenGeneratorRemix(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(PENDING_OPEN_GENERATOR_REMIX_KEY) !== '1') return false;
    sessionStorage.removeItem(PENDING_OPEN_GENERATOR_REMIX_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasPendingOpenGeneratorRemix(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(PENDING_OPEN_GENERATOR_REMIX_KEY) === '1';
  } catch {
    return false;
  }
}

export function dispatchOpenGeneratorRemix(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_GENERATOR_REMIX_EVENT));
}

/** Navigate to a track and open DNA & REMIX — works even when already on that track. */
export function requestOpenRemixWorkstation(
  trackPath: string,
  router: { push: (url: string) => void }
): void {
  const base = trackPath.split('?')[0];
  const dest = appendQuery(base, { openGenerator: 'remix' });
  markPendingOpenGeneratorRemix();
  if (isCurrentTrackPath(base)) {
    dispatchOpenGeneratorRemix();
  }
  router.push(dest);
}

/** Default loose track shell for quest / quick-start navigation. */
export function buildDefaultLooseTrack(ownerId: string, title = 'New Track'): Omit<Track, 'id'> {
  return {
    albumId: 'unassigned',
    ownerId,
    title,
    vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'] },
    intentRefs: [],
    sections: [
      {
        id: `section-${Date.now()}`,
        type: 'verse',
        bars: [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }],
      },
    ],
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    direction: { enabled: true, inheritFromAlbum: false },
  };
}
