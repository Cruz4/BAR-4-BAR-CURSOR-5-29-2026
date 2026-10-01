import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import type { ImprintPressPlusAdminConfig } from '@/lib/imprint-press-plus';

const DOC_PATH = 'config/imprintPressPlus';
const CACHE_TTL_MS = 4_000;

type ImprintPressPlusDoc = {
  enabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = ImprintPressPlusAdminConfig & { at: number };

let cache: CacheEntry | null = null;

function invalidateCache() {
  cache = null;
}

function resolveFromDoc(data: ImprintPressPlusDoc | undefined): ImprintPressPlusAdminConfig {
  const hasAdminDecision =
    data != null && typeof data.enabled === 'boolean' && Boolean(data.updatedAt);
  if (!hasAdminDecision) {
    return { enabled: false, updatedAt: null, updatedBy: null };
  }
  return {
    enabled: Boolean(data.enabled),
    updatedAt: data.updatedAt ?? null,
    updatedBy: data.updatedBy ?? null,
  };
}

async function resolveCached(): Promise<ImprintPressPlusAdminConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return { enabled: cache.enabled, updatedAt: cache.updatedAt, updatedBy: cache.updatedBy };
  }
  if (!hasAdminFirestoreCredentials()) {
    return { enabled: false, updatedAt: null, updatedBy: null };
  }
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    const resolved = resolveFromDoc(snap.exists ? (snap.data() as ImprintPressPlusDoc) : undefined);
    cache = { ...resolved, at: now };
    return resolved;
  } catch (error) {
    console.warn('[imprint-press-plus] Firestore read failed:', (error as Error).message);
    return { enabled: false, updatedAt: null, updatedBy: null };
  }
}

export async function isImprintPressPlusEnabled(): Promise<boolean> {
  const resolved = await resolveCached();
  return resolved.enabled;
}

export async function getImprintPressPlusAdminConfig(): Promise<ImprintPressPlusAdminConfig> {
  return resolveCached();
}

export async function saveImprintPressPlusConfig(input: {
  enabled: boolean;
  adminEmail: string;
}): Promise<ImprintPressPlusAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
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
  return getImprintPressPlusAdminConfig();
}
