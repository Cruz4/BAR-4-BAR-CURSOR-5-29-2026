import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  isFirstDropsEnvBootstrapOn,
  isFirstDropsForceOff,
  type FirstDropsAdminConfig,
  type FirstDropsPublicStatus,
} from '@/lib/first-drops-feature';

const DOC_PATH = 'config/firstDrops';
const CACHE_TTL_MS = 4_000;

type FirstDropsDoc = {
  enabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = {
  enabled: boolean;
  source: FirstDropsPublicStatus['source'];
  updatedAt: string | null;
  updatedBy: string | null;
  at: number;
};

let cache: CacheEntry | null = null;

function invalidateCache() {
  cache = null;
}

export async function readFirstDropsDoc(): Promise<FirstDropsDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    return snap.exists ? (snap.data() as FirstDropsDoc) : undefined;
  } catch (error) {
    console.warn('[first-drops] Firestore read failed:', (error as Error).message);
    return undefined;
  }
}

function resolveFromDoc(data: FirstDropsDoc | undefined): Omit<CacheEntry, 'at'> {
  if (isFirstDropsForceOff()) {
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

  if (isFirstDropsEnvBootstrapOn()) {
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
  const data = await readFirstDropsDoc();
  const resolved = resolveFromDoc(data);
  cache = { ...resolved, at: now };
  return cache;
}

export async function isFirstDropsEnabled(): Promise<boolean> {
  const resolved = await resolveCached();
  return resolved.enabled;
}

export async function getFirstDropsPublicStatus(): Promise<FirstDropsPublicStatus> {
  const resolved = await resolveCached();
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
  };
}

export async function getFirstDropsAdminConfig(): Promise<FirstDropsAdminConfig> {
  const data = await readFirstDropsDoc();
  const resolved = resolveFromDoc(data);
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    updatedBy: resolved.updatedBy,
    envBootstrap: isFirstDropsEnvBootstrapOn(),
    forceOff: isFirstDropsForceOff(),
  };
}

export async function saveFirstDropsConfig(input: {
  enabled: boolean;
  adminEmail: string;
}): Promise<FirstDropsAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  if (isFirstDropsForceOff()) {
    throw new Error('FIRST_DROPS_FORCE_OFF is set — clear that env var to use the admin toggle.');
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
  return getFirstDropsAdminConfig();
}
