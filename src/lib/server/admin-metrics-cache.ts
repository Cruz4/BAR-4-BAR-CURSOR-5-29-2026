import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { computeAdminMetrics } from '@/lib/server/admin-metrics';
import type {
  AdminMetricsSnapshot,
  AdminMetricsResponse,
} from '@/lib/admin-metrics-types';
import {
  buildMetricsPeriod,
  DEFAULT_METRICS_RANGE,
  type MetricsRangeKey,
} from '@/lib/admin-metrics-range';

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

export type { AdminMetricsResponse } from '@/lib/admin-metrics-types';

function snapshotDocPath(range: MetricsRangeKey): string {
  return range === 'all' ? 'studioMetrics/snapshot' : `studioMetrics/snapshot_${range}`;
}

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

function normalizeCachedSnapshot(
  raw: AdminMetricsSnapshot & { computedAt?: string },
  range: MetricsRangeKey
): AdminMetricsSnapshot | null {
  if (!raw?.funnel) return null;
  const { computedAt: _computedAt, ...rest } = raw;
  const metrics = rest as AdminMetricsSnapshot;
  if (!metrics.period) {
    metrics.period = buildMetricsPeriod(range);
  }
  return metrics;
}

export async function readCachedAdminMetrics(
  range: MetricsRangeKey = DEFAULT_METRICS_RANGE
): Promise<AdminMetricsResponse | null> {
  if (!hasAdminFirestoreCredentials()) return null;
  try {
    const db = await getDb();
    const snap = await db.doc(snapshotDocPath(range)).get();
    if (!snap.exists) return null;
    const raw = snap.data() as AdminMetricsSnapshot & { computedAt?: string };
    if (!raw?.computedAt) return null;
    const metrics = normalizeCachedSnapshot(raw, range);
    if (!metrics) return null;
    const age = Date.now() - new Date(raw.computedAt).getTime();
    const stale = age > metricsCacheTtlMs();
    return withCacheMeta(metrics, raw.computedAt, true, stale);
  } catch (e) {
    console.warn('[admin-metrics-cache] read failed:', (e as Error).message);
    return null;
  }
}

export async function refreshAdminMetricsCache(
  range: MetricsRangeKey = DEFAULT_METRICS_RANGE
): Promise<AdminMetricsResponse> {
  const metrics = await computeAdminMetrics({ range });
  const computedAt = new Date().toISOString();
  const payload: AdminMetricsSnapshot & { computedAt: string } = {
    ...metrics,
    generatedAt: metrics.generatedAt || computedAt,
    computedAt,
  };

  if (hasAdminFirestoreCredentials()) {
    try {
      const db = await getDb();
      await db.doc(snapshotDocPath(range)).set(payload, { merge: false });
    } catch (e) {
      console.warn('[admin-metrics-cache] write failed:', (e as Error).message);
    }
  }

  return withCacheMeta(metrics, computedAt, false, false);
}

/** Returns cached metrics when fresh; otherwise recomputes and stores. */
export async function getAdminMetricsForDashboard(
  forceRefresh = false,
  range: MetricsRangeKey = DEFAULT_METRICS_RANGE
): Promise<AdminMetricsResponse> {
  if (!forceRefresh) {
    const cached = await readCachedAdminMetrics(range);
    if (cached && !cached.cache.stale) return cached;
    if (cached?.cache.stale) {
      void refreshAdminMetricsCache(range).catch((e) =>
        console.warn('[admin-metrics-cache] background refresh:', (e as Error).message)
      );
      return cached;
    }
  }
  return refreshAdminMetricsCache(range);
}
