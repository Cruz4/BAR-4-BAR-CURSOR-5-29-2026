/**
 * LOCK feature flag — unfinished-bar / finish-the-rhyme public door.
 *
 * Live switch: Admin Panel → Config → LOCK System (Firestore `config/lockFeature`).
 * Emergency hard kill (redeploy): LOCK_FORCE_OFF=1
 * Bootstrap before first admin save: NEXT_PUBLIC_LOCK=1 (optional local default)
 *
 * Hard rollback of code: git checkout tag `pre-lock` or branch `checkpoint/pre-lock`.
 */

export const LOCK_HOUSE_ID = 'house';
export const LOCK_HOUSE_PATH = `/lock/${LOCK_HOUSE_ID}`;

export type LockFeaturePublicStatus = {
  enabled: boolean;
  /** How the flag was resolved for this response. */
  source: 'admin' | 'env' | 'force_off' | 'default_off';
  updatedAt: string | null;
};

export type LockFeatureAdminConfig = LockFeaturePublicStatus & {
  updatedBy: string | null;
  envBootstrap: boolean;
  forceOff: boolean;
};

/** Path for a public LOCK by id. */
export function lockPath(lockId: string): string {
  const id = (lockId || '').trim() || LOCK_HOUSE_ID;
  return `/lock/${encodeURIComponent(id)}`;
}

function parseTruthyEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

/** Emergency kill — overrides admin. Server/deploy env only. */
export function isLockForceOff(): boolean {
  return parseTruthyEnv(process.env.LOCK_FORCE_OFF);
}

/**
 * Optional bootstrap when admin has never saved a config doc.
 * Prefer Admin Panel for production; keep NEXT_PUBLIC_LOCK=1 for local dogfood.
 */
export function isLockEnvBootstrapOn(): boolean {
  return parseTruthyEnv(process.env.NEXT_PUBLIC_LOCK);
}

/**
 * Sync best-effort flag for client bundles / SSR without Firestore.
 * Prefer `await isLockFeatureEnabled()` on the server or `useLockFeature()` on the client.
 * Does NOT read the admin Firestore toggle.
 */
export function isLockEnabled(): boolean {
  if (isLockForceOff()) return false;
  return isLockEnvBootstrapOn();
}

export function isLockPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/lock' || pathname.startsWith('/lock/');
}

export function isLockHousePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === LOCK_HOUSE_PATH || pathname === '/lock/house';
}
