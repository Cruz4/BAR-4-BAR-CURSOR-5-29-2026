/**
 * Collab Sheet feature flag.
 * Live switch: Admin Panel → Config → Collab Sheet (`config/collabSheetFeature`).
 * Emergency hard kill: COLLAB_SHEET_FORCE_OFF=1
 */

export type CollabSheetPublicStatus = {
  enabled: boolean;
  source: 'admin' | 'env' | 'force_off' | 'default_on';
  updatedAt: string | null;
};

export type CollabSheetAdminConfig = CollabSheetPublicStatus & {
  updatedBy: string | null;
  envBootstrap: boolean;
  forceOff: boolean;
};

function parseTruthyEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export function isCollabSheetForceOff(): boolean {
  return parseTruthyEnv(process.env.COLLAB_SHEET_FORCE_OFF);
}

export function isCollabSheetEnvBootstrapOn(): boolean {
  return parseTruthyEnv(process.env.NEXT_PUBLIC_COLLAB_SHEET);
}

/** Sync fallback before `/api/collab-sheet/status` resolves. Default on. */
export function isCollabSheetEnabledSync(): boolean {
  if (isCollabSheetForceOff()) return false;
  if (isCollabSheetEnvBootstrapOn()) return true;
  return true;
}

export const COLLAB_SHEET_PRO_REQUIRED = true;
