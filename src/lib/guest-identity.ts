/**
 * Anonymous try-sheet visitor identity (browser-local).
 * Links demo-sheet Telegram events to a later signup conversion.
 */

const GUEST_ID_KEY = 'b4b_guest_id';
const GUEST_ALIAS_KEY = 'b4b_guest_alias';

const ALIAS_WORDS = [
  'Silk',
  'Volt',
  'Nova',
  'Drift',
  'Echo',
  'Flux',
  'Glow',
  'Haze',
  'Ion',
  'Jade',
  'Kite',
  'Luna',
  'Mint',
  'Neon',
  'Onyx',
  'Pulse',
  'Quartz',
  'Rift',
  'Spark',
  'Tide',
  'Umber',
  'Vibe',
  'Wave',
  'Zen',
] as const;

function randomHex(bytes = 8): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

/** Stable alias from guest id — same id always maps to the same name. */
export function guestAliasFromId(guestId: string): string {
  const clean = guestId.replace(/[^a-f0-9]/gi, '').toLowerCase() || '0';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  const word = ALIAS_WORDS[hash % ALIAS_WORDS.length];
  const tag = clean.slice(-4).toUpperCase().padStart(4, '0');
  return `Guest-${word}-${tag}`;
}

export function normalizeGuestId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 64);
  return id.length >= 8 ? id : null;
}

export function normalizeGuestAlias(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().slice(0, 40).match(/^Guest-([A-Za-z]{2,12})-([A-Fa-f0-9]{4})$/);
  if (!m) return null;
  const word = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return `Guest-${word}-${m[2].toUpperCase()}`;
}

/** Get or create a durable guest visitor id + display alias (localStorage). */
export function getOrCreateGuestIdentity(): { guestId: string; guestAlias: string } {
  if (typeof window === 'undefined') {
    const guestId = randomHex(8);
    return { guestId, guestAlias: guestAliasFromId(guestId) };
  }
  try {
    let guestId = normalizeGuestId(localStorage.getItem(GUEST_ID_KEY));
    if (!guestId) {
      guestId = randomHex(8);
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    let guestAlias = normalizeGuestAlias(localStorage.getItem(GUEST_ALIAS_KEY));
    if (!guestAlias) {
      guestAlias = guestAliasFromId(guestId);
      localStorage.setItem(GUEST_ALIAS_KEY, guestAlias);
    }
    return { guestId, guestAlias };
  } catch {
    const guestId = randomHex(8);
    return { guestId, guestAlias: guestAliasFromId(guestId) };
  }
}

export function peekGuestIdentity(): { guestId: string; guestAlias: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const guestId = normalizeGuestId(localStorage.getItem(GUEST_ID_KEY));
    if (!guestId) return null;
    const guestAlias =
      normalizeGuestAlias(localStorage.getItem(GUEST_ALIAS_KEY)) || guestAliasFromId(guestId);
    return { guestId, guestAlias };
  } catch {
    return null;
  }
}
