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

  if (album && !isLooseTrackAlbum(album)) {
    const ctx: DnaDropAlbumContext = {
      title: album.title,
      theme: album.theme,
    };
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

  payload.tracks = (album.tracks ?? []).map((t) => sanitizeTrackForSnapshot(t, styleProfile, album));
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
