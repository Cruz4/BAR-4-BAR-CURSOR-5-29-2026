import { isHouseReleaseDocument, shareDocumentVisibility } from '@/lib/release-management';

/** House release credited to an artist profile (may differ from vault owner). */

export type LinkedHouseRelease = {
  shareId: string;
  title: string;
  type: 'album' | 'track';
  albumTitle?: string;
  albumShareId?: string;
  trackCount?: number;
  releaseLive?: boolean;
};

export function resolveHouseArtistId(share: {
  houseRelease?: boolean;
  houseArtistId?: unknown;
  ownerId?: unknown;
}): string | undefined {
  if (share.houseRelease !== true) return undefined;
  const linked = typeof share.houseArtistId === 'string' ? share.houseArtistId.trim() : '';
  if (linked) return linked;
  const ownerId = typeof share.ownerId === 'string' ? share.ownerId.trim() : '';
  return ownerId || undefined;
}

export function isHouseReleaseCreditedToUser(
  share: {
    houseRelease?: boolean;
    houseArtistId?: unknown;
    ownerId?: unknown;
  },
  userId: string
): boolean {
  const id = userId.trim();
  if (!id) return false;
  const ownerId = typeof share.ownerId === 'string' ? share.ownerId.trim() : '';
  return resolveHouseArtistId(share) === id || ownerId === id;
}

export function toLinkedHouseRelease(
  shareId: string,
  share: Record<string, unknown>
): LinkedHouseRelease | null {
  if (!isHouseReleaseDocument(share)) return null;
  const payload = share.data && typeof share.data === 'object'
    ? (share.data as Record<string, unknown>)
    : {};
  const type = share.type === 'album' ? 'album' : 'track';
  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : type === 'album'
        ? 'Untitled album'
        : 'Untitled track';
  const albumTitle = typeof payload.albumTitle === 'string' ? payload.albumTitle.trim() : '';
  const albumShareId =
    typeof payload.albumShareId === 'string'
      ? payload.albumShareId.trim()
      : typeof payload.releaseShareId === 'string' && type === 'track'
        ? payload.releaseShareId.trim()
        : '';
  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  return {
    shareId,
    title,
    type,
    ...(albumTitle ? { albumTitle } : {}),
    ...(albumShareId ? { albumShareId } : {}),
    ...(type === 'album' ? { trackCount: tracks.length } : {}),
    releaseLive: shareDocumentVisibility(share).releaseLive,
  };
}

export function isHouseReleaseVisibleOnHome(
  shareId: string,
  hiddenShareIds?: string[] | null
): boolean {
  if (!hiddenShareIds?.length) return true;
  return !hiddenShareIds.includes(shareId);
}
