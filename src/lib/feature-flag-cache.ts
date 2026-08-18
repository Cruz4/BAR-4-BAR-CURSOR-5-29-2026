/** Session cache so Scene dock flags don't flash on, then off, after /status loads. */

export function readFeatureFlagCache(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.sessionStorage.getItem(key);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* private mode */
  }
  return null;
}

export function writeFeatureFlagCache(key: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, enabled ? '1' : '0');
  } catch {
    /* private mode */
  }
}
