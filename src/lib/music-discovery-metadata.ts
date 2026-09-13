import { normalizeReleaseDiscoveryMetadata } from '@/lib/release-discovery';

export type PublicMusicMetadata = {
  genreStyles: string[];
  moods: string[];
  bpm?: number;
  instrumentation?: string;
  albumTitle?: string;
  albumShareId?: string;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
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

function uniqueLabels(values: Array<string | undefined>, limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const item = clean(raw, 50);
    const key = item?.toLocaleLowerCase();
    if (!item || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

/** Extract public genre / mood tags from Track Vibe and New Release discovery fields. */
export function publicMusicMetadataFromTrack(value: unknown): PublicMusicMetadata {
  const track = record(value) || {};
  const vibe = record(track.vibe) || {};
  const context = record(track.sharedAlbumContext) || {};
  const discovery = normalizeReleaseDiscoveryMetadata(track.releaseDiscovery ?? track.discovery);
  const vibeOn = vibe.enabled !== false;
  const vibeGenre = vibeOn ? clean(vibe.genre, 50) : undefined;
  const vibeMoods = vibeOn ? cleanList(vibe.feeling, 8, 40) : [];
  const bpmValue = Number(vibe.tempoBPM);
  const bpm = vibeOn && Number.isFinite(bpmValue) && bpmValue >= 30 && bpmValue <= 300
    ? Math.round(bpmValue)
    : undefined;
  const instrumentation = vibeOn ? clean(vibe.instrumentation, 240) : undefined;
  const albumTitle = clean(context.title, 120);
  const albumShareId = clean(context.shareId, 160);
  return {
    genreStyles: uniqueLabels([
      vibeGenre && vibeGenre.toLocaleLowerCase() !== 'general' ? vibeGenre : undefined,
      ...(discovery.genres || []),
    ], 12),
    moods: uniqueLabels([...vibeMoods, ...(discovery.moods || [])], 16),
    ...(bpm ? { bpm } : {}),
    ...(instrumentation ? { instrumentation } : {}),
    ...(albumTitle ? { albumTitle } : {}),
    ...(albumShareId ? { albumShareId } : {}),
  };
}

export function publicMusicMetadataSearchText(metadata: PublicMusicMetadata): string {
  return [
    ...metadata.genreStyles,
    ...metadata.moods,
    metadata.bpm ? `${metadata.bpm} BPM` : '',
    metadata.instrumentation || '',
    metadata.albumTitle || '',
  ].filter(Boolean).join(' ');
}

export function combinePublicMusicMetadata(
  entries: PublicMusicMetadata[],
  albumTitle?: string
): PublicMusicMetadata {
  const first = entries[0];
  const title = clean(albumTitle, 120) || first?.albumTitle;
  return {
    genreStyles: uniqueLabels(entries.flatMap((entry) => entry.genreStyles), 12),
    moods: uniqueLabels(entries.flatMap((entry) => entry.moods), 16),
    ...(title ? { albumTitle: title } : {}),
    ...(first?.bpm ? { bpm: first.bpm } : {}),
    ...(first?.instrumentation ? { instrumentation: first.instrumentation } : {}),
    ...(first?.albumShareId ? { albumShareId: first.albumShareId } : {}),
  };
}
