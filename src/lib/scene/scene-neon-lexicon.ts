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

/** Soft max for a complete first-sentence gloss (characters). */
export const SCENE_NEON_GLOSS_MAX = 220;

/**
 * Normalize a neon gloss for display — keep a complete thought.
 * Does not mid-cut or force teasers.
 */
export function normalizeSceneNeonGloss(raw: string, maxLen = SCENE_NEON_GLOSS_MAX): string {
  let s = (raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';

  // Prefer the first full sentence when multiple are present.
  const sentence = s.match(/^[^.!?]+[.!?]?/);
  if (sentence) s = sentence[0].trim();

  // Drop trailing ellipsis left from older teaser corpus rows.
  s = s.replace(/[\s.…]+$/u, '').replace(/\.{2,}$/u, '').trim();

  const limit = Math.max(48, maxLen);
  if (s.length > limit) {
    let slice = s.slice(0, limit);
    const space = slice.lastIndexOf(' ');
    if (space > limit * 0.5) slice = slice.slice(0, space);
    s = slice.trim();
  }

  s = s.replace(/[,:;–—\-(\[{]+\s*$/u, '').trim();
  if (!s) return '';
  if (!/[.!?]$/.test(s)) s = `${s}.`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** @deprecated Use normalizeSceneNeonGloss — kept for any external imports. */
export const SCENE_NEON_GLOSS_TEASE_MAX = SCENE_NEON_GLOSS_MAX;
export function teaseSceneNeonGloss(raw: string, maxLen = SCENE_NEON_GLOSS_MAX): string {
  return normalizeSceneNeonGloss(raw, maxLen);
}

export const SCENE_NEON_LEXICON: SceneNeonEntry[] = SCENE_NEON_CORPUS.map((e) => ({
  id: e.id,
  word: e.word,
  pron: e.pron,
  gloss: normalizeSceneNeonGloss(e.gloss),
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
