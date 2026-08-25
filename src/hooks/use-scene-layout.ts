'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SCENE_LAYOUT_CHANGED_EVENT,
  SCENE_PORTAL_HUB_DEFAULT_ENABLED,
  type SceneLayoutPublicStatus,
} from '@/lib/scene/portal-hub-config';
import { readFeatureFlagCache, writeFeatureFlagCache } from '@/lib/feature-flag-cache';

const CACHE_KEY = 'b4b.scenePortalHub';
const REFRESH_INTERVAL_MS = 30_000;

export function useSceneLayout() {
  const [portalHubEnabled, setPortalHubEnabled] = useState(() => {
    const cached = readFeatureFlagCache(CACHE_KEY);
    return cached ?? SCENE_PORTAL_HUB_DEFAULT_ENABLED;
  });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetch('/api/scene/layout', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('Scene layout request failed');
          const data = (await response.json()) as SceneLayoutPublicStatus;
          if (cancelled) return;
          const enabled = Boolean(data.portalHubEnabled);
          setPortalHubEnabled(enabled);
          writeFeatureFlagCache(CACHE_KEY, enabled);
        })
        .catch(() => {
          if (cancelled) return;
          const cached = readFeatureFlagCache(CACHE_KEY);
          setPortalHubEnabled(cached ?? SCENE_PORTAL_HUB_DEFAULT_ENABLED);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const interval = window.setInterval(load, REFRESH_INTERVAL_MS);
    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onLayoutChanged = (event: Event) => {
      const enabled = (event as CustomEvent<{ portalHubEnabled?: boolean }>).detail
        ?.portalHubEnabled;
      if (typeof enabled === 'boolean') {
        setPortalHubEnabled(enabled);
        writeFeatureFlagCache(CACHE_KEY, enabled);
      } else {
        load();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener(SCENE_LAYOUT_CHANGED_EVENT, onLayoutChanged);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(SCENE_LAYOUT_CHANGED_EVENT, onLayoutChanged);
    };
  }, [tick]);

  return { portalHubEnabled, loading, refresh };
}
