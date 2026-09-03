import type { Album, StyleProfile, Track } from '@/lib/types';

export const VAULT_BACKUP_SCHEMA = 'bar4bar.studio-vault' as const;
export const VAULT_BACKUP_VERSION = 2 as const;

export type VaultBackupV2 = {
  schema: typeof VAULT_BACKUP_SCHEMA;
  version: typeof VAULT_BACKUP_VERSION;
  exportedAt: string;
  restoreMode: 'merge-copy-on-conflict';
  counts: { albums: number; looseTracks: number; albumTracks: number };
  data: { albums: Album[]; styleProfile: StyleProfile | null };
};

export type ParsedVaultBackup = {
  sourceVersion: 0 | 2;
  exportedAt?: string;
  albums: Album[];
  looseTracks: Track[];
  styleProfile: StyleProfile | null;
};

export type PreparedVaultImport = ParsedVaultBackup & {
  albums: Album[];
  looseTracks: Track[];
  preview: {
    albumsToAdd: number;
    looseTracksToAdd: number;
    albumTracksToAdd: number;
    albumCopies: number;
    looseTrackCopies: number;
    styleProfile: 'add' | 'keep-current' | 'none';
  };
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * A Studio Blueprint is deliberately media-free and cannot retain links to a
 * live/collaborative document. Full Vault Archives restore media separately to
 * fresh, owner-scoped Storage paths.
 */
function trackForBlueprint(source: Track): Track {
  const track = clone(source);
  delete track.coverArtUrl;
  delete track.dropAudio;
  delete track.sheetTakes;
  delete track.shareId;
  delete track.releaseShareId;
  delete track.releaseSnapshotAt;
  delete track.collabSheetId;
  delete track.isPublic;
  delete track.houseRelease;
  delete track.houseLibraryNotice;
  delete track.dropRightsAttestedAt;
  track.releaseStatus = 'draft';
  track.dnaStatus = 'unlisted';
  return track;
}

function albumForBlueprint(source: Album): Album {
  const album = clone(source);
  delete album.coverArtUrl;
  delete album.shareId;
  delete album.releaseShareId;
  delete album.releaseSnapshotAt;
  delete album.houseRelease;
  delete album.houseLibraryNotice;
  album.releaseStatus = 'draft';
  album.dnaStatus = 'unlisted';
  album.tracks = (source.tracks || []).map(trackForBlueprint);
  return album;
}

export function vaultAlbumsForBlueprint(albums: Album[]): Album[] {
  return albums.map(albumForBlueprint);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function albumsFrom(value: unknown): Album[] {
  if (!Array.isArray(value)) throw new Error('This file does not contain a Vault album list.');
  const valid = value.every((item) =>
    isRecord(item) && typeof item.id === 'string' && Array.isArray(item.tracks)
  );
  if (!valid) throw new Error('This Vault backup contains an invalid album entry.');
  return value as Album[];
}

function styleFrom(value: unknown): StyleProfile | null {
  return isRecord(value) && Array.isArray(value.history) ? (value as unknown as StyleProfile) : null;
}

export function buildVaultBackup(
  albums: Album[],
  styleProfile: StyleProfile | null,
  at = new Date()
): VaultBackupV2 {
  const blueprintAlbums = vaultAlbumsForBlueprint(albums);
  const loose = blueprintAlbums.find((album) => album.id === 'unassigned')?.tracks || [];
  const realAlbums = blueprintAlbums.filter((album) => album.id !== 'unassigned');
  return {
    schema: VAULT_BACKUP_SCHEMA,
    version: VAULT_BACKUP_VERSION,
    exportedAt: at.toISOString(),
    restoreMode: 'merge-copy-on-conflict',
    counts: {
      albums: realAlbums.length,
      looseTracks: loose.length,
      albumTracks: realAlbums.reduce((total, album) => total + album.tracks.length, 0),
    },
    data: { albums: blueprintAlbums, styleProfile: styleProfile ? clone(styleProfile) : null },
  };
}

export function parseVaultBackup(value: unknown): ParsedVaultBackup {
  let sourceVersion: 0 | 2 = 0;
  let exportedAt: string | undefined;
  let albums: Album[];
  let looseTracks: Track[] = [];
  let styleProfile: StyleProfile | null = null;

  if (Array.isArray(value)) {
    albums = vaultAlbumsForBlueprint(albumsFrom(value));
  } else if (isRecord(value) && value.schema === VAULT_BACKUP_SCHEMA) {
    if (value.version !== VAULT_BACKUP_VERSION) {
      throw new Error(`Vault backup version ${String(value.version)} is not supported by this app.`);
    }
    if (!isRecord(value.data)) throw new Error('This Vault backup is missing its data section.');
    sourceVersion = 2;
    exportedAt = typeof value.exportedAt === 'string' ? value.exportedAt : undefined;
    albums = vaultAlbumsForBlueprint(albumsFrom(value.data.albums));
    styleProfile = styleFrom(value.data.styleProfile);
  } else if (isRecord(value) && Array.isArray(value.albums)) {
    albums = vaultAlbumsForBlueprint(albumsFrom(value.albums));
    if (value.tracks !== undefined && !Array.isArray(value.tracks)) {
      throw new Error('This legacy Vault backup contains an invalid loose-track list.');
    }
    looseTracks = Array.isArray(value.tracks)
      ? value.tracks.map((track) => {
          if (!isRecord(track) || typeof track.id !== 'string') {
            throw new Error('This Vault backup contains an invalid loose track.');
          }
          return trackForBlueprint(track as unknown as Track);
        })
      : [];
    styleProfile = styleFrom(value.styleProfile);
  } else {
    throw new Error('Invalid AKAsheet Vault backup.');
  }

  const unassigned = albums.find((album) => album.id === 'unassigned');
  const looseMap = new Map<string, Track>();
  [...looseTracks, ...(unassigned?.tracks || [])].forEach((track) => looseMap.set(track.id, clone(track)));
  const realAlbums = albums.filter((album) => album.id !== 'unassigned').map(clone);
  if (!realAlbums.length && !looseMap.size) throw new Error('This Vault backup is empty.');

  return {
    sourceVersion,
    ...(exportedAt ? { exportedAt } : {}),
    albums: realAlbums,
    looseTracks: [...looseMap.values()],
    styleProfile,
  };
}

function safeId(value: string, fallback: string): string {
  const clean = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  return clean && clean !== 'unassigned' ? clean : fallback;
}

function unusedId(base: string, used: Set<string>, suffix: string): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let index = 1;
  let candidate = `${base}-import-${suffix}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-import-${suffix}-${index}`;
  }
  used.add(candidate);
  return candidate;
}

