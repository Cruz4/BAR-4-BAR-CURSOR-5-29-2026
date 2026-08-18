import { countRhymeBars, lastNonEmptyBarText } from '@/lib/lyrics-units';
import { isTrackEditorPath } from '@/lib/studio-tips-session';
import type { Track } from '@/lib/types';

export const BOOTH_MEMORY_KEY = 'b4b_booth_memory';
const BAR_SNIPPET = 96;

export type BoothMemory = {
  trackPath: string;
  trackTitle: string;
  albumTitle?: string;
  lastBarText?: string;
  barCount: number;
  updatedAt: string;
};

export function snippetBarText(text: string | undefined, max = BAR_SNIPPET): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function boothMemoryFromTrack(input: {
  path: string;
  track: Pick<Track, 'title' | 'sections'>;
  albumTitle?: string;
}): BoothMemory | null {
  if (!isTrackEditorPath(input.path)) return null;
  const lastBar = lastNonEmptyBarText(input.track.sections);
  return {
    trackPath: input.path,
    trackTitle: input.track.title?.trim() || 'Untitled',
    albumTitle: input.albumTitle?.trim() || undefined,
    lastBarText: lastBar || undefined,
    barCount: countRhymeBars(input.track.sections),
    updatedAt: new Date().toISOString(),
  };
}

export function readLocalBoothMemory(): BoothMemory | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BOOTH_MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BoothMemory;
    if (!parsed?.trackPath || !isTrackEditorPath(parsed.trackPath)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalBoothMemory(memory: BoothMemory): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BOOTH_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

/** Local snapshot now; Firestore craft resume when signed in. */
export function persistBoothMemorySnapshot(memory: BoothMemory): void {
  writeLocalBoothMemory(memory);
  void import('@/lib/activity/client').then((m) =>
    m.persistCraftResume(memory.trackPath, {
      title: memory.trackTitle,
      albumTitle: memory.albumTitle || '',
      lastBarText: memory.lastBarText || '',
      barCount: memory.barCount,
    })
  );
}

export function craftToBoothMemory(craft: {
  lastTrackPath?: string | null;
  lastTrackTitle?: string | null;
  lastAlbumTitle?: string | null;
  lastBarText?: string | null;
  barCount?: number | null;
  updatedAt?: string | null;
}): BoothMemory | null {
  const path = craft.lastTrackPath?.trim();
  if (!path || !isTrackEditorPath(path)) return null;
  return {
    trackPath: path,
    trackTitle: craft.lastTrackTitle?.trim() || 'Untitled',
    albumTitle: craft.lastAlbumTitle?.trim() || undefined,
    lastBarText: craft.lastBarText?.trim() || undefined,
    barCount: typeof craft.barCount === 'number' && craft.barCount >= 0 ? craft.barCount : 0,
    updatedAt: craft.updatedAt || new Date().toISOString(),
  };
}
