import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  isCollabSheetEnvBootstrapOn,
  isCollabSheetForceOff,
  type CollabSheetPublicStatus,
} from '@/lib/collab-sheet-feature';

const DOC_PATH = 'config/collabSheetFeature';
const CACHE_TTL_MS = 4_000;

type CollabSheetFeatureDoc = {
  enabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = {
  enabled: boolean;
  source: CollabSheetPublicStatus['source'];
  updatedAt: string | null;
  at: number;
};

let cache: CacheEntry | null = null;

function invalidateCache() {
  cache = null;
}

function resolveFromDoc(data: CollabSheetFeatureDoc | undefined): Omit<CacheEntry, 'at'> {
  if (data != null && typeof data.enabled === 'boolean' && data.updatedAt) {
    return { enabled: data.enabled, source: 'admin', updatedAt: data.updatedAt };
  }
  if (isCollabSheetEnvBootstrapOn()) {
    return { enabled: true, source: 'env', updatedAt: null };
  }
  return { enabled: true, source: 'default_on', updatedAt: null };
}

async function readCollabSheetFeatureDoc(): Promise<CollabSheetFeatureDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    return snap.exists ? (snap.data() as CollabSheetFeatureDoc) : undefined;
  } catch {
    return undefined;
  }
}

export async function isCollabSheetFeatureEnabled(): Promise<boolean> {
  if (isCollabSheetForceOff()) return false;
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.enabled;

  let enabled = true;
  let source: CollabSheetPublicStatus['source'] = 'default_on';
  let updatedAt: string | null = null;

  if (hasAdminFirestoreCredentials()) {
    try {
      const db = await getDb();
      const snap = await db.doc(DOC_PATH).get();
      const data = snap.exists ? (snap.data() as CollabSheetFeatureDoc) : undefined;
      if (data != null && typeof data.enabled === 'boolean' && data.updatedAt) {
        enabled = data.enabled;
        source = 'admin';
        updatedAt = data.updatedAt;
      } else if (isCollabSheetEnvBootstrapOn()) {
        enabled = true;
        source = 'env';
      }
    } catch (e) {
      console.warn('[collab-sheet-feature] read failed', e);
    }
  } else if (isCollabSheetEnvBootstrapOn()) {
    enabled = true;
    source = 'env';
  }

  cache = { enabled, source, updatedAt, at: now };
  return enabled;
}

export async function getCollabSheetPublicStatus(): Promise<CollabSheetPublicStatus> {
  await isCollabSheetFeatureEnabled();
  return {
    enabled: cache?.enabled ?? !isCollabSheetForceOff(),
    source: cache?.source ?? 'default_on',
    updatedAt: cache?.updatedAt ?? null,
  };
}

export async function getCollabSheetAdminConfig(): Promise<import('@/lib/collab-sheet-feature').CollabSheetAdminConfig> {
  const data = await readCollabSheetFeatureDoc();
  const resolved = resolveFromDoc(data);
  return {
    enabled: resolved.enabled,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    updatedBy: data?.updatedBy ?? null,
    envBootstrap: isCollabSheetEnvBootstrapOn(),
    forceOff: isCollabSheetForceOff(),
  };
}

export async function saveCollabSheetFeatureConfig(input: {
  enabled: boolean;
  adminEmail: string;
}): Promise<import('@/lib/collab-sheet-feature').CollabSheetAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  if (isCollabSheetForceOff()) {
    throw new Error('COLLAB_SHEET_FORCE_OFF is set — clear that env var to use the admin toggle.');
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
  return getCollabSheetAdminConfig();
}
