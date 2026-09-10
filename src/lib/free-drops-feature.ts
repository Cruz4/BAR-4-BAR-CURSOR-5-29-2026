/**
 * Artist-set free releases — optional while testing.
 *
 * Live switch: Admin Panel → Config → Free Releases (`config/freeDrops`).
 * Emergency hard kill: FREE_DROPS_FORCE_OFF=1
 */

export type FreeDropsPublicStatus = {
  enabled: boolean;
  source: 'admin' | 'env' | 'force_off' | 'default_on';
  updatedAt: string | null;
};

export type FreeDropsAdminConfig = FreeDropsPublicStatus & {
  updatedBy: string | null;
  envBootstrap: boolean;
  forceOff: boolean;
};

function parseTruthyEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export function isFreeDropsForceOff(): boolean {
  return parseTruthyEnv(process.env.FREE_DROPS_FORCE_OFF);
}

export function isFreeDropsEnvBootstrapOn(): boolean {
  return parseTruthyEnv(process.env.NEXT_PUBLIC_FREE_DROPS);
}

/** Sync fallback before `/api/drops/status` resolves. Default on while testing. */
export function isFreeDropsEnabledSync(): boolean {
  if (isFreeDropsForceOff()) return false;
  if (isFreeDropsEnvBootstrapOn()) return true;
  return true;
}
