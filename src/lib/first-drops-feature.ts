/**
 * Bar 4 Bar First Drops flag — buy-once audio on DNA Drops.
 *
 * Live switch: Admin Panel → Config → First Drops (Firestore `config/firstDrops`).
 * Emergency hard kill: FIRST_DROPS_FORCE_OFF=1
 * Until an admin saves, the feature stays ON (it already shipped).
 */

export type FirstDropsPublicStatus = {
  enabled: boolean;
  source: 'admin' | 'env' | 'force_off' | 'default_on';
  updatedAt: string | null;
};

export type FirstDropsAdminConfig = FirstDropsPublicStatus & {
  updatedBy: string | null;
  envBootstrap: boolean;
  forceOff: boolean;
};

function parseTruthyEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export function isFirstDropsForceOff(): boolean {
  return parseTruthyEnv(process.env.FIRST_DROPS_FORCE_OFF);
}

/** Optional local bootstrap. Admin save always wins after the first Deploy. */
export function isFirstDropsEnvBootstrapOn(): boolean {
  return parseTruthyEnv(process.env.NEXT_PUBLIC_FIRST_DROPS);
}

/**
 * Sync fallback before `/api/drops/status` resolves.
 * Default on so the shipped feature does not vanish before the first admin save.
 */
export function isFirstDropsEnabledSync(): boolean {
  if (isFirstDropsForceOff()) return false;
  if (isFirstDropsEnvBootstrapOn()) return true;
  return true;
}
