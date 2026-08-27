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

/** Extract only intentional public Track Vibe fields from a release snapshot. */
export function publicMusicMetadataFromTrack(value: unknown): PublicMusicMetadata {
  const track = record(value) || {};
  const vibe = record(track.vibe) || {};
  const context = record(track.sharedAlbumContext) || {};
  const vibeOn = vibe.enabled !== false;
  const genre = vibeOn ? clean(vibe.genre, 50) : undefined;
  const moods = vibeOn ? cleanList(vibe.feeling, 8, 40) : [];
  const bpmValue = Number(vibe.tempoBPM);
  const bpm = vibeOn && Number.isFinite(bpmValue) && bpmValue >= 30 && bpmValue <= 300
    ? Math.round(bpmValue)
    : undefined;
  const instrumentation = vibeOn ? clean(vibe.instrumentation, 240) : undefined;
  const albumTitle = clean(context.title, 120);
  const albumShareId = clean(context.shareId, 160);
  return {
    genreStyles: genre && genre.toLocaleLowerCase() !== 'general' ? [genre] : [],
    moods,
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
  const unique = (values: string[], limit: number) => {
    const seen = new Set<string>();
    return values.filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  };
  return {
    genreStyles: unique(entries.flatMap((entry) => entry.genreStyles), 12),
    moods: unique(entries.flatMap((entry) => entry.moods), 16),
    ...(clean(albumTitle, 120) ? { albumTitle: clean(albumTitle, 120) } : {}),
  };
}
