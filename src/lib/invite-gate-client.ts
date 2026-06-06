/** Client-side invite unlock persistence (fallback when httpOnly cookie is delayed or blocked). */

const STORAGE_KEY = 'b4b_invite_unlock_v';

export function persistInviteGateUnlock(version: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(version));
  } catch {
    // ignore quota / private mode
  }
}

export function readStoredInviteGateVersion(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const version = Number(raw);
    return Number.isFinite(version) && version > 0 ? version : null;
  } catch {
    return null;
  }
}

export function clearStoredInviteGateUnlock(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isLocallyUnlockedForVersion(gateVersion: number): boolean {
  const stored = readStoredInviteGateVersion();
  return stored !== null && stored === gateVersion;
}
