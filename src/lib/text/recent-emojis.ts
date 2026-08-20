const RECENT_EMOJIS_KEY = 'b4b-recent-emojis';
const MAX_RECENT_EMOJIS = 16;

export function readRecentEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJIS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, MAX_RECENT_EMOJIS);
  } catch {
    return [];
  }
}

/** Move emoji to front of recent list; returns updated list. */
export function rememberRecentEmoji(emoji: string): string[] {
  const clean = emoji.trim();
  if (!clean) return readRecentEmojis();
  const next = [clean, ...readRecentEmojis().filter((e) => e !== clean)].slice(0, MAX_RECENT_EMOJIS);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / privacy mode */
    }
  }
  return next;
}
