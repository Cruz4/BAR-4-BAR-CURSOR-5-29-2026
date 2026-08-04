'use client';

import type { Album, StyleProfile, Track, User } from '@/lib/types';

export const ALBUM_STORAGE_KEY = 'bar4bar-albums';
export const STYLE_STORAGE_KEY = 'bar4bar-style';
const USER_PROFILE_CACHE_KEY = 'bar4bar-offline-user-profile';
const VAULT_SNAPSHOT_AT_KEY = 'bar4bar-vault-snapshot-at';

export type CachedUserProfile = Pick<
  User,
  | 'id'
  | 'displayName'
  | 'email'
  | 'role'
  | 'status'
  | 'subscriptionStatus'
  | 'subscriptionTier'
  | 'trialStartedAt'
  | 'returningIdentity'
  | 'lyricsTutorialCompletedAt'
  | 'vaultTutorialCompletedAt'
  | 'sceneTutorialCompletedAt'
  | 'proTrialWinCompletedAt'
  | 'proTrialWinDismissedAt'
  | 'proFeaturePreviewExpiresAt'
  | 'pendingWelcomeInk'
  | 'activatedAt'
  | 'freeEditableTrackIds'
  | 'freeEditableSelectionAt'
>;

export function saveVaultSnapshot(userId: string, albums: Album[], styleProfile: StyleProfile | null): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${ALBUM_STORAGE_KEY}-${userId}`, JSON.stringify(albums));
    if (styleProfile) {
      localStorage.setItem(`${STYLE_STORAGE_KEY}-${userId}`, JSON.stringify(styleProfile));
    }
    localStorage.setItem(`${VAULT_SNAPSHOT_AT_KEY}-${userId}`, new Date().toISOString());
  } catch (error) {
    console.warn('[vault-cache] save failed', error);
  }
}

export function loadVaultSnapshot(userId: string): {
  albums: Album[] | null;
  styleProfile: StyleProfile | null;
  savedAt: string | null;
} {
  if (typeof window === 'undefined' || !userId) {
    return { albums: null, styleProfile: null, savedAt: null };
  }

  try {
    const rawAlbums = localStorage.getItem(`${ALBUM_STORAGE_KEY}-${userId}`);
    const rawStyle = localStorage.getItem(`${STYLE_STORAGE_KEY}-${userId}`);
    const savedAt = localStorage.getItem(`${VAULT_SNAPSHOT_AT_KEY}-${userId}`);

    return {
      albums: rawAlbums ? (JSON.parse(rawAlbums) as Album[]) : null,
      styleProfile: rawStyle ? (JSON.parse(rawStyle) as StyleProfile) : null,
      savedAt,
    };
  } catch (error) {
    console.warn('[vault-cache] load failed', error);
    return { albums: null, styleProfile: null, savedAt: null };
  }
}

export function getCachedTrack(
  userId: string,
  albumId: string,
  trackId: string
): { album: Album | undefined; track: Track | undefined } {
  const { albums } = loadVaultSnapshot(userId);
  if (!albums?.length) return { album: undefined, track: undefined };

  const album = albums.find((a) => a.id === albumId);
  const track = album?.tracks?.find((t) => t.id === trackId);
  return { album, track };
}

export function saveCachedUserProfile(user: CachedUserProfile): void {
  if (typeof window === 'undefined' || !user.id) return;
  try {
    localStorage.setItem(`${USER_PROFILE_CACHE_KEY}-${user.id}`, JSON.stringify(user));
  } catch (error) {
    console.warn('[vault-cache] profile save failed', error);
  }
}

export function loadCachedUserProfile(userId: string): CachedUserProfile | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(`${USER_PROFILE_CACHE_KEY}-${userId}`);
    return raw ? (JSON.parse(raw) as CachedUserProfile) : null;
  } catch {
    return null;
  }
}

const WARM_SESSION_PREFIX = 'bar4bar-studio-warm';

function warmSignature(albums: Album[]): string {
  let count = 0;
  const ids: string[] = [];
  for (const album of albums) {
    for (const track of album.tracks ?? []) {
      if (!track?.id) continue;
      count += 1;
      if (ids.length < 24) ids.push(`${album.id}:${track.id}`);
    }
  }
  return `${count}:${ids.join(',')}`;
}

/** Prefetch editor + performance routes so the PWA can open them offline (once per vault signature). */
export function warmStudioRoutes(userId: string, albums: Album[]): void {
  if (typeof window === 'undefined' || !navigator.onLine || !userId) return;

  const signature = warmSignature(albums);
  const sessionKey = `${WARM_SESSION_PREFIX}-${userId}`;
  try {
    if (sessionStorage.getItem(sessionKey) === signature) return;
    sessionStorage.setItem(sessionKey, signature);
  } catch {
    // sessionStorage unavailable — still warm, but may repeat this session
  }

  const urls = new Set<string>();
  for (const album of albums) {
    for (const track of album.tracks ?? []) {
      if (!track?.id) continue;
      urls.add(`/albums/${album.id}/tracks/${track.id}`);
      urls.add(`/albums/${album.id}/tracks/${track.id}/perform`);
    }
  }
  urls.add('/');

  const queue = [...urls];
  const concurrency = 6;
  let active = 0;
  let index = 0;

  const pump = () => {
    while (active < concurrency && index < queue.length) {
      const path = queue[index++];
      active += 1;
      void fetch(path, { credentials: 'include' })
        .catch(() => undefined)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  pump();
}
