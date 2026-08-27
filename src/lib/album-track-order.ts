type OrderedTrack = {
  id: string;
  createdAt?: string;
};

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of value) {
    const id = typeof raw === 'string'
      ? raw.trim()
      : raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string'
        ? (raw as { id: string }).id.trim()
        : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Reads the current trackOrder field, with the old embedded tracks array as a compatibility fallback. */
export function albumTrackOrderIds(album: { trackOrder?: unknown; tracks?: unknown } | null | undefined): string[] {
  const explicit = cleanIds(album?.trackOrder);
  return explicit.length ? explicit : cleanIds(album?.tracks);
}

/** Applies saved album order, then places new/unlisted tracks by creation time. */
export function orderAlbumTracks<T extends OrderedTrack>(
  tracks: T[],
  album?: { trackOrder?: unknown; tracks?: unknown } | null,
): T[] {
  const order = albumTrackOrderIds(album);
  const rank = new Map(order.map((id, index) => [id, index]));
  return tracks
    .map((track, sourceIndex) => ({ track, sourceIndex }))
    .sort((a, b) => {
      const aRank = rank.get(a.track.id);
      const bRank = rank.get(b.track.id);
      if (aRank !== undefined || bRank !== undefined) {
        if (aRank === undefined) return 1;
        if (bRank === undefined) return -1;
        return aRank - bRank;
      }
      const created = (a.track.createdAt || '').localeCompare(b.track.createdAt || '');
      return created || a.sourceIndex - b.sourceIndex || a.track.id.localeCompare(b.track.id);
    })
    .map(({ track }) => track);
}

export function trackOrderFromTracks(tracks: Array<Pick<OrderedTrack, 'id'>>): string[] {
  return cleanIds(tracks);
}
