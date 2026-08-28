import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  normalizeProductSurfacesConfig,
  PRODUCT_SURFACES_DEFAULTS,
  type ProductSurfacesAdminConfig,
  type ProductSurfacesConfig,
  type ProductSurfacesPatch,
  type ProductSurfacesPublicStatus,
} from '@/lib/product-surface-modes';

const DOC_PATH = 'config/productSurfaces';
const CACHE_TTL_MS = 4_000;

/**
 * Future allowlist keys for mutation paths that must stay available under
 * read_only / maintenance (e.g. Stripe webhooks, recovery). Empty until wired.
 */
const MUTATION_ALLOWLIST = new Set<string>([
  // 'stripe_webhook',
  // 'payout_recovery',
]);

type ProductSurfacesDoc = Partial<ProductSurfacesConfig> & {
  updatedAt?: string;
  updatedBy?: string | null;
};

type CacheEntry = ProductSurfacesAdminConfig & { at: number };

let cache: CacheEntry | null = null;

export class ProductSurfacesMutationBlockedError extends Error {
  readonly emergency: ProductSurfacesConfig['emergency'];

  constructor(emergency: ProductSurfacesConfig['emergency'], message?: string) {
    super(
      message ||
        (emergency === 'maintenance'
          ? 'Bar 4 Bar is in maintenance mode — writes are paused.'
          : 'Bar 4 Bar is in read-only mode — writes are paused.')
    );
    this.name = 'ProductSurfacesMutationBlockedError';
    this.emergency = emergency;
  }
}

function invalidateCache() {
  cache = null;
}

function resolveFromDoc(data: ProductSurfacesDoc | undefined): ProductSurfacesAdminConfig {
  const modes = normalizeProductSurfacesConfig(data);
  const hasAdminSave = Boolean(data?.updatedAt);

  return {
    ...modes,
    source: hasAdminSave ? 'admin' : 'default',
    updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : null,
    updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : null,
  };
}

async function readProductSurfacesDoc(): Promise<ProductSurfacesDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(DOC_PATH).get();
    return snap.exists ? (snap.data() as ProductSurfacesDoc) : undefined;
  } catch (error) {
    console.warn('[product-surfaces] Firestore read failed:', (error as Error).message);
    return undefined;
  }
}

async function resolveCached(): Promise<ProductSurfacesAdminConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    const { at: _at, ...config } = cache;
    return config;
  }

  const config = resolveFromDoc(await readProductSurfacesDoc());
  cache = { ...config, at: now };
  return config;
}

export async function getProductSurfaces(): Promise<ProductSurfacesAdminConfig> {
  return resolveCached();
}

export async function getProductSurfacesPublicStatus(): Promise<ProductSurfacesPublicStatus> {
  const config = await resolveCached();
  return {
    ceoDashboard: config.ceoDashboard,
    supportCircle: config.supportCircle,
    releaseComposer: config.releaseComposer,
    discoveryRails: config.discoveryRails,
    sharing: config.sharing,
    sceneWeather: config.sceneWeather,
    releaseRoom: config.releaseRoom,
    emergency: config.emergency,
    source: config.source,
    updatedAt: config.updatedAt,
  };
}

export async function setProductSurfaces(
  patch: ProductSurfacesPatch,
  adminUid: string
): Promise<ProductSurfacesAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }

  const current = await getProductSurfaces();
  const next = normalizeProductSurfacesConfig({ ...current, ...patch });
  const now = new Date().toISOString();
  const db = await getDb();

  await db.doc(DOC_PATH).set(
    {
      ...next,
      updatedAt: now,
      updatedBy: adminUid,
    },
    { merge: true }
  );

  invalidateCache();
  return getProductSurfaces();
}

/**
 * Block non-allowlisted mutations when emergency is read_only or maintenance.
 * Pass `allowlistKey` for webhook / recovery paths added later.
 */
export async function assertMutationsAllowed(opts?: {
  allowlistKey?: string;
}): Promise<void> {
  const config = await getProductSurfaces();
  if (config.emergency === 'normal') return;

  const key = opts?.allowlistKey?.trim();
  if (key && MUTATION_ALLOWLIST.has(key)) return;

  throw new ProductSurfacesMutationBlockedError(config.emergency);
}

/** Result-style helper for callers that prefer `{ ok, error }` over try/catch. */
export async function checkMutationsAllowed(opts?: {
  allowlistKey?: string;
}): Promise<{ ok: true } | { ok: false; error: string; emergency: ProductSurfacesConfig['emergency'] }> {
  try {
    await assertMutationsAllowed(opts);
    return { ok: true };
  } catch (error) {
    if (error instanceof ProductSurfacesMutationBlockedError) {
      return { ok: false, error: error.message, emergency: error.emergency };
    }
    throw error;
  }
}

export function getProductSurfacesDefaults(): ProductSurfacesConfig {
  return { ...PRODUCT_SURFACES_DEFAULTS };
}
