import { countRhymeBars, lastNonEmptyBarText } from '@/lib/lyrics-units';
import { isTrackEditorPath } from '@/lib/studio-tips-session';
import type { Track } from '@/lib/types';

export const BOOTH_MEMORY_KEY = 'b4b_booth_memory';
export const BOOTH_MEMORY_DISMISSED_KEY = 'b4b_booth_memory_dismissed';
const BAR_SNIPPET = 96;

type DismissedBoothMemory = {
  trackPath: string;
  updatedAt: string;
};

export type BoothMemory = {
  ownerId: string;
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
  ownerId: string;
  path: string;
  track: Pick<Track, 'title' | 'sections' | 'status'>;
  albumTitle?: string;
}): BoothMemory | null {
  if (!input.ownerId.trim() || !isTrackEditorPath(input.path) || input.track.status === 'complete') return null;
  const lastBar = lastNonEmptyBarText(input.track.sections);
  return {
    ownerId: input.ownerId,
    trackPath: input.path,
    trackTitle: input.track.title?.trim() || 'Untitled',
    albumTitle: input.albumTitle?.trim() || undefined,
    lastBarText: lastBar || undefined,
    barCount: countRhymeBars(input.track.sections),
    updatedAt: new Date().toISOString(),
  };
}

function scopedKey(prefix: string, ownerId: string): string {
  return `${prefix}:${ownerId}`;
}

/** Legacy keys had no account owner. Never display them to any signed-in account. */
function purgeUnscopedAndForeignBoothMemory(ownerId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BOOTH_MEMORY_KEY);
    localStorage.removeItem(BOOTH_MEMORY_DISMISSED_KEY);
    const keepMemory = scopedKey(BOOTH_MEMORY_KEY, ownerId);
    const keepDismissed = scopedKey(BOOTH_MEMORY_DISMISSED_KEY, ownerId);
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const foreignMemory = key.startsWith(`${BOOTH_MEMORY_KEY}:`) && key !== keepMemory;
      const foreignDismissed = key.startsWith(`${BOOTH_MEMORY_DISMISSED_KEY}:`) && key !== keepDismissed;
      if (foreignMemory || foreignDismissed) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** Clear only this track's cached Booth Memory; leave every other track untouched. */
export function clearLocalBoothMemoryForTrack(trackPath: string, ownerId: string): void {
  if (typeof window === 'undefined' || !ownerId || !isTrackEditorPath(trackPath)) return;
  const now = new Date().toISOString();
  try {
    const current = readLocalBoothMemory(ownerId);
    if (!current || current.trackPath === trackPath) {
      localStorage.removeItem(scopedKey(BOOTH_MEMORY_KEY, ownerId));
    }
    localStorage.setItem(
      scopedKey(BOOTH_MEMORY_DISMISSED_KEY, ownerId),
      JSON.stringify({ trackPath, updatedAt: now } satisfies DismissedBoothMemory)
    );
  } catch {
    /* ignore */
  }
}

/** Remove a completed track from local and signed-in cross-device resume state. */
export function clearBoothMemoryForTrack(trackPath: string, ownerId: string): void {
  clearLocalBoothMemoryForTrack(trackPath, ownerId);
  void import('@/lib/activity/client').then((m) => m.clearCraftResume(trackPath, ownerId));
}

export function readLocalBoothMemory(ownerId: string): BoothMemory | null {
  if (typeof window === 'undefined' || !ownerId) return null;
  try {
    purgeUnscopedAndForeignBoothMemory(ownerId);
    const key = scopedKey(BOOTH_MEMORY_KEY, ownerId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BoothMemory;
    if (parsed?.ownerId !== ownerId || !parsed.trackPath || !isTrackEditorPath(parsed.trackPath)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalBoothMemory(memory: BoothMemory): void {
  if (typeof window === 'undefined' || !memory.ownerId) return;
  try {
    purgeUnscopedAndForeignBoothMemory(memory.ownerId);
    localStorage.setItem(scopedKey(BOOTH_MEMORY_KEY, memory.ownerId), JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

function readDismissedBoothMemory(ownerId: string): DismissedBoothMemory | null {
  if (typeof window === 'undefined' || !ownerId) return null;
  try {
    const raw = localStorage.getItem(scopedKey(BOOTH_MEMORY_DISMISSED_KEY, ownerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissedBoothMemory;
    if (!parsed?.trackPath || !isTrackEditorPath(parsed.trackPath)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isBoothMemoryDismissed(memory: BoothMemory): boolean {
  const dismissed = readDismissedBoothMemory(memory.ownerId);
  if (!dismissed || dismissed.trackPath !== memory.trackPath) return false;
  const memoryTs = Date.parse(memory.updatedAt);
  const dismissedTs = Date.parse(dismissed.updatedAt);
  if (!Number.isFinite(memoryTs) || !Number.isFinite(dismissedTs)) return true;
  return memoryTs <= dismissedTs;
}

/** Hide from Scene until a newer sheet write. Does not delete the track. */
export function dismissBoothMemory(memory: BoothMemory): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const memoryTs = Date.parse(memory.updatedAt);
  const dismissedAt = Number.isFinite(memoryTs) && memoryTs > now
    ? memory.updatedAt
    : new Date(now).toISOString();
  try {
    localStorage.setItem(
      scopedKey(BOOTH_MEMORY_DISMISSED_KEY, memory.ownerId),
      JSON.stringify({ trackPath: memory.trackPath, updatedAt: dismissedAt } satisfies DismissedBoothMemory)
    );
    localStorage.removeItem(scopedKey(BOOTH_MEMORY_KEY, memory.ownerId));
  } catch {
    /* ignore */
  }
}

export function visibleBoothMemory(memory: BoothMemory | null): BoothMemory | null {
  if (!memory || isBoothMemoryDismissed(memory)) return null;
  return memory;
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
    }, memory.ownerId)
  );
}

export function craftToBoothMemory(craft: {
  lastTrackPath?: string | null;
  lastTrackTitle?: string | null;
  lastAlbumTitle?: string | null;
  lastBarText?: string | null;
  barCount?: number | null;
  updatedAt?: string | null;
}, ownerId: string): BoothMemory | null {
  const path = craft.lastTrackPath?.trim();
  if (!ownerId || !path || !isTrackEditorPath(path)) return null;
  return {
    ownerId,
    trackPath: path,
    trackTitle: craft.lastTrackTitle?.trim() || 'Untitled',
    albumTitle: craft.lastAlbumTitle?.trim() || undefined,
    lastBarText: craft.lastBarText?.trim() || undefined,
    barCount: typeof craft.barCount === 'number' && craft.barCount >= 0 ? craft.barCount : 0,
    updatedAt: craft.updatedAt || new Date().toISOString(),
  };
}
