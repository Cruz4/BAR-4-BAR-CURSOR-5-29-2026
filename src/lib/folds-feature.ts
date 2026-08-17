/**
 * Folds flag — private lyric-sheet messaging.
 *
 * Live switch: Admin Panel → Config → Folds (Firestore `config/foldsFeature`).
 * Emergency hard kill: FOLDS_FORCE_OFF=1
 * Until an admin saves, the feature stays ON (shipping with the app).
 */

export type FoldsPublicStatus = {
  enabled: boolean;
  source: 'admin' | 'env' | 'force_off' | 'default_on';
  updatedAt: string | null;
};

export type FoldsAdminConfig = FoldsPublicStatus & {
  updatedBy: string | null;
  envBootstrap: boolean;
  forceOff: boolean;
};

function parseTruthyEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export function isFoldsForceOff(): boolean {
  return parseTruthyEnv(process.env.FOLDS_FORCE_OFF);
}

export function isFoldsEnvBootstrapOn(): boolean {
  return parseTruthyEnv(process.env.NEXT_PUBLIC_FOLDS);
}

/** Sync fallback before `/api/folds/status` resolves. Default on. */
export function isFoldsEnabledSync(): boolean {
  if (isFoldsForceOff()) return false;
  if (isFoldsEnvBootstrapOn()) return true;
  return true;
}

export function isFoldsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/folds' || pathname.startsWith('/folds/');
}
