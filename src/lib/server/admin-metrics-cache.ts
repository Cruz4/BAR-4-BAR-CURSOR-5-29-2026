import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { computeAdminMetrics } from '@/lib/server/admin-metrics';
import type {
  AdminMetricsSnapshot,
  AdminMetricsResponse,
  AdminMetricsCacheMeta,
} from '@/lib/admin-metrics-types';

const SNAPSHOT_DOC = 'studioMetrics/snapshot';
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

export type { AdminMetricsResponse } from '@/lib/admin-metrics-types';

function metricsCacheTtlMs(): number {
  const hours = Number(process.env.METRICS_CACHE_TTL_HOURS || '6');
  if (!Number.isFinite(hours) || hours < 1) return DEFAULT_TTL_MS;
  return hours * 60 * 60 * 1000;
}

function withCacheMeta(
  metrics: AdminMetricsSnapshot,
  computedAt: string,
  fromCache: boolean,
  stale: boolean
): AdminMetricsResponse {
  const ttl = metricsCacheTtlMs();
  const computed = new Date(computedAt);
  const expiresAt = new Date(computed.getTime() + ttl).toISOString();
  return {
    ...metrics,
    cache: {
      fromCache,
      computedAt,
      expiresAt,
      stale,
    },
  };
}

export async function readCachedAdminMetrics(): Promise<AdminMetricsResponse | null> {
  if (!hasAdminFirestoreCredentials()) return null;
  try {
    const db = await getDb();
    const snap = await db.doc(SNAPSHOT_DOC).get();
    if (!snap.exists) return null;
    const raw = snap.data() as AdminMetricsSnapshot & { computedAt?: string };
    if (!raw?.funnel || !raw.computedAt) return null;
    const { computedAt, ...metrics } = raw;
    const age = Date.now() - new Date(computedAt).getTime();
    const stale = age > metricsCacheTtlMs();
    return withCacheMeta(metrics, computedAt, true, stale);
  } catch (e) {
    console.warn('[admin-metrics-cache] read failed:', (e as Error).message);
    return null;
  }
}

export async function refreshAdminMetricsCache(): Promise<AdminMetricsResponse> {
  const metrics = await computeAdminMetrics();
  const computedAt = new Date().toISOString();
  const payload: AdminMetricsSnapshot & { computedAt: string } = {
    ...metrics,
    generatedAt: metrics.generatedAt || computedAt,
    computedAt,
  };

  if (hasAdminFirestoreCredentials()) {
    try {
      const db = await getDb();
      await db.doc(SNAPSHOT_DOC).set(payload, { merge: false });
    } catch (e) {
      console.warn('[admin-metrics-cache] write failed:', (e as Error).message);
    }
  }

  return withCacheMeta(metrics, computedAt, false, false);
}

/** Returns cached metrics when fresh; otherwise recomputes and stores. */
export async function getAdminMetricsForDashboard(forceRefresh = false): Promise<AdminMetricsResponse> {
  if (!forceRefresh) {
    const cached = await readCachedAdminMetrics();
    if (cached && !cached.cache.stale) return cached;
    if (cached?.cache.stale) {
      void refreshAdminMetricsCache().catch((e) =>
        console.warn('[admin-metrics-cache] background refresh:', (e as Error).message)
      );
      return cached;
    }
  }
  return refreshAdminMetricsCache();
}
