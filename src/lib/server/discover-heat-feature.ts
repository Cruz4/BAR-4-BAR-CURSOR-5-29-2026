import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import type { DiscoverHeatAdminConfig } from '@/lib/discover-heat';

const DOC_PATH = 'config/discoverHeat';
const CACHE_TTL_MS = 4_000;

type DiscoverHeatDoc = {
  enabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = DiscoverHeatAdminConfig & { at: number };

let cache: CacheEntry | null = null;

function invalidateDiscoverHeatCache() {
  cache = null;
}

function resolveFromDoc(data: DiscoverHeatDoc | undefined): DiscoverHeatAdminConfig {
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

async function resolveCached(): Promise<DiscoverHeatAdminConfig> {
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
    const resolved = resolveFromDoc(snap.exists ? (snap.data() as DiscoverHeatDoc) : undefined);
    cache = { ...resolved, at: now };
    return resolved;
  } catch (error) {
    console.warn('[discover-heat] Firestore read failed:', (error as Error).message);
    return { enabled: false, updatedAt: null, updatedBy: null };
  }
}

/** Admin Panel → Config → Discover heat. Off until an admin saves the switch on. */
export async function isDiscoverHeatEnabled(): Promise<boolean> {
  const resolved = await resolveCached();
  return resolved.enabled;
}

export async function getDiscoverHeatAdminConfig(): Promise<DiscoverHeatAdminConfig> {
  return resolveCached();
}

export async function saveDiscoverHeatConfig(input: {
  enabled: boolean;
  adminEmail: string;
}): Promise<DiscoverHeatAdminConfig> {
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
  invalidateDiscoverHeatCache();
  return getDiscoverHeatAdminConfig();
}
