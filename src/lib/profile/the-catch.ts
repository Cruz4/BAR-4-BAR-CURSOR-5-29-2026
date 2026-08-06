/**
 * The Catch — Artist Home interactive module.
 * Maker plants an ordered bar chain; visitors hunt each next end-sound
 * to unlock the run. Pure helpers (safe for client + normalize).
 */

export const CATCH_MIN_LINKS = 3;
export const CATCH_MAX_LINKS = 5;
export const CATCH_MAX_DECOYS = 10;
export const CATCH_LIVES = 3;

export type CatchLink = {
  text: string;
  /** Phonetic lure for THIS bar (shown when hunting the previous → this step). */
  endSound: string;
  shareId?: string;
  sourceLabel?: string;
};

export type TheCatch = {
  links: CatchLink[];
  /** Extra end-sounds from the vault so the lure field feels like their voice. */
  decoys: string[];
};

/** Last-word mouthfeel: rhyme key if present, else trailing vowel cluster. */
export function endSoundFromBar(text: string, rhymeKey?: string): string {
  const key = (rhymeKey || '').trim();
  if (key && key !== '?') return key.toLowerCase().slice(0, 16);

  const words = text.trim().split(/\s+/);
  const raw = (words[words.length - 1] || '').replace(/[^a-zA-Z']/g, '').toLowerCase();
  if (!raw) return '—';
  if (raw.length <= 3) return raw;
  const cluster = raw.match(/[aeiouy]{1,2}[a-z']*$/i);
  return (cluster ? cluster[0] : raw.slice(-3)).toLowerCase();
}

export function formatEndSoundDisplay(sound: string): string {
  const s = sound.trim().toLowerCase();
  if (!s || s === '—') return '—';
  if (s.startsWith('—') || s.startsWith('-')) return s;
  return `—${s}`;
}

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function normalizeTheCatch(raw: unknown): TheCatch | undefined {
  const obj = (raw && typeof raw === 'object' ? raw : null) as Partial<TheCatch> | null;
  if (!obj || !Array.isArray(obj.links)) return undefined;

  const links: CatchLink[] = [];
  for (const entry of obj.links.slice(0, CATCH_MAX_LINKS)) {
    const text = clean((entry as CatchLink)?.text, 280);
    if (!text) continue;
    const endSound =
      clean((entry as CatchLink)?.endSound, 16) || endSoundFromBar(text);
    const link: CatchLink = { text, endSound };
    const shareId = clean((entry as CatchLink)?.shareId, 40);
    if (shareId) link.shareId = shareId;
    const sourceLabel = clean((entry as CatchLink)?.sourceLabel, 80);
    if (sourceLabel) link.sourceLabel = sourceLabel;
    links.push(link);
  }
  if (links.length < 1) return undefined;

  const decoySet = new Set<string>();
  const linkSounds = new Set(links.map((l) => l.endSound.toLowerCase()));
  if (Array.isArray(obj.decoys)) {
    for (const d of obj.decoys) {
      const sound = clean(d, 16)?.toLowerCase();
      if (!sound || linkSounds.has(sound) || decoySet.has(sound)) continue;
      decoySet.add(sound);
      if (decoySet.size >= CATCH_MAX_DECOYS) break;
    }
  }

  return { links, decoys: [...decoySet] };
}

/** Build a shuffled lure field for hunting `targetIndex` (1..n-1). */
export function buildLureField(
  catchData: TheCatch,
  targetIndex: number,
  rng: () => number = Math.random
): string[] {
  const target = catchData.links[targetIndex]?.endSound;
  if (!target) return [];

  const pool = new Set<string>();
  pool.add(target.toLowerCase());

  for (const d of catchData.decoys) {
    if (d.toLowerCase() === target.toLowerCase()) continue;
    pool.add(d.toLowerCase());
  }
  // Other chain ends as soft decoys (except current target).
  for (let i = 0; i < catchData.links.length; i++) {
    if (i === targetIndex) continue;
    const s = catchData.links[i].endSound.toLowerCase();
    if (s !== target.toLowerCase()) pool.add(s);
  }

  const list = [...pool];
  // Fisher–Yates
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  // Cap field size so it stays readable; always keep target.
  if (list.length <= 7) return list;
  const kept = list.filter((s) => s === target.toLowerCase()).slice(0, 1);
  for (const s of list) {
    if (kept.length >= 7) break;
    if (!kept.includes(s)) kept.push(s);
  }
  return kept;
}

export function catchBestTimeStorageKey(profileUserId: string): string {
  return `b4b:catch-best:${profileUserId}`;
}
