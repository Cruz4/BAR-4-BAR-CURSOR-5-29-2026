import type { Album, Direction, StyleProfile, Track } from '@/lib/types';
import { CREATIVE_DNA_FIELDS } from '@/lib/dna-strands';
import {
  guardrailsWithSyncedEnabled,
  directionWithSyncedEnabled,
  isAlbumDnaActive,
  isGuardrailsActive,
  isInheritFromAlbumOn,
  isIntentsActive,
  isLooseTrackAlbum,
  isStyleActive,
  isTrackDnaActive,
  isVibeActive,
} from '@/lib/co-writer-rules';
import { hasDirectionContent, mergeDirection } from '@/lib/utils';
import { normalizeDropPrice, publicDropAudio } from '@/lib/drop-commerce';
import { orderAlbumTracks, trackOrderFromTracks } from '@/lib/album-track-order';

/** True when this project has an active public Lyrics DNA Drop link (shareId persisted on album/track). */
export function hasActiveDnaDrop(shareId?: string | null): boolean {
  return typeof shareId === 'string' && shareId.trim().length > 0;
}

/** Tracks in an album that do not yet have a live Lyrics DNA Drop link. */
export function tracksMissingDnaDrop(album: Pick<Album, 'tracks'> | null | undefined): Track[] {
  return (album?.tracks ?? []).filter((t) => !hasActiveDnaDrop(t.shareId));
}

/** Non-empty lyric bar count — used on album hub track cards. */
export function trackLyricBarCount(track: Pick<Track, 'sections'>): number {
  let n = 0;
  for (const sec of track.sections ?? []) {
    for (const bar of sec.bars ?? []) {
      if (bar.text?.trim()) n += 1;
    }
  }
  return n;
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
  /** Album cover when the track has no art of its own — used on public snapshot pages. */
  coverArtUrl?: string;
  /** Parent album Lyrics DNA Drop share id when the album is live. */
  shareId?: string;
  direction?: Album['direction'];
  thingsToSay?: string[];
};

/** Track cover first; else album cover from drop context or a live vault fallback. */
export function resolveDnaDropCoverArt(
  project: {
    coverArtUrl?: string | null;
    sharedAlbumContext?: Pick<DnaDropAlbumContext, 'coverArtUrl'> | null;
  },
  fallbackAlbumCover?: string | null
): string | undefined {
  const own = project.coverArtUrl?.trim();
  if (own) return own;
  const fromCtx = project.sharedAlbumContext?.coverArtUrl?.trim();
  if (fromCtx) return fromCtx;
  const fromAlbum = fallbackAlbumCover?.trim();
  if (fromAlbum) return fromAlbum;
  return undefined;
}

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

const MAX_DNA_DROP_MEDIA = 6;

/** Normalize / cap Lyrics DNA Drop media URLs for snapshot + storage. */
export function normalizeDnaDropMedia(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    } catch {
      continue;
    }
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= MAX_DNA_DROP_MEDIA) break;
  }
  return out;
}

export const DNA_DROP_MEDIA_LIMIT = MAX_DNA_DROP_MEDIA;

function styleSnapshot(
  styleProfile: StyleProfile | null | undefined
): DnaDropStyleSnapshot | undefined {
  const latest = styleProfile?.history?.[0];
  if (!latest?.analysis?.trim()) return undefined;
  const snapshot: DnaDropStyleSnapshot = { analysis: latest.analysis.trim() };
  if (latest.metrics) snapshot.metrics = latest.metrics;
  return snapshot;
}

function stripDirectionFields(direction?: Partial<Direction> | null): Partial<Direction> {
  const next: Partial<Direction> = { ...(direction ?? {}) };
  for (const { key } of CREATIVE_DNA_FIELDS) {
    // CREATIVE_DNA_FIELDS keys are string DNA slots; cast avoids keyof Direction boolean fields.
    (next as Record<string, string | boolean | undefined>)[key] = '';
  }
  next.enabled = false;
  return next;
}

function stripWorkstationOnlyFields(payload: DnaDropTrackPayload) {
  delete payload.relayData;
  delete payload.draftChest;
  delete payload.sheetTakes;
  delete payload.approvalDraftBacklog;
  delete payload.suggestedTitlesHistory;
  delete payload.vibePresets;
}

