/**
 * PWA / installed-app icon badge (Badging API + Capacitor native launcher).
 * No-ops when unsupported (many desktop browsers / older iOS).
 */

async function syncServiceWorkerBadge(count: number) {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'SET_APP_BADGE', count });
  } catch {
    /* SW not ready */
  }
}

export function syncAppBadge(count: number) {
  if (typeof navigator === 'undefined') return;
  const n = Math.max(0, Math.floor(count));
  try {
    if (n <= 0) {
      if ('clearAppBadge' in navigator) {
        void (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
    } else if ('setAppBadge' in navigator) {
      void (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> }).setAppBadge(n);
    }
  } catch {
    /* unsupported / denied */
  }
  void syncServiceWorkerBadge(n);
  void syncNativeAppBadge(n);
}

async function syncNativeAppBadge(count: number) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Badge } = await import('@capawesome/capacitor-badge');
    const permission = await Badge.checkPermissions();
    if (permission.display !== 'granted') {
      const requested = await Badge.requestPermissions();
      if (requested.display !== 'granted') return;
    }
    if (count <= 0) await Badge.clear();
    else await Badge.set({ count });
  } catch {
    /* plugin missing / WebView only */
  }
}
