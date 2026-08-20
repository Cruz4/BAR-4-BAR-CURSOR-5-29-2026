/**
 * Scene house bar pin — hero vs Discover dock, plus unseen reply count.
 */

export const HOUSE_BAR_PIN_CHANGED_EVENT = 'b4b-house-bar-pin-changed';
export const HOUSE_BAR_THREAD_UPDATED_EVENT = 'b4b-house-bar-thread-updated';

export type HouseBarPinPlacement = 'hero' | 'dock';

const PIN_KEY = 'b4b.scene.houseBar.pin';
const SEEN_KEY = 'b4b.scene.houseBar.seen';

type PinRecord = { seed: string; placement: HouseBarPinPlacement };
type SeenRecord = { seed: string; count: number };

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getHouseBarPinPlacement(seed: string): HouseBarPinPlacement {
  const rec = readJson<PinRecord>(PIN_KEY);
  if (!rec || rec.seed !== seed) return 'hero';
  return rec.placement === 'dock' ? 'dock' : 'hero';
}

export function setHouseBarPinPlacement(seed: string, placement: HouseBarPinPlacement) {
  writeJson(PIN_KEY, { seed, placement } satisfies PinRecord);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOUSE_BAR_PIN_CHANGED_EVENT));
  }
}

export function notifyHouseBarThreadUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOUSE_BAR_THREAD_UPDATED_EVENT));
  }
}

/** Unseen replies since last view. First load for a seed baselines so existing bars are not all "new". */
export function getHouseBarNewCount(seed: string, echoCount: number): number {
  const rec = readJson<SeenRecord>(SEEN_KEY);
  if (!rec || rec.seed !== seed) return 0;
  return Math.max(0, echoCount - rec.count);
}

export function ensureHouseBarSeenBaseline(seed: string, echoCount: number) {
  const rec = readJson<SeenRecord>(SEEN_KEY);
  if (rec && rec.seed === seed) {
    if (echoCount < rec.count) {
      writeJson(SEEN_KEY, { seed, count: echoCount } satisfies SeenRecord);
    }
    return;
  }
  writeJson(SEEN_KEY, { seed, count: echoCount } satisfies SeenRecord);
}

export function markHouseBarSeen(seed: string, echoCount: number) {
  writeJson(SEEN_KEY, { seed, count: echoCount } satisfies SeenRecord);
}
