/**
 * Scene home — Your Block / Discover expand prefs + “new since last seen” stamps.
 */

/** Friend/circle posts per page on Scene Your Block. */
export const BLOCK_PAGE_SIZE = 25;
/** Newest posts loaded per circle member for Your Block (client-paged). */
export const BLOCK_FETCH_PER_OWNER = 80;
/** Discover cards per page on Scene home and /discover. */
export const DISCOVER_PAGE_SIZE = 40;

export const SCENE_BLOCK_EXPANDED_KEY = 'b4b-scene-block-expanded';
export const SCENE_DISCOVER_EXPANDED_KEY = 'b4b-scene-discover-expanded';

const DISCOVER_LAST_SEEN_KEY = 'b4b.scene.discover.lastSeenAt';

export function readPersistedExpanded(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writePersistedExpanded(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getDiscoverLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DISCOVER_LAST_SEEN_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function markDiscoverSeen(at = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCOVER_LAST_SEEN_KEY, at);
  } catch {
    /* ignore */
  }
}
