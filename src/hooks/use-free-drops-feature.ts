'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FreeDropsPublicStatus } from '@/lib/free-drops-feature';
import { isFreeDropsEnabledSync } from '@/lib/free-drops-feature';

type State = {
  enabled: boolean;
  loading: boolean;
  source: FreeDropsPublicStatus['source'] | 'unknown';
  refresh: () => void;
};

export function useFreeDropsFeature(): State {
  const [enabled, setEnabled] = useState(() => isFreeDropsEnabledSync());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<State['source']>('unknown');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch('/api/drops/status', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as { freeDrops?: FreeDropsPublicStatus };
        if (cancelled) return;
        if (data.freeDrops) {
          setEnabled(Boolean(data.freeDrops.enabled));
          setSource(data.freeDrops.source || 'unknown');
        } else {
          setEnabled(isFreeDropsEnabledSync());
          setSource('unknown');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(isFreeDropsEnabledSync());
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