/** Keep only Co-Writer / workstation rules that are toggled on at snapshot time. */
function sanitizeTrackForSnapshot(
  track: Track,
  styleProfile: StyleProfile | null | undefined,
  album?: Album
): DnaDropTrackPayload {
  const payload = clone(track) as DnaDropTrackPayload;
  stripWorkstationOnlyFields(payload);

  const styleOn = isStyleActive(track);
  payload.styleEnabled = styleOn;
  if (styleOn) {
    const sharedStyle = styleSnapshot(styleProfile);
    if (sharedStyle) payload.sharedStyle = sharedStyle;
  } else {
    delete payload.sharedStyle;
  }

  if (isIntentsActive(track)) {
    payload.intentsEnabled = true;
    payload.checkedIntents = [...(track.checkedIntents ?? [])];
    payload.intentRefs = payload.checkedIntents;
    if (!track.endWith?.trim() || !payload.checkedIntents.includes(track.endWith)) {
      payload.endWith = null;
    }
  } else {
    payload.intentsEnabled = false;
    payload.checkedIntents = [];
    payload.intentRefs = [];
    payload.endWith = null;
  }

  if (isGuardrailsActive(track)) {
    payload.guardrails = guardrailsWithSyncedEnabled(track.guardrails, { enabled: true });
  } else {
    payload.guardrails = { enabled: false };
  }

  const inheritAlbum = isInheritFromAlbumOn(track, album);
  if (isTrackDnaActive(track)) {
    payload.direction = directionWithSyncedEnabled(
      { ...(track.direction ?? {}), inheritFromAlbum: inheritAlbum },
      true
    );
  } else {
    payload.direction = {
      ...stripDirectionFields(track.direction),
      inheritFromAlbum: inheritAlbum,
      enabled: false,
    };
  }

  if (isVibeActive(track)) {
    payload.vibe = { ...track.vibe, enabled: true };
  } else {
    payload.vibe = {
      genre: track.vibe?.genre ?? 'General',
      tempoBPM: track.vibe?.tempoBPM ?? 90,
      feeling: [],
      enabled: false,
    };
  }

  const instructions = track.specialInstructions?.trim();
  if (instructions) payload.specialInstructions = instructions;
  else delete payload.specialInstructions;

  const media = normalizeDnaDropMedia(track.dnaDropMedia);
  if (media.length) payload.dnaDropMedia = media;
  else delete payload.dnaDropMedia;

  const audio = publicDropAudio(track.dropAudio);
  if (audio) payload.dropAudio = audio;
  else delete payload.dropAudio;
  payload.dropPrice = normalizeDropPrice(track.dropPrice);

  if (album && !isLooseTrackAlbum(album)) {
    const ctx: DnaDropAlbumContext = {
      title: album.title,
      theme: album.theme,
    };
    const albumCover = album.coverArtUrl?.trim();
    if (albumCover) ctx.coverArtUrl = albumCover;
    if (hasActiveDnaDrop(album.shareId)) ctx.shareId = album.shareId!.trim();
    if (isAlbumDnaActive(track, album) && album.direction?.enabled) {
      ctx.direction = album.direction;
    }
    if (isIntentsActive(track) && payload.checkedIntents?.length) {
      ctx.thingsToSay = payload.checkedIntents;
    }
    payload.sharedAlbumContext = ctx;
  } else {
    delete payload.sharedAlbumContext;
  }

  return payload;
}

function sanitizeAlbumForSnapshot(
  album: Album,
  styleProfile: StyleProfile | null | undefined
): DnaDropAlbumPayload {
  const payload = clone(album) as DnaDropAlbumPayload;
  delete payload.dnaPresets;
  delete payload.stylePresets;

  if (album.direction?.enabled) {
    payload.direction = album.direction;
  } else {
    payload.direction = { ...stripDirectionFields(album.direction), enabled: false };
  }

  const media = normalizeDnaDropMedia(album.dnaDropMedia);
  if (media.length) payload.dnaDropMedia = media;
  else delete payload.dnaDropMedia;
  payload.dropPrice = normalizeDropPrice(album.dropPrice);

  // Keep per-track shareIds for Discover/permalinks. Album hub opens lyrics
  // from this snapshot (`?track=`), so a missing track share cannot dump to Discover.
  const orderedTracks = orderAlbumTracks(album.tracks ?? [], album);
  payload.trackOrder = trackOrderFromTracks(orderedTracks);
  payload.tracks = orderedTracks.map((t) => {
    const sanitized = sanitizeTrackForSnapshot(t, styleProfile, album);
    // The album hub already reads the top-level cover as every track's fallback.
    // Repeating a base64 album cover inside each track can multiply one image into
    // several megabytes and exceed Firestore's per-document limit.
    if (sanitized.sharedAlbumContext) {
      delete sanitized.sharedAlbumContext.coverArtUrl;
    }
    if (sanitized.coverArtUrl === payload.coverArtUrl) {
      delete sanitized.coverArtUrl;
    }
    if (hasActiveDnaDrop(t.shareId)) sanitized.shareId = t.shareId!.trim();
    else delete sanitized.shareId;
    return sanitized;
  });
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
  return sanitizeTrackForSnapshot(track, styleProfile, album);
}

export function buildAlbumDropPayload(
  album: Album,
  styleProfile: StyleProfile | null | undefined
): DnaDropAlbumPayload {
  return sanitizeAlbumForSnapshot(album, styleProfile);
}

/** Intents shown on a shared track — only motifs that were active at snapshot time. */
export function sharedTrackIntents(track: DnaDropTrackPayload | Track): string[] {
  if (!isIntentsActive(track)) return [];
  if (track.checkedIntents?.length) return track.checkedIntents;
  return track.intentRefs ?? [];
}

export function resolveSharedDirection(
  project: DnaDropTrackPayload | DnaDropAlbumPayload | Track | Album
): Direction | undefined {
  const albumPayload = project as DnaDropAlbumPayload;
  if (Array.isArray(albumPayload.tracks)) {
    const merged = mergeDirection(albumPayload.direction, undefined);
    return hasDirectionContent(merged) ? merged : undefined;
  }

  const trackPayload = project as DnaDropTrackPayload;
  const albumDirection =
    trackPayload.sharedAlbumContext?.direction &&
    trackPayload.direction?.inheritFromAlbum !== false
      ? trackPayload.sharedAlbumContext.direction
      : undefined;
  const trackDirection = isTrackDnaActive(trackPayload) ? trackPayload.direction : undefined;
  const merged = mergeDirection(albumDirection, trackDirection);
  return hasDirectionContent(merged) ? merged : undefined;
}
