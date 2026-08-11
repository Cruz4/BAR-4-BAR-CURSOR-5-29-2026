export const METRICS_RANGE_KEYS = ['7d', '30d', '3m', '6m', '9m', '1y', 'all'] as const;

export type MetricsRangeKey = (typeof METRICS_RANGE_KEYS)[number];

export type MetricsRangeDef = {
  key: MetricsRangeKey;
  label: string;
  /** Calendar lookback days; null = all time (day 1 → now). */
  days: number | null;
};

export const METRICS_RANGES: MetricsRangeDef[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '3m', label: 'Last 3 months', days: 90 },
  { key: '6m', label: 'Last 6 months', days: 182 },
  { key: '9m', label: 'Last 9 months', days: 274 },
  { key: '1y', label: 'Last 1 year', days: 365 },
  { key: 'all', label: 'All time', days: null },
];

export const DEFAULT_METRICS_RANGE: MetricsRangeKey = 'all';

export function isMetricsRangeKey(value: unknown): value is MetricsRangeKey {
  return typeof value === 'string' && (METRICS_RANGE_KEYS as readonly string[]).includes(value);
}

export function parseMetricsRangeKey(value: string | null | undefined): MetricsRangeKey {
  if (value && isMetricsRangeKey(value)) return value;
  return DEFAULT_METRICS_RANGE;
}

export function getMetricsRangeDef(key: MetricsRangeKey): MetricsRangeDef {
  return METRICS_RANGES.find((r) => r.key === key) || METRICS_RANGES[METRICS_RANGES.length - 1];
}

/** Start of lookback window (local midnight), or null for all-time. */
export function metricsPeriodStart(key: MetricsRangeKey, now = new Date()): Date | null {
  const days = getMetricsRangeDef(key).days;
  if (days == null) return null;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type AdminMetricsPeriod = {
  key: MetricsRangeKey;
  label: string;
  days: number | null;
  startAt: string | null;
  endAt: string;
};

export function buildMetricsPeriod(key: MetricsRangeKey, now = new Date()): AdminMetricsPeriod {
  const def = getMetricsRangeDef(key);
  const start = metricsPeriodStart(key, now);
  return {
    key,
    label: def.label,
    days: def.days,
    startAt: start ? start.toISOString() : null,
    endAt: now.toISOString(),
  };
}
