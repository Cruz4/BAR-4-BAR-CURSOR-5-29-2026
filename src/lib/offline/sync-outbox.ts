'use client';

export type TrackOutboxPatch = {
  type: 'track';
  trackId: string;
  albumId: string;
  updates: Record<string, unknown>;
};

export type AlbumOutboxPatch = {
  type: 'album';
  albumId: string;
  updates: Record<string, unknown>;
};

export type StyleOutboxPatch = {
  type: 'styleProfile';
  profile: Record<string, unknown>;
};

export type DeleteTrackOutbox = {
  type: 'deleteTrack';
  albumId: string;
  trackId: string;
};

export type DeleteAlbumOutbox = {
  type: 'deleteAlbum';
  albumId: string;
};

export type OutboxEntry =
  | TrackOutboxPatch
  | AlbumOutboxPatch
  | StyleOutboxPatch
  | DeleteTrackOutbox
  | DeleteAlbumOutbox;

const OUTBOX_KEY = 'bar4bar-sync-outbox';

function outboxStorageKey(userId: string): string {
  return `${OUTBOX_KEY}-${userId}`;
}

export function readOutbox(userId: string): OutboxEntry[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(outboxStorageKey(userId));
    return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeOutbox(userId: string, entries: OutboxEntry[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(outboxStorageKey(userId));
      return;
    }
    localStorage.setItem(outboxStorageKey(userId), JSON.stringify(entries));
  } catch (error) {
    console.warn('[sync-outbox] write failed', error);
  }
}

export function mergeTrackOutbox(
  userId: string,
  trackId: string,
  albumId: string,
  updates: Record<string, unknown>
): number {
  const entries = readOutbox(userId);
  const existing = entries.find((e) => e.type === 'track' && e.trackId === trackId);
  if (existing && existing.type === 'track') {
    existing.updates = { ...existing.updates, ...updates };
    existing.albumId = albumId;
  } else {
    entries.push({ type: 'track', trackId, albumId, updates });
  }
  writeOutbox(userId, entries);
  return entries.length;
}

export function mergeAlbumOutbox(userId: string, albumId: string, updates: Record<string, unknown>): number {
  const entries = readOutbox(userId);
  const existing = entries.find((e) => e.type === 'album' && e.albumId === albumId);
  if (existing && existing.type === 'album') {
    existing.updates = { ...existing.updates, ...updates };
  } else {
    entries.push({ type: 'album', albumId, updates });
  }
  writeOutbox(userId, entries);
  return entries.length;
}

export function pushStyleOutbox(userId: string, profile: Record<string, unknown>): number {
  // filter narrows away StyleOutboxPatch — re-widen so we can push a fresh style entry.
  const entries: OutboxEntry[] = readOutbox(userId).filter((e) => e.type !== 'styleProfile');
  entries.push({ type: 'styleProfile', profile });
  writeOutbox(userId, entries);
  return entries.length;
}

export function pushDeleteTrackOutbox(userId: string, albumId: string, trackId: string): number {
  const entries = readOutbox(userId).filter(
    (e) => !(e.type === 'track' && e.trackId === trackId)
  );
  entries.push({ type: 'deleteTrack', albumId, trackId });
  writeOutbox(userId, entries);
  return entries.length;
}

export function pushDeleteAlbumOutbox(userId: string, albumId: string): number {
  const entries = readOutbox(userId).filter((e) => !(e.type === 'album' && e.albumId === albumId));
  entries.push({ type: 'deleteAlbum', albumId });
  writeOutbox(userId, entries);
  return entries.length;
}

export function clearOutbox(userId: string): void {
  writeOutbox(userId, []);
}

export function outboxCount(userId: string): number {
  return readOutbox(userId).length;
}
