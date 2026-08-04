/**
 * PWA / installed-app icon badge (Badging API).
 * No-ops when unsupported (many desktop browsers / older iOS).
 */

export function syncAppBadge(count: number) {
  if (typeof navigator === 'undefined') return;
  const n = Math.max(0, Math.floor(count));
  try {
    if (n <= 0) {
      if ('clearAppBadge' in navigator) {
        void (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
      return;
    }
    if ('setAppBadge' in navigator) {
      void (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> }).setAppBadge(n);
    }
  } catch {
    /* unsupported / denied */
  }
}
