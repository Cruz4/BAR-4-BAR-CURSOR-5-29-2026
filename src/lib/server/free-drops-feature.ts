import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  isFreeDropsEnvBootstrapOn,
  isFreeDropsForceOff,
  type FreeDropsAdminConfig,
  type FreeDropsPublicStatus,
} from '@/lib/free-drops-feature';

const DOC_PATH = 'config/freeDrops';
const CACHE_TTL_MS = 4_000;

type FreeDropsDoc = {
  enabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = {
  enabled: boolean;
  source: FreeDropsPublicStatus['source'];
  updatedAt: string | null;
  updatedBy: string | null;
  at: number;
};

let cache: CacheEntry | null = null;

function invalidateCache() {
  cache = null;
}

export async function readFreeDropsDoc(): Promise<FreeDropsDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    return snap.exists ? (snap.data() as FreeDropsDoc) : undefined;
  } catch (error) {
    console.warn('[free-drops] Firestore read failed:', (error as Error).message);
    return undefined;
  }
}

function resolveFromDoc(data: FreeDropsDoc | undefined): Omit<CacheEntry, 'at'> {
  if (isFreeDropsForceOff()) {
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

  if (isFreeDropsEnvBootstrapOn()) {
    return {
      enabled: true,
      source: 'env',
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    enabled: true,
    source: 'default_on',
    updatedAt: null,
    updatedBy: null,
  };
}

async function resolveCached(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache;
  const data = await readFreeDropsDoc();
  const resolved = resolveFromDoc(data);
  cache = { ...resolved, at: now };
  return cache;
}

export async function isFreeDropsEnabled(): Promise<boolean> {
  const resolved = await resolveCached();
  return resolved.enabled;
}

export async function getFreeDropsPublicStatus(): Promise<FreeDropsPublicStatus> {
  const resolved = await resolveCached();
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
  };
}

export async function getFreeDropsAdminConfig(): Promise<FreeDropsAdminConfig> {
  const data = await readFreeDropsDoc();
  const resolved = resolveFromDoc(data);
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    updatedBy: resolved.updatedBy,
    envBootstrap: isFreeDropsEnvBootstrapOn(),
    forceOff: isFreeDropsForceOff(),
  };
}

export async function saveFreeDropsConfig(input: {
  enabled: boolean;
  adminEmail: string;
}): Promise<FreeDropsAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  if (isFreeDropsForceOff()) {
    throw new Error('FREE_DROPS_FORCE_OFF is set — clear that env var to use the admin toggle.');
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

  invalidateCache();
  return getFreeDropsAdminConfig();
}
