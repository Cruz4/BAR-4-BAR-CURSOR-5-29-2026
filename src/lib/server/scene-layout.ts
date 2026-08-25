import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  SCENE_PORTAL_HUB_DEFAULT_ENABLED,
  type SceneLayoutAdminConfig,
  type SceneLayoutPublicStatus,
} from '@/lib/scene/portal-hub-config';

const DOC_PATH = 'config/sceneLayout';
const CACHE_TTL_MS = 4_000;

type SceneLayoutDoc = {
  portalHubEnabled?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = SceneLayoutAdminConfig & { at: number };

let cache: CacheEntry | null = null;

function resolveSceneLayout(data: SceneLayoutDoc | undefined): SceneLayoutAdminConfig {
  if (data && typeof data.portalHubEnabled === 'boolean' && data.updatedAt) {
    return {
      portalHubEnabled: data.portalHubEnabled,
      source: 'admin',
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy ?? null,
    };
  }

  return {
    portalHubEnabled: SCENE_PORTAL_HUB_DEFAULT_ENABLED,
    source: 'default_portal',
    updatedAt: null,
    updatedBy: null,
  };
}

async function readSceneLayoutDoc(): Promise<SceneLayoutDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    return snap.exists ? (snap.data() as SceneLayoutDoc) : undefined;
  } catch (error) {
    console.warn('[scene-layout] Firestore read failed:', (error as Error).message);
    return undefined;
  }
}

async function resolveCached(): Promise<SceneLayoutAdminConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return {
      portalHubEnabled: cache.portalHubEnabled,
      source: cache.source,
      updatedAt: cache.updatedAt,
      updatedBy: cache.updatedBy,
    };
  }

  const config = resolveSceneLayout(await readSceneLayoutDoc());
  cache = { ...config, at: now };
  return config;
}

export async function getSceneLayoutPublicStatus(): Promise<SceneLayoutPublicStatus> {
  const config = await resolveCached();
  return {
    portalHubEnabled: config.portalHubEnabled,
    source: config.source,
    updatedAt: config.updatedAt,
  };
}

export async function getSceneLayoutAdminConfig(): Promise<SceneLayoutAdminConfig> {
  return resolveCached();
}

export async function saveSceneLayoutConfig(input: {
  portalHubEnabled: boolean;
  adminEmail: string;
}): Promise<SceneLayoutAdminConfig> {
  if (!hasAdminFirestoreCredentials()) throw new Error('Firebase Admin required');

  const now = new Date().toISOString();
  const db = await getDb();
  await db.doc(DOC_PATH).set(
    {
      portalHubEnabled: Boolean(input.portalHubEnabled),
      updatedAt: now,
      updatedBy: input.adminEmail,
    },
    { merge: true }
  );

  cache = null;
  return getSceneLayoutAdminConfig();
}
