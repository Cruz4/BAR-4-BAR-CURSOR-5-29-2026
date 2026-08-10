import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  isLockEnvBootstrapOn,
  isLockForceOff,
  type LockFeatureAdminConfig,
  type LockFeaturePublicStatus,
} from '@/lib/lock-feature';

const DOC_PATH = 'config/lockFeature';
const CACHE_TTL_MS = 4_000;

type LockFeatureDoc = {
  enabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = {
  enabled: boolean;
  source: LockFeaturePublicStatus['source'];
  updatedAt: string | null;
  updatedBy: string | null;
  at: number;
};

let cache: CacheEntry | null = null;

function invalidateLockFeatureCache() {
  cache = null;
}

export async function readLockFeatureDoc(): Promise<LockFeatureDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    return snap.exists ? (snap.data() as LockFeatureDoc) : undefined;
  } catch (error) {
    // Build / local without ADC — fall back to env bootstrap instead of crashing prerender.
    console.warn('[lock-feature] Firestore read failed:', (error as Error).message);
    return undefined;
  }
}

function resolveFromDoc(data: LockFeatureDoc | undefined): Omit<CacheEntry, 'at'> {
  if (isLockForceOff()) {
    return {
      enabled: false,
      source: 'force_off',
      updatedAt: data?.updatedAt ?? null,
      updatedBy: data?.updatedBy ?? null,
    };
  }

  const hasAdminDecision =
    data != null && typeof data.enabled === 'boolean' && Boolean(data.updatedAt);

  if (hasAdminDecision) {
    return {
      enabled: Boolean(data.enabled),
      source: 'admin',
      updatedAt: data.updatedAt ?? null,
      updatedBy: data.updatedBy ?? null,
    };
  }

  if (isLockEnvBootstrapOn()) {
    return {
      enabled: true,
      source: 'env',
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    enabled: false,
    source: 'default_off',
    updatedAt: null,
    updatedBy: null,
  };
}

async function resolveCached(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache;

  const data = await readLockFeatureDoc();
  const resolved = resolveFromDoc(data);
  cache = { ...resolved, at: now };
  return cache;
}

/** Live LOCK system on/off (admin Firestore + env bootstrap + force kill). */
export async function isLockFeatureEnabled(): Promise<boolean> {
  const resolved = await resolveCached();
  return resolved.enabled;
}

export async function getLockFeaturePublicStatus(): Promise<LockFeaturePublicStatus> {
  const resolved = await resolveCached();
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
  };
}

export async function getLockFeatureAdminConfig(): Promise<LockFeatureAdminConfig> {
  const data = await readLockFeatureDoc();
  const resolved = resolveFromDoc(data);
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    updatedBy: resolved.updatedBy,
    envBootstrap: isLockEnvBootstrapOn(),
    forceOff: isLockForceOff(),
  };
}

export async function saveLockFeatureConfig(input: {
  enabled: boolean;
  adminEmail: string;
}): Promise<LockFeatureAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  if (isLockForceOff()) {
    throw new Error('LOCK_FORCE_OFF is set — clear that env var to use the admin toggle.');
  }

  const db = await getDb();
  const now = new Date().toISOString();
  await db.doc(DOC_PATH).set(
    {
      enabled: Boolean(input.enabled),
      updatedAt: now,
      updatedBy: input.adminEmail,
    },
    { merge: true }
  );

  invalidateLockFeatureCache();
  return getLockFeatureAdminConfig();
}
