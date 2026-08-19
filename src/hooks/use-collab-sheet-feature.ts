'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CollabSheetPublicStatus } from '@/lib/collab-sheet-feature';
import { isCollabSheetEnabledSync } from '@/lib/collab-sheet-feature';

type State = {
  enabled: boolean;
  loading: boolean;
  source: CollabSheetPublicStatus['source'] | 'unknown';
  refresh: () => void;
};

export function useCollabSheetFeature(): State {
  const [enabled, setEnabled] = useState(() => isCollabSheetEnabledSync());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<State['source']>('unknown');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch('/api/collab-sheet/status', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as CollabSheetPublicStatus;
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setSource(data.source || 'unknown');
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(isCollabSheetEnabledSync());
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
