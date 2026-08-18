'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LockFeaturePublicStatus } from '@/lib/lock-feature';
import { readFeatureFlagCache, writeFeatureFlagCache } from '@/lib/feature-flag-cache';

const CACHE_KEY = 'b4b.lockFeature';

type State = {
  enabled: boolean;
  loading: boolean;
  source: LockFeaturePublicStatus['source'] | 'unknown';
  refresh: () => void;
};

/**
 * Live LOCK system flag from `/api/lock/status` (Admin Panel toggle).
 * Starts off (and never optimistic-on from NEXT_PUBLIC_LOCK) so Scene doesn't
 * flash Finish this bar when admin has it off.
 */
export function useLockFeature(): State {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<State['source']>('unknown');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const cached = readFeatureFlagCache(CACHE_KEY);
    if (cached != null) {
      setEnabled(cached);
      setLoading(false);
    }

    let cancelled = false;
    void fetch('/api/lock/status', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as LockFeaturePublicStatus;
        if (cancelled) return;
        const next = Boolean(data.enabled);
        setEnabled(next);
        writeFeatureFlagCache(CACHE_KEY, next);
        setSource(data.source || 'unknown');
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = readFeatureFlagCache(CACHE_KEY);
        setEnabled(fallback === true);
        setSource('unknown');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { enabled, loading, source, refresh };
}
