/**
 * Scene skyline neon lexicon — one deep word + gloss per Scene land.
 *
 * Corpus: ~4k craft / night / writing / music words (see scene-neon-lexicon-corpus.ts).
 * Fresh word each visit by default. Optional lock (opt-in) keeps the word up to 24h,
 * then auto-expires so the next land can roll a new entry.
 * Soft year lock: prefer words not shown yet this calendar year; reset when exhausted.
 */

import { SCENE_NEON_CORPUS } from '@/lib/scene/scene-neon-lexicon-corpus';

export type SceneNeonEntry = {
  id: string;
  word: string;
  /** Simplified phonetic pronunciation, e.g. "sih-ZHUR-uh". */
  pron: string;
  gloss: string;
};

/** Soft cap for neon teaser glosses — always cut mid-thought, never a finished sentence. */
export const SCENE_NEON_GLOSS_TEASE_MAX = 64;

/**
 * Scene neon definitions are teasers only: truncate mid-phrase and end with …
 * so the skyline word never feels fully explained.
 */
export function teaseSceneNeonGloss(
  raw: string,
  maxLen = SCENE_NEON_GLOSS_TEASE_MAX
): string {
  let s = (raw || '').trim();
  // Strip prior ellipsis / terminal punctuation from corpus entries.
  s = s.replace(/[\s.…]+$/u, '').replace(/[.!?]+$/u, '').trim();
  if (!s) return '…';

  const limit = Math.max(24, maxLen);
  if (s.length > limit) {
    let slice = s.slice(0, limit);
    const space = slice.lastIndexOf(' ');
    if (space > limit * 0.45) slice = slice.slice(0, space);
    s = slice;
  } else {
    // Short but complete defs still get clipped so they feel unfinished.
    const cutAt = Math.max(18, Math.floor(s.length * 0.7));
    const space = s.lastIndexOf(' ', cutAt);
    if (space > 12) s = s.slice(0, space);
    else s = s.slice(0, cutAt);
  }

  s = s.replace(/[,:;–—\-(\[{]+\s*$/u, '').trim();
  if (!s) return '…';
  return `${s}…`;
}

export const SCENE_NEON_LEXICON: SceneNeonEntry[] = SCENE_NEON_CORPUS.map((e) => ({
  id: e.id,
  word: e.word,
  pron: e.pron,
  gloss: teaseSceneNeonGloss(e.gloss),
}));

/** Max duration a user lock keeps the same neon word. */
export const SCENE_NEON_LOCK_MS = 24 * 60 * 60 * 1000;

const YEAR_USED_KEY = 'b4b-scene-neon-year-used-v3';
/** Timed user lock — id + lockedAt; auto-clears after SCENE_NEON_LOCK_MS. */
const PINNED_KEY = 'b4b-scene-neon-pinned-v2';
const LEGACY_PINNED_KEY = 'b4b-scene-neon-pinned-v1';
/** Legacy day-sticky cache from v2 — cleared on first pick. */
const LEGACY_DAY_CACHE_KEY = 'b4b-scene-neon-day-v2';
const LEGACY_YEAR_USED_KEY = 'b4b-scene-neon-year-used-v2';

type YearUsedStore = { yearKey: string; ids: string[] };
type PinnedStore = { id: string; lockedAt: number };

function getYearKey(d = new Date()): string {
  return String(d.getFullYear());
}

function clearLegacyCaches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_DAY_CACHE_KEY);
    localStorage.removeItem(LEGACY_YEAR_USED_KEY);
    localStorage.removeItem(LEGACY_PINNED_KEY);
  } catch {
    /* ignore */
  }
}

