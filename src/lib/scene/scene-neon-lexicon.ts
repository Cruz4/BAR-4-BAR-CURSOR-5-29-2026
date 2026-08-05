/**
 * Scene skyline neon lexicon — one deep word + gloss per calendar day.
 *
 * Corpus: ~4k craft / night / writing / music words (see scene-neon-lexicon-corpus.ts).
 * Rotation: each calendar month draws a fresh pool of ~300 words (seeded by YYYY-MM).
 * Year lock: once a word is shown this calendar year, it won't return until Jan 1.
 * Sticky day: refreshing The Scene keeps today's word (no reshuffle on remount).
 */

import { SCENE_NEON_CORPUS } from '@/lib/scene/scene-neon-lexicon-corpus';

export type SceneNeonEntry = {
  id: string;
  word: string;
  /** Simplified phonetic pronunciation, e.g. "sih-ZHUR-uh". */
  pron: string;
  gloss: string;
};

export const SCENE_NEON_LEXICON: SceneNeonEntry[] = SCENE_NEON_CORPUS.map((e) => ({
  id: e.id,
  word: e.word,
  pron: e.pron,
  gloss: e.gloss,
}));

const MONTHLY_POOL_SIZE = 300;
const DAY_CACHE_KEY = 'b4b-scene-neon-day-v2';
const YEAR_USED_KEY = 'b4b-scene-neon-year-used-v2';

const BY_ID = new Map(SCENE_NEON_LEXICON.map((e) => [e.id, e]));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getDayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function getYearKey(d = new Date()): string {
  return String(d.getFullYear());
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

type DayCache = { dayKey: string; entryId: string };
type YearUsedStore = { yearKey: string; ids: string[] };

function readDayCache(): DayCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DAY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DayCache>;
    if (typeof parsed.dayKey !== 'string' || typeof parsed.entryId !== 'string') return null;
    return { dayKey: parsed.dayKey, entryId: parsed.entryId };
  } catch {
    return null;
  }
}

function writeDayCache(cache: DayCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAY_CACHE_KEY, JSON.stringify(cache));
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

/** Deterministic ~300-word pool for the calendar month (same for every visitor). */
export function getMonthlyNeonPool(
  monthKey = getMonthKey(),
  yearUsed: Set<string> = new Set()
): SceneNeonEntry[] {
  const unused = SCENE_NEON_LEXICON.filter((e) => !yearUsed.has(e.id));
  const source = unused.length >= MONTHLY_POOL_SIZE ? unused : SCENE_NEON_LEXICON;
  const seed = hashString(`b4b-neon-month:${monthKey}:v2`);
  return seededShuffle(source, seed).slice(0, Math.min(MONTHLY_POOL_SIZE, source.length));
}

/**
 * Pick today's neon entry.
 * Same calendar day → same word (sticky). Avoids year-repeats when the corpus allows.
 */
export function pickSceneNeonEntry(now = new Date()): SceneNeonEntry {
  const dayKey = getDayKey(now);
  const monthKey = getMonthKey(now);
  const yearKey = getYearKey(now);

  const dayCache = readDayCache();
  if (dayCache?.dayKey === dayKey) {
    const sticky = BY_ID.get(dayCache.entryId);
    if (sticky) return sticky;
  }

  const yearUsed = readYearUsed(yearKey);
  const monthly = getMonthlyNeonPool(monthKey, yearUsed);

  let candidates = monthly.filter((e) => !yearUsed.has(e.id));
  if (candidates.length === 0) {
    candidates = SCENE_NEON_LEXICON.filter((e) => !yearUsed.has(e.id));
  }
  if (candidates.length === 0) {
    // Year exhausted (unlikely with 4k corpus) — fall back to monthly pool.
    candidates = monthly.length > 0 ? monthly : SCENE_NEON_LEXICON;
  }

  // Stable pick for this calendar day inside the candidate set.
  const idx = hashString(`b4b-neon-day:${dayKey}:v2`) % candidates.length;
  const entry = candidates[idx] ?? SCENE_NEON_LEXICON[0]!;

  yearUsed.add(entry.id);
  writeYearUsed(yearKey, yearUsed);
  writeDayCache({ dayKey, entryId: entry.id });
  return entry;
}

/** Lexicon size (for admin / debug). */
export function sceneNeonLexiconSize(): number {
  return SCENE_NEON_LEXICON.length;
}
