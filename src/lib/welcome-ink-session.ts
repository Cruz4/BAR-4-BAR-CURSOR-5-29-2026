const WELCOME_INK_KEY_PREFIX = 'b4b_welcome_ink_seen:';

export function hasSeenWelcomeInk(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(`${WELCOME_INK_KEY_PREFIX}${userId}`) === '1';
  } catch {
    return true;
  }
}

export function markWelcomeInkSeen(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${WELCOME_INK_KEY_PREFIX}${userId}`, '1');
  } catch {
    /* ignore */
  }
}

export function isRecentStudioAccount(createdAt: string | undefined, maxDays = 14): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() < maxDays * 24 * 60 * 60 * 1000;
}
