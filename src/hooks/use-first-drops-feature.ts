'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FirstDropsPublicStatus } from '@/lib/first-drops-feature';
import { isFirstDropsEnabledSync } from '@/lib/first-drops-feature';

type State = {
  enabled: boolean;
  loading: boolean;
  source: FirstDropsPublicStatus['source'] | 'unknown';
  refresh: () => void;
};

export function useFirstDropsFeature(): State {
  const [enabled, setEnabled] = useState(() => isFirstDropsEnabledSync());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<State['source']>('unknown');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch('/api/drops/status', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as FirstDropsPublicStatus;
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setSource(data.source || 'unknown');
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(isFirstDropsEnabledSync());
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
