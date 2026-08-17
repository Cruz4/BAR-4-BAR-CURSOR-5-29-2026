'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FoldsPublicStatus } from '@/lib/folds-feature';
import { isFoldsEnabledSync } from '@/lib/folds-feature';

type State = {
  enabled: boolean;
  loading: boolean;
  source: FoldsPublicStatus['source'] | 'unknown';
  refresh: () => void;
};

export function useFoldsFeature(): State {
  const [enabled, setEnabled] = useState(() => isFoldsEnabledSync());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<State['source']>('unknown');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch('/api/folds/status', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as FoldsPublicStatus;
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setSource(data.source || 'unknown');
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(isFoldsEnabledSync());
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
