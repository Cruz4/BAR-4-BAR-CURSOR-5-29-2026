/**
 * LOCK scaffold — unfinished-bar public dare (kill-flagged).
 *
 * REVERT / DISABLE (no code rollback needed):
 *   Leave NEXT_PUBLIC_LOCK unset, or set NEXT_PUBLIC_LOCK=0 in .env / .env.local and redeploy.
 * Hard rollback: git checkout tag `pre-lock` or branch `checkpoint/pre-lock`.
 */

export const LOCK_HOUSE_ID = 'house';
export const LOCK_HOUSE_PATH = `/lock/${LOCK_HOUSE_ID}`;

/** Path for a public LOCK by id. */
export function lockPath(lockId: string): string {
  const id = (lockId || '').trim() || LOCK_HOUSE_ID;
  return `/lock/${encodeURIComponent(id)}`;
}

/**
 * Default OFF — unset/empty keeps today’s guest-try / landing door.
 * Set NEXT_PUBLIC_LOCK=1 (or true/on) to enable LOCK routes + guest home redirect.
 */
export function isLockEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_LOCK;
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export function isLockPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/lock' || pathname.startsWith('/lock/');
}

export function isLockHousePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === LOCK_HOUSE_PATH || pathname === '/lock/house';
}
