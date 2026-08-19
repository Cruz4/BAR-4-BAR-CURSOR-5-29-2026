import type { Album, Track } from '@/lib/types';

export type VaultSort = 'newest' | 'oldest' | 'alphabetical' | 'last-worked';

export function getLastWorkedTimestamp(item: Pick<Album | Track, 'createdAt' | 'updatedAt'>): number {
  const ts = item.updatedAt || item.createdAt;
  return ts ? new Date(ts).getTime() : 0;
}

export function getAlbumLastWorkedTimestamp(album: Album): number {
  const trackTimestamps = album.tracks?.map((track) => getLastWorkedTimestamp(track)) ?? [];
  return Math.max(getLastWorkedTimestamp(album), ...trackTimestamps, 0);
}

function isAlbum(item: Album | Track): item is Album {
  return Array.isArray((item as Album).tracks);
}

export function sortVaultItems<T extends Album | Track>(items: T[], sortBy: VaultSort): T[] {
  const sorted = [...items];
  if (sortBy === 'alphabetical') {
    sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
    return sorted;
  }
  if (sortBy === 'last-worked') {
    sorted.sort((a, b) => {
      const aTs = isAlbum(a) ? getAlbumLastWorkedTimestamp(a) : getLastWorkedTimestamp(a);
      const bTs = isAlbum(b) ? getAlbumLastWorkedTimestamp(b) : getLastWorkedTimestamp(b);
      return bTs - aTs;
    });
    return sorted;
  }
  if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return sorted;
}

export const vaultSortLabels: Record<VaultSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  alphabetical: 'A–Z',
  'last-worked': 'Last worked',
};
