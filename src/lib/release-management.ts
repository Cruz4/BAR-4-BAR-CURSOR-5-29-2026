import { isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import type { Album, DnaStatus, ReleaseStatus, Track } from '@/lib/types';

type ReleaseRecord = {
  shareId?: string;
  releaseShareId?: string;
  releaseStatus?: ReleaseStatus;
  houseRelease?: boolean;
  dnaStatus?: DnaStatus;
  dropAudio?: unknown;
  dropPrice?: unknown;
  tracks?: Array<{ dropAudio?: unknown }>;
};

export function hasLyrics(track: Pick<Track, 'sections'>): boolean {
  return (track.sections || []).some((section) =>
    (section.bars || []).some((bar) => Boolean(bar.text?.trim()))
  );
}

export function hasReleaseAudio(record: ReleaseRecord): boolean {
  return Boolean(
    normalizeDropAudio(record.dropAudio) ||
      record.tracks?.some((track) => normalizeDropAudio(track.dropAudio))
  );
}

/**
 * Legacy pressed songs used shareId for both DNA and commerce. Treat that ID as a
 * release only when the record actually has audio; new records use releaseShareId.
 */
export function releaseShareIdOf(record: ReleaseRecord): string | undefined {
  const explicit = record.releaseShareId?.trim();
  if (explicit) return explicit;
  const legacy = record.shareId?.trim();
  return legacy && hasReleaseAudio(record) ? legacy : undefined;
}

export function releaseStatusOf(record: ReleaseRecord): ReleaseStatus | undefined {
  if (record.releaseStatus) return record.releaseStatus;
  if (!hasReleaseAudio(record)) return undefined;
  return releaseShareIdOf(record) && isCommerceLive(normalizeDropPrice(record.dropPrice))
    ? 'live'
    : 'draft';
}

export function dnaStatusOf(record: Pick<ReleaseRecord, 'shareId' | 'dnaStatus'>): DnaStatus | undefined {
  if (!record.shareId?.trim()) return undefined;
  return record.dnaStatus || 'live';
}

export function hasLiveDnaDrop(record: Pick<ReleaseRecord, 'shareId' | 'dnaStatus'>): boolean {
  return dnaStatusOf(record) === 'live';
}

export function isReleasePublic(record: ReleaseRecord): boolean {
  return releaseStatusOf(record) === 'live';
}

export const RELEASE_SHARE_PAYLOAD_BUDGET_BYTES = 900_000;

export type AlbumReleasePayloadFit = {
  payload: Record<string, unknown>;
  byteSize: number;
  compacted: boolean;
  coverOmitted: boolean;
};

function serializedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/**
 * Keep album releases below Firestore's 1MB document limit without touching the
 * private Vault. Full DNA remains in its separate Lyrics DNA Drop; only an oversized
 * commerce snapshot falls back to the compact public track manifest.
 */
export function fitAlbumReleasePayload(input: Record<string, unknown>): AlbumReleasePayloadFit {
  const payload = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  const tracks = Array.isArray(payload.tracks)
    ? payload.tracks.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    : [];
  const albumCover = typeof payload.coverArtUrl === 'string' ? payload.coverArtUrl : '';

  for (const track of tracks) {
    if (albumCover && track.coverArtUrl === albumCover) delete track.coverArtUrl;
    const context = track.sharedAlbumContext;
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      delete (context as Record<string, unknown>).coverArtUrl;
    }
  }

  let byteSize = serializedBytes(payload);
  if (byteSize <= RELEASE_SHARE_PAYLOAD_BUDGET_BYTES) {
    return { payload, byteSize, compacted: false, coverOmitted: false };
  }

  const workstationKeys = [
    'approvalDraftBacklog',
    'checkedIntents',
    'direction',
    'draftChest',
    'guardrails',
    'relayData',
    'rhymeGroups',
    'sharedStyle',
    'sheetTakes',
    'specialInstructions',
    'suggestedTitlesHistory',
    'vibePresets',
  ];
  for (const track of tracks) {
    track.sections = [];
    track.intentRefs = [];
    for (const key of workstationKeys) delete track[key];
    const context = track.sharedAlbumContext;
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      const row = context as Record<string, unknown>;
      for (const key of Object.keys(row)) {
        if (key !== 'title' && key !== 'shareId') delete row[key];
      }
    }
    if (typeof track.coverArtUrl === 'string' && track.coverArtUrl.startsWith('data:')) {
      delete track.coverArtUrl;
    }
  }
  delete payload.direction;
  delete payload.message;
  delete payload.thingsToSay;
  payload.releaseSnapshotFormat = 'commerce-compact-v1';

  byteSize = serializedBytes(payload);
  let coverOmitted = false;
  if (
    byteSize > RELEASE_SHARE_PAYLOAD_BUDGET_BYTES
    && typeof payload.coverArtUrl === 'string'
    && payload.coverArtUrl.startsWith('data:')
  ) {
    delete payload.coverArtUrl;
    coverOmitted = true;
    byteSize = serializedBytes(payload);
  }

  return { payload, byteSize, compacted: true, coverOmitted };
}

