/** Mobile PWA install prompt — persistence and platform detection. */

export const PWA_INSTALL_DISMISSED_KEY = 'b4b_pwa_install_dismissed';
export const PWA_INSTALL_MARKED_KEY = 'b4b_pwa_install_marked';
export const PWA_INSTALL_SHOW_EVENT = 'b4b-pwa-install-show';

export type MobileInstallPlatform = 'ios' | 'android';

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getMobileInstallPlatform(): MobileInstallPlatform | null {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
}

export function isMobileInstallPlatform(): boolean {
  return getMobileInstallPlatform() !== null;
}

export function markPwaInstalled(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PWA_INSTALL_MARKED_KEY, '1');
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isPwaInstallMarked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PWA_INSTALL_MARKED_KEY) === '1';
  } catch {
    return false;
  }
}

export function isPwaInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPwaInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearPwaInstallDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldAutoShowPwaInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  if (isStandalonePwa()) {
    markPwaInstalled();
    return false;
  }
  if (isPwaInstallMarked()) return false;
  if (isPwaInstallDismissed()) return false;
  return isMobileInstallPlatform();
}

export function requestPwaInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PWA_INSTALL_SHOW_EVENT));
}
