'use client';

import { useEffect, useRef } from 'react';
import {
  currentFeedScrollRouteKey,
  readFeedScroll,
  scheduleFeedScrollRestore,
} from '@/lib/feed-scroll-restore';

export function useFeedScrollRestore(
  ready: boolean,
  onExtras?: (extras: Record<string, unknown> | undefined) => void
) {
  const restoredRef = useRef(false);
  const onExtrasRef = useRef(onExtras);
  onExtrasRef.current = onExtras;

  useEffect(() => {
    if (!ready || restoredRef.current || typeof window === 'undefined') return;
    const routeKey = currentFeedScrollRouteKey();
    const snap = readFeedScroll(routeKey);
    if (!snap) return;
    onExtrasRef.current?.(snap.extras);
    restoredRef.current = true;
    return scheduleFeedScrollRestore(routeKey);
  }, [ready]);
}