export function prepareVaultImport(
  parsed: ParsedVaultBackup,
  currentAlbums: Album[],
  hasCurrentStyleProfile: boolean,
  suffix = Date.now().toString(36)
): PreparedVaultImport {
  const usedAlbumIds = new Set(currentAlbums.map((album) => album.id));
  const currentLooseIds = new Set(
    currentAlbums.find((album) => album.id === 'unassigned')?.tracks.map((track) => track.id) || []
  );
  const usedLooseIds = new Set(currentLooseIds);
  let albumCopies = 0;
  let looseTrackCopies = 0;

  const albums = parsed.albums.map((source, albumIndex) => {
    const safeAlbumId = safeId(source.id, `album-import-${suffix}-${albumIndex + 1}`);
    const collides = usedAlbumIds.has(safeAlbumId);
    const albumId = unusedId(safeAlbumId, usedAlbumIds, suffix);
    if (collides) albumCopies += 1;
    const usedTrackIds = new Set<string>();
    const tracks = (source.tracks || []).map((track, trackIndex) => {
      const base = safeId(track.id, `track-${trackIndex + 1}`);
      const id = unusedId(base, usedTrackIds, suffix);
      return { ...clone(track), id, albumId };
    });
    const copiedAlbum = {
      ...clone(source),
      id: albumId,
      title: collides ? `${source.title || 'Untitled'} (Imported Copy)` : source.title,
      tracks: tracks.map((track) => collides
        ? { ...track, shareId: undefined, collabSheetId: undefined }
        : track),
    };
    if (collides) copiedAlbum.shareId = undefined;
    return copiedAlbum;
  });

  const looseTracks = parsed.looseTracks.map((track, index) => {
    const base = safeId(track.id, `loose-track-${index + 1}`);
    const collides = usedLooseIds.has(base);
    const id = unusedId(base, usedLooseIds, suffix);
    if (collides) looseTrackCopies += 1;
    return {
      ...clone(track),
      id,
      albumId: 'unassigned',
      title: collides ? `${track.title || 'Untitled'} (Imported Copy)` : track.title,
      ...(collides ? { shareId: undefined, collabSheetId: undefined } : {}),
    };
  });

  return {
    ...parsed,
    albums,
    looseTracks,
    preview: {
      albumsToAdd: albums.length,
      looseTracksToAdd: looseTracks.length,
      albumTracksToAdd: albums.reduce((total, album) => total + album.tracks.length, 0),
      albumCopies,
      looseTrackCopies,
      styleProfile: parsed.styleProfile
        ? hasCurrentStyleProfile ? 'keep-current' : 'add'
        : 'none',
    },
  };
}
