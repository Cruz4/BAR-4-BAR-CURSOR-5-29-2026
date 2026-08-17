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

const STATUS_CACHE_KEY = 'b4b_invite_gate_status';

export type CachedInviteGateStatus = {
  enabled: boolean;
  version: number;
};

export function persistInviteGateStatus(enabled: boolean, version: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ enabled, version }));
  } catch {
    /* ignore */
  }
}

export function readCachedInviteGateStatus(): CachedInviteGateStatus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STATUS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedInviteGateStatus;
    if (typeof parsed?.enabled !== 'boolean') return null;
    const version = Number(parsed.version);
    return {
      enabled: parsed.enabled,
      version: Number.isFinite(version) && version > 0 ? version : 1,
    };
  } catch {
    return null;
  }
}
