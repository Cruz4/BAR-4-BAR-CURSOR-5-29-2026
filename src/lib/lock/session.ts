/** Client session handoff — name your echo after guest LOCK submit. */

const LOCK_HANDOFF_KEY = 'b4b-lock-handoff';

export type LockHandoff = {
  lockId: string;
  echoId: string;
  text: string;
  lockScore: number;
};

export function persistLockHandoff(handoff: LockHandoff): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LOCK_HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    /* ignore */
  }
}

export function readLockHandoff(): LockHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LOCK_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LockHandoff;
    if (!parsed?.lockId || !parsed?.echoId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLockHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LOCK_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

export function claimLockHandoff(): LockHandoff | null {
  const h = readLockHandoff();
  if (!h) return null;
  clearLockHandoff();
  return h;
}
