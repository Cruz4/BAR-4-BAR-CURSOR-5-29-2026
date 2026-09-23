/** Bump when Studio Upgrade Notes change — users who dismissed an older version see the dialog again. */
export const WHATS_NEW_VERSION = '0.10.3';

const DISMISS_KEY_PREFIX = 'b4b_whats_new_dismissed:';
const SESSION_KEY_PREFIX = 'b4b_whats_new_shown:';

function dismissKey(userId: string) {
  return `${DISMISS_KEY_PREFIX}${userId}:${WHATS_NEW_VERSION}`;
}

function sessionKey(userId: string) {
  return `${SESSION_KEY_PREFIX}${userId}:${WHATS_NEW_VERSION}`;
}

/** True after the user dismisses What's New for the current version (persists across logins). */
export function hasDismissedWhatsNew(userId: string): boolean {
  try {
    return localStorage.getItem(dismissKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markWhatsNewDismissed(userId: string): void {
  try {
    localStorage.setItem(dismissKey(userId), '1');
    sessionStorage.setItem(sessionKey(userId), '1');
  } catch {
    /* ignore */
  }
}

/** Prevents re-opening in the same browser tab before dismiss. */
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

/** Cleared on logout so What's New can schedule again on the next login (if not permanently dismissed). */
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
