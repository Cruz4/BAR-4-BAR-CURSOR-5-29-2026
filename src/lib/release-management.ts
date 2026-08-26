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

export function isReleasePublic(record: ReleaseRecord): boolean {
  return releaseStatusOf(record) === 'live';
}

/** True only for the admin-controlled release distributed free to every member. */
export function isHouseReleaseDocument(document: Record<string, unknown>): boolean {
  return document.houseRelease === true;
}

/** Public-index guard for raw `shares/{id}` documents. Legacy documents remain compatible. */
export function isShareDocumentPublic(document: Record<string, unknown>): boolean {
  const payload = document.data && typeof document.data === 'object'
    ? document.data as Record<string, unknown>
    : {};
  const hasAudio = hasReleaseAudio(payload as ReleaseRecord) || document.hasDropAudio === true;
  if (hasAudio) {
    const status = document.releaseStatus || payload.releaseStatus;
    if (status === 'draft' || status === 'unlisted') return false;
    // Release visibility is independent from the optional public lyric/DNA page.
    // A creator can hide DNA and later re-press this same paid release URL.
    return true;
  }
  const dnaStatus = document.dnaStatus || payload.dnaStatus;
  return dnaStatus !== 'unlisted';
}

export type VaultReleaseGroups = {
  privateDrafts: Array<{ album: Album; track?: Track }>;
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
  else if (status === 'live') {
    if (hasLyrics(track)) groups.liveSinglesWithLyrics.push({ album, track });
    else groups.liveSinglesAudioOnly.push({ album, track });
    if (dnaStatusOf(track) === 'live' && track.shareId !== releaseShareIdOf(track)) {
      groups.dnaPreviews.push({ album, track });
    }
  } else if (dnaStatusOf(track) === 'live') groups.dnaPreviews.push({ album, track });
  else groups.unpressed.push({ album, track });
}
