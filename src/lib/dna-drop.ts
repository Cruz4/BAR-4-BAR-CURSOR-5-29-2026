import type { Album, StyleProfile, Track } from '@/lib/types';

/** True when this project has an active public DNA Drop link (shareId persisted on album/track). */
export function hasActiveDnaDrop(shareId?: string | null): boolean {
  return typeof shareId === 'string' && shareId.trim().length > 0;
}

/** Style frozen at drop time — StyleProfile lives on the user, not the track doc. */
export type DnaDropStyleSnapshot = {
  analysis: string;
  metrics?: {
    vocabularyScore: number;
    rhymeComplexity: number;
    cadenceMap: string;
  };
};

export type DnaDropAlbumContext = {
  title: string;
  theme?: string;
  direction?: Album['direction'];
  thingsToSay?: string[];
};

export type DnaDropTrackPayload = Track & {
  sharedStyle?: DnaDropStyleSnapshot;
  sharedAlbumContext?: DnaDropAlbumContext;
};

export type DnaDropAlbumPayload = Album & {
  tracks: DnaDropTrackPayload[];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function styleSnapshot(styleProfile: StyleProfile | null | undefined, enabled: boolean | undefined): DnaDropStyleSnapshot | undefined {
  if (!enabled) return undefined;
  const latest = styleProfile?.history?.[0];
  if (!latest?.analysis?.trim()) return undefined;
  return {
    analysis: latest.analysis.trim(),
    metrics: latest.metrics,
  };
}

function enrichTrack(
  track: Track,
  styleProfile: StyleProfile | null | undefined,
  album?: Album
): DnaDropTrackPayload {
  const payload = clone(track) as DnaDropTrackPayload;
  const sharedStyle = styleSnapshot(styleProfile, track.styleEnabled);
  if (sharedStyle) payload.sharedStyle = sharedStyle;

  if (album && album.id !== 'unassigned') {
    payload.sharedAlbumContext = {
      title: album.title,
      theme: album.theme,
      direction: album.direction,
      thingsToSay: album.thingsToSay,
    };
  }

  return payload;
}

export function findTrackInVault(albums: Album[], trackId: string): { track: Track; album: Album } | null {
  for (const album of albums) {
    const track = album.tracks?.find((t) => t.id === trackId);
    if (track) return { track, album };
  }
  return null;
}

export function buildTrackDropPayload(
  track: Track,
  album: Album | undefined,
  styleProfile: StyleProfile | null | undefined
): DnaDropTrackPayload {
  return enrichTrack(track, styleProfile, album);
}

export function buildAlbumDropPayload(
  album: Album,
  styleProfile: StyleProfile | null | undefined
): DnaDropAlbumPayload {
  const payload = clone(album) as DnaDropAlbumPayload;
  payload.tracks = (album.tracks ?? []).map((t) => enrichTrack(t, styleProfile, album));
  return payload;
}

/** Intents shown on a shared track — checked beats legacy intentRefs. */
export function sharedTrackIntents(track: DnaDropTrackPayload | Track): string[] {
  if (track.checkedIntents?.length) return track.checkedIntents;
  return track.intentRefs ?? [];
}

export function resolveSharedDirection(project: DnaDropTrackPayload | DnaDropAlbumPayload | Track | Album) {
  const trackPayload = project as DnaDropTrackPayload;
  if (trackPayload.sharedAlbumContext?.direction && trackPayload.direction?.inheritFromAlbum !== false) {
    return { ...trackPayload.sharedAlbumContext.direction, ...trackPayload.direction };
  }
  return project.direction;
}