/** True only for the admin-controlled release distributed free to every member. */
export function isHouseReleaseDocument(document: Record<string, unknown>): boolean {
  return document.houseRelease === true;
}

export type ShareDocumentVisibility = {
  releaseLive: boolean;
  dnaLive: boolean;
};

export type ShareDocumentRecord = {
  id: string;
  data: Record<string, unknown>;
};

function shareTimestamp(document: Record<string, unknown>): string {
  const value = document.updatedAt || document.createdAt;
  return typeof value === 'string' ? value : '';
}

/**
 * Stable identity for every snapshot that represents the same lyric/DNA page.
 * Album title is retained as a legacy fallback because older album republishes
 * occasionally received a new project id.
 */
export function dnaShareIdentity(document: Record<string, unknown>): string {
  const ownerId = typeof document.ownerId === 'string' ? document.ownerId.trim() : '';
  const type = document.type === 'album' ? 'album' : 'track';
  const projectId = typeof document.projectId === 'string' ? document.projectId.trim() : '';
  const payload = document.data && typeof document.data === 'object'
    ? document.data as Record<string, unknown>
    : {};
  if (type === 'album') {
    const title = typeof payload.title === 'string' ? payload.title.trim().toLocaleLowerCase() : '';
    if (title) return `${ownerId}:album-title:${title.replace(/\s+/g, ' ')}`;
  }
  return `${ownerId}:${type}:${projectId}`;
}

export function isDnaShareLineage(document: Record<string, unknown>): boolean {
  const payload = document.data && typeof document.data === 'object'
    ? document.data as Record<string, unknown>
    : {};
  const topLevelStatus = document.dnaStatus;
  const releaseStatus = document.releaseStatus || payload.releaseStatus;
  if (topLevelStatus === 'live' || topLevelStatus === 'unlisted') return true;
  // Legacy DNA documents predate explicit statuses. A modern commerce-only
  // snapshot must not supersede its separate lyric page.
  return !releaseStatus;
}

/**
 * Select the newest DNA snapshot per project before applying visibility.
 * Including an unlisted newest record is intentional: it acts as a tombstone
 * so an older live snapshot can never reappear in a public reader.
 */
export function canonicalDnaShareIds(records: ShareDocumentRecord[]): Set<string> {
  const newest = new Map<string, ShareDocumentRecord>();
  for (const record of records) {
    if (!isDnaShareLineage(record.data)) continue;
    const identity = dnaShareIdentity(record.data);
    const current = newest.get(identity);
    if (
      !current ||
      shareTimestamp(record.data) > shareTimestamp(current.data) ||
      (shareTimestamp(record.data) === shareTimestamp(current.data) && record.id > current.id)
    ) {
      newest.set(identity, record);
    }
  }
  return new Set([...newest.values()].map((record) => record.id));
}

/**
 * Keep commerce visibility and lyric/DNA visibility independent. New release
 * snapshots always carry releaseStatus; new DNA snapshots always carry
 * dnaStatus. A legacy snapshot with neither status remains visible in both
 * places when it has audio, matching the old combined release page behavior.
 */
export function releaseShareIdFromShareDocument(document: Record<string, unknown>): string | undefined {
  const payload = document.data && typeof document.data === 'object'
    ? document.data as Record<string, unknown>
    : {};
  const raw = document.releaseShareId ?? payload.releaseShareId;
  if (typeof raw !== 'string') return undefined;
  const id = raw.trim();
  return id || undefined;
}

export function shareDocumentVisibility(document: Record<string, unknown>): ShareDocumentVisibility {
  const payload = document.data && typeof document.data === 'object'
    ? document.data as Record<string, unknown>
    : {};
  const hasAudio = hasReleaseAudio(payload as ReleaseRecord) || document.hasDropAudio === true;
  const releaseStatus = document.releaseStatus || payload.releaseStatus;
  // A commerce snapshot may contain the Vault record's dnaStatus inside data;
  // that does not make this release document a second DNA page. For modern
  // release documents only the share document's top-level dnaStatus is authoritative.
  const dnaStatus = document.dnaStatus || (!releaseStatus ? payload.dnaStatus : undefined);
  const legacyCombined = hasAudio && !releaseStatus && !dnaStatus;
  return {
    releaseLive: Boolean(
      hasAudio &&
      !document.releaseRemovedAt &&
      (
        (Boolean(releaseStatus) && releaseStatus !== 'draft' && releaseStatus !== 'unlisted') ||
        (!releaseStatus && !dnaStatus)
      )
    ),
    dnaLive: dnaStatus === 'live' || (!dnaStatus && (!hasAudio || legacyCombined)),
  };
}

