const WHATS_NEW_VERSION = '0.5.1';
const SESSION_KEY_PREFIX = 'b4b_whats_new_shown:';

function sessionKey(userId: string) {
  return `${SESSION_KEY_PREFIX}${userId}:${WHATS_NEW_VERSION}`;
}

export function hasWhatsNewBeenShownThisLogin(userId: string): boolean {
  try {
    return sessionStorage.getItem(sessionKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markWhatsNewShownThisLogin(userId: string): void {
  try {
    sessionStorage.setItem(sessionKey(userId), '1');
  } catch {
    /* ignore */
  }
}

/** Cleared on logout so What's New can show again on the next login. */
export function clearWhatsNewLoginSession(): void {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(SESSION_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}