function readYearUsed(yearKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(YEAR_USED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Partial<YearUsedStore>;
    if (parsed.yearKey !== yearKey || !Array.isArray(parsed.ids)) return new Set();
    return new Set(parsed.ids.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeYearUsed(yearKey: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      YEAR_USED_KEY,
      JSON.stringify({ yearKey, ids: [...ids] } satisfies YearUsedStore)
    );
  } catch {
    /* ignore */
  }
}

export function getSceneNeonEntryById(id: string): SceneNeonEntry | null {
  return SCENE_NEON_LEXICON.find((e) => e.id === id) ?? null;
}

function readPinnedStore(now = Date.now()): PinnedStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PinnedStore>;
    if (typeof parsed.id !== 'string' || !parsed.id) {
      unpinSceneNeonEntry();
      return null;
    }
    if (typeof parsed.lockedAt !== 'number' || !Number.isFinite(parsed.lockedAt)) {
      unpinSceneNeonEntry();
      return null;
    }
    if (now - parsed.lockedAt >= SCENE_NEON_LOCK_MS) {
      unpinSceneNeonEntry();
      return null;
    }
    return { id: parsed.id, lockedAt: parsed.lockedAt };
  } catch {
    return null;
  }
}

/** Active lock (not expired), if any. */
export function getPinnedSceneNeonEntry(now = new Date()): SceneNeonEntry | null {
  const store = readPinnedStore(now.getTime());
  if (!store) return null;
  const entry = getSceneNeonEntryById(store.id);
  if (!entry) {
    unpinSceneNeonEntry();
    return null;
  }
  return entry;
}

export function isSceneNeonPinned(id?: string | null, now = new Date()): boolean {
  const pinned = getPinnedSceneNeonEntry(now);
  if (!pinned) return false;
  if (!id) return true;
  return pinned.id === id;
}

/** Ms remaining on the current lock, or 0 if none / expired. */
export function sceneNeonLockRemainingMs(now = new Date()): number {
  const store = readPinnedStore(now.getTime());
  if (!store) return 0;
  return Math.max(0, SCENE_NEON_LOCK_MS - (now.getTime() - store.lockedAt));
}

/** Lock a word for up to 24 hours (opt-in; survives logout until expiry / unlock). */
export function pinSceneNeonEntry(entry: SceneNeonEntry, now = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PINNED_KEY,
      JSON.stringify({ id: entry.id, lockedAt: now.getTime() } satisfies PinnedStore)
    );
  } catch {
    /* ignore */
  }
}

/** Clear the lock — next resolve can roll a fresh word. */
export function unpinSceneNeonEntry(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PINNED_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the neon word for this Scene land.
 * Prefer an unexpired user lock; otherwise pick a fresh word (year soft-dedupe).
 */
export function resolveSceneNeonEntry(now = new Date()): {
  entry: SceneNeonEntry;
  pinned: boolean;
} {
  clearLegacyCaches();
  const pinned = getPinnedSceneNeonEntry(now);
  if (pinned) return { entry: pinned, pinned: true };
  return { entry: pickSceneNeonEntry(now), pinned: false };
}

/**
 * Pick a neon entry for this Scene land.
 * Fresh word each visit; avoids year-repeats until the corpus is exhausted.
 * Prefer `resolveSceneNeonEntry` when the pin lock should be honored.
 */
export function pickSceneNeonEntry(now = new Date()): SceneNeonEntry {
  clearLegacyCaches();

  const yearKey = getYearKey(now);
  const yearUsed = readYearUsed(yearKey);

  let candidates = SCENE_NEON_LEXICON.filter((e) => !yearUsed.has(e.id));
  if (candidates.length === 0) {
    // Year exhausted — reshuffle from the full corpus.
    candidates = SCENE_NEON_LEXICON;
    yearUsed.clear();
  }

  const entry = candidates[Math.floor(Math.random() * candidates.length)] ?? SCENE_NEON_LEXICON[0]!;
  yearUsed.add(entry.id);
  writeYearUsed(yearKey, yearUsed);
  return entry;
}

/** Lexicon size (for admin / debug). */
export function sceneNeonLexiconSize(): number {
  return SCENE_NEON_LEXICON.length;
}
