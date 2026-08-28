/**
 * Release discovery metadata + Artist Home / rail counter helpers.
 * Album nested tracks never count as separate release entities.
 */

export type ReleaseDiscoveryFormat = 'single' | 'album' | 'ep' | 'other';

export type ReleaseDiscoveryCredit = {
  name: string;
  role?: string;
};

export type ReleaseDiscoveryMetadata = {
  format?: ReleaseDiscoveryFormat;
  /** ISO date or freeform release date string. */
  date?: string;
  genres?: string[];
  moods?: string[];
  language?: string;
  explicit?: boolean;
  credits?: ReleaseDiscoveryCredit[];
};

/** Minimal Live DNA Drop / share row shape used by counter helpers. */
export type ReleaseDiscoveryRow = {
  shareId?: string;
  type?: 'album' | 'track' | string;
  albumShareId?: string;
  hasDropAudio?: boolean;
  releaseLive?: boolean;
  dnaLive?: boolean;
  discovery?: unknown;
  releaseDiscovery?: unknown;
};

const FORMATS: readonly ReleaseDiscoveryFormat[] = ['single', 'album', 'ep', 'other'];

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, max);
  return normalized || undefined;
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value) {
    const item = clean(raw, maxLength);
    const key = item?.toLocaleLowerCase();
    if (!item || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= maxItems) break;
  }
  return result;
}

function normalizeCredits(value: unknown): ReleaseDiscoveryCredit[] {
  if (!Array.isArray(value)) return [];
  const out: ReleaseDiscoveryCredit[] = [];
  for (const entry of value) {
    const row = record(entry);
    const name = clean(row?.name ?? entry, 80);
    if (!name) continue;
    const role = clean(row?.role, 60);
    out.push(role ? { name, role } : { name });
    if (out.length >= 24) break;
  }
  return out;
}

/** Normalize optional discovery metadata from album/track payloads. */
export function normalizeReleaseDiscoveryMetadata(
  value: unknown
): ReleaseDiscoveryMetadata {
  const data = record(value) || {};
  const formatRaw = typeof data.format === 'string' ? data.format.trim().toLowerCase() : '';
  const format = FORMATS.includes(formatRaw as ReleaseDiscoveryFormat)
    ? (formatRaw as ReleaseDiscoveryFormat)
    : undefined;
  const date = clean(data.date ?? data.releaseDate, 40);
  const genres = cleanList(data.genres ?? data.genreStyles, 12, 50);
  const moods = cleanList(data.moods, 16, 40);
  const language = clean(data.language, 40);
  const explicit = typeof data.explicit === 'boolean' ? data.explicit : undefined;
  const credits = normalizeCredits(data.credits);

  const out: ReleaseDiscoveryMetadata = {};
  if (format) out.format = format;
  if (date) out.date = date;
  if (genres.length) out.genres = genres;
  if (moods.length) out.moods = moods;
  if (language) out.language = language;
  if (explicit !== undefined) out.explicit = explicit;
  if (credits.length) out.credits = credits;
  return out;
}

export function releaseDiscoveryMetadataFromRow(
  row: ReleaseDiscoveryRow
): ReleaseDiscoveryMetadata {
  return normalizeReleaseDiscoveryMetadata(row.discovery ?? row.releaseDiscovery);
}

function isLiveRelease(row: ReleaseDiscoveryRow): boolean {
  if (row.releaseLive === true) return true;
  if (row.releaseLive === false) return false;
  return Boolean(row.hasDropAudio);
}

function isLyricPreview(row: ReleaseDiscoveryRow): boolean {
  if (row.dnaLive === true) return true;
  if (row.dnaLive === false) return false;
  return !row.hasDropAudio;
}

/** Nested under a live album card — not a separate release entity. */
function isNestedAlbumTrack(row: ReleaseDiscoveryRow): boolean {
  return row.type === 'track' && Boolean(row.albumShareId);
}

/**
 * Live public release entities (albums + standalone singles).
 * Nested album tracks do not count unless they lack an albumShareId (separately pressed).
 */
export function countReleaseEntities(rows: ReleaseDiscoveryRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (!isLiveRelease(row)) continue;
    if (isNestedAlbumTrack(row)) continue;
    count += 1;
  }
  return count;
}

/** Live album release hubs. */
export function countAlbums(rows: ReleaseDiscoveryRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.type !== 'album') continue;
    if (!isLiveRelease(row)) continue;
    count += 1;
  }
  return count;
}

/** Playable songs — tracks with audio, including nested album tracks. */
export function countPlayableSongs(rows: ReleaseDiscoveryRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.type === 'album') continue;
    if (!row.hasDropAudio) continue;
    if (row.releaseLive === false) continue;
    count += 1;
  }
  return count;
}

/** DNA-only lyric preview pages (not live music releases). */
export function countLyricPreviews(rows: ReleaseDiscoveryRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (!isLyricPreview(row)) continue;
    if (isLiveRelease(row)) continue;
    count += 1;
  }
  return count;
}

export type ReleaseDiscoveryCounts = {
  releases: number;
  albums: number;
  playableSongs: number;
  lyricPreviews: number;
};

export function countReleaseDiscovery(rows: ReleaseDiscoveryRow[]): ReleaseDiscoveryCounts {
  return {
    releases: countReleaseEntities(rows),
    albums: countAlbums(rows),
    playableSongs: countPlayableSongs(rows),
    lyricPreviews: countLyricPreviews(rows),
  };
}