/** Public-index guard for raw `shares/{id}` documents. */
export function isShareDocumentPublic(document: Record<string, unknown>): boolean {
  const visibility = shareDocumentVisibility(document);
  return visibility.releaseLive || visibility.dnaLive;
}

export type VaultReleaseGroups = {
  privateDrafts: Array<{ album: Album; track?: Track }>;
  offlineReleases: Array<{ album: Album; track?: Track }>;
  liveSinglesWithLyrics: Array<{ album: Album; track: Track }>;
  liveSinglesAudioOnly: Array<{ album: Album; track: Track }>;
  liveAlbumsAllLyrics: Album[];
  liveAlbumsMixedLyrics: Album[];
  liveAlbumsAudioOnly: Album[];
  dnaPreviews: Array<{ album: Album; track?: Track }>;
  unpressed: Array<{ album: Album; track?: Track }>;
};

export function groupVaultReleases(albums: Album[]): VaultReleaseGroups {
  const groups: VaultReleaseGroups = {
    privateDrafts: [],
    offlineReleases: [],
    liveSinglesWithLyrics: [],
    liveSinglesAudioOnly: [],
    liveAlbumsAllLyrics: [],
    liveAlbumsMixedLyrics: [],
    liveAlbumsAudioOnly: [],
    dnaPreviews: [],
    unpressed: [],
  };

  for (const album of albums) {
    if (album.id === 'unassigned') {
      for (const track of album.tracks || []) classifyTrack(groups, album, track);
      continue;
    }

    const audioTracks = (album.tracks || []).filter((track) => normalizeDropAudio(track.dropAudio));
    const albumReleaseLive = releaseStatusOf({ ...album, tracks: album.tracks }) === 'live' && audioTracks.length > 0;
    if (albumReleaseLive) {
      const lyricCount = audioTracks.filter(hasLyrics).length;
      if (lyricCount === audioTracks.length) groups.liveAlbumsAllLyrics.push(album);
      else if (lyricCount === 0) groups.liveAlbumsAudioOnly.push(album);
      else groups.liveAlbumsMixedLyrics.push(album);
      if (dnaStatusOf(album) === 'live' && album.shareId !== releaseShareIdOf({ ...album, tracks: album.tracks })) {
        groups.dnaPreviews.push({ album });
      }
    } else if (releaseStatusOf({ ...album, tracks: album.tracks }) === 'unlisted') {
      groups.offlineReleases.push({ album });
      if (dnaStatusOf(album) === 'live') groups.dnaPreviews.push({ album });
    } else if (releaseStatusOf({ ...album, tracks: album.tracks }) === 'draft') {
      groups.privateDrafts.push({ album });
    } else if (dnaStatusOf(album) === 'live') {
      groups.dnaPreviews.push({ album });
    } else if (audioTracks.length) {
      groups.unpressed.push({ album });
    }

    for (const track of album.tracks || []) {
      if (albumReleaseLive && !releaseShareIdOf(track)) {
        if (dnaStatusOf(track) === 'live') groups.dnaPreviews.push({ album, track });
        continue;
      }
      classifyTrack(groups, album, track);
    }
  }
  return groups;
}

function classifyTrack(groups: VaultReleaseGroups, album: Album, track: Track): void {
  const status = releaseStatusOf(track);
  if (status === 'draft' && hasReleaseAudio(track)) groups.privateDrafts.push({ album, track });
  else if (status === 'draft') groups.unpressed.push({ album, track });
  else if (status === 'unlisted') {
    groups.offlineReleases.push({ album, track });
    if (dnaStatusOf(track) === 'live') groups.dnaPreviews.push({ album, track });
  } else if (status === 'live') {
    if (hasLyrics(track)) groups.liveSinglesWithLyrics.push({ album, track });
    else groups.liveSinglesAudioOnly.push({ album, track });
    if (dnaStatusOf(track) === 'live' && track.shareId !== releaseShareIdOf(track)) {
      groups.dnaPreviews.push({ album, track });
    }
  } else if (dnaStatusOf(track) === 'live') groups.dnaPreviews.push({ album, track });
  else groups.unpressed.push({ album, track });
}

export function findVaultReleaseByShareId(
  albums: Album[],
  shareId: string
): { album: Album; track?: Track } | undefined {
  const needle = shareId.trim();
  if (!needle) return undefined;
  for (const album of albums) {
    if (releaseShareIdOf({ ...album, tracks: album.tracks }) === needle) return { album };
    for (const track of album.tracks || []) {
      if (releaseShareIdOf(track) === needle) return { album, track };
    }
  }
  return undefined;
}
