/**
 * PWA / installed-app icon badge (Badging API + Capacitor native launcher).
 * No-ops when unsupported (many desktop browsers / older iOS).
 */

const BADGE_SW_MESSAGE = 'SET_APP_BADGE';

function isInstalledMobilePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function syncServiceWorkerBadge(count: number) {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const message = { type: BADGE_SW_MESSAGE, count };
    const workers = [
      navigator.serviceWorker.controller,
      registration.active,
      registration.waiting,
      registration.installing,
    ].filter(Boolean);
    for (const worker of workers) {
      worker?.postMessage(message);
    }
  } catch {
    /* SW not ready */
  }
}

export async function syncAppBadge(count: number) {
  if (typeof navigator === 'undefined') return;
  const n = Math.max(0, Math.floor(count));

  // Android/iOS home-screen badges are most reliable from the service worker.
  await syncServiceWorkerBadge(n);

  // Desktop taskbar / dock badges work from the page context.
  if (!isInstalledMobilePwa()) {
    try {
      if (n <= 0 && 'clearAppBadge' in navigator) {
        await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      } else if (n > 0 && 'setAppBadge' in navigator) {
        await (navigator as Navigator & { setAppBadge: (badge?: number) => Promise<void> }).setAppBadge(n);
      }
    } catch {
      /* unsupported / denied */
    }
  }

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
