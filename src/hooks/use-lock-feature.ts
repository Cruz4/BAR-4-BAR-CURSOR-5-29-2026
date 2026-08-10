'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LockFeaturePublicStatus } from '@/lib/lock-feature';
import { isLockEnabled } from '@/lib/lock-feature';

type State = {
  enabled: boolean;
  loading: boolean;
  source: LockFeaturePublicStatus['source'] | 'unknown';
  refresh: () => void;
};

/**
 * Live LOCK system flag from `/api/lock/status` (Admin Panel toggle).
 * Falls back to sync env bootstrap while loading.
 */
export function useLockFeature(): State {
  const [enabled, setEnabled] = useState(() => isLockEnabled());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<State['source']>('unknown');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch('/api/lock/status', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as LockFeaturePublicStatus;
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setSource(data.source || 'unknown');
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(isLockEnabled());
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
