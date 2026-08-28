'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  normalizeProductSurfacesConfig,
  PRODUCT_SURFACES_CHANGED_EVENT,
  PRODUCT_SURFACES_DEFAULTS,
  type ProductSurfacesConfig,
  type ProductSurfacesPublicStatus,
} from '@/lib/product-surface-modes';

const CACHE_KEY = 'b4b.productSurfaces';
const REFRESH_INTERVAL_MS = 30_000;

type CacheShape = ProductSurfacesConfig & {
  updatedAt?: string | null;
  source?: ProductSurfacesPublicStatus['source'];
};

function readSurfacesCache(): CacheShape | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    return {
      ...normalizeProductSurfacesConfig(parsed),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      source: parsed.source === 'admin' || parsed.source === 'default' ? parsed.source : 'default',
    };
  } catch {
    return null;
  }
}

function writeSurfacesCache(status: ProductSurfacesPublicStatus) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...normalizeProductSurfacesConfig(status),
        updatedAt: status.updatedAt ?? null,
        source: status.source,
      } satisfies CacheShape)
    );
  } catch {
    /* private mode */
  }
}

function defaultsStatus(): ProductSurfacesPublicStatus {
  return {
    ...PRODUCT_SURFACES_DEFAULTS,
    source: 'default',
    updatedAt: null,
  };
}

/**
 * Live product-surface modes (`/api/product-surfaces`).
 * Falls back to safe legacy/off defaults when the API is missing or fails.
 */
export function useProductSurfaces() {
  const [surfaces, setSurfaces] = useState<ProductSurfacesPublicStatus>(() => {
    const cached = readSurfacesCache();
    return cached
      ? {
          ...normalizeProductSurfacesConfig(cached),
          source: cached.source ?? 'default',
          updatedAt: cached.updatedAt ?? null,
        }
      : defaultsStatus();
  });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: ProductSurfacesPublicStatus) => {
      const normalized: ProductSurfacesPublicStatus = {
        ...normalizeProductSurfacesConfig(next),
        source: next.source === 'admin' ? 'admin' : 'default',
        updatedAt: typeof next.updatedAt === 'string' ? next.updatedAt : null,
      };
      writeSurfacesCache(normalized);
      if (!cancelled) setSurfaces(normalized);
    };

    const load = () => {
      void fetch('/api/product-surfaces', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('product-surfaces failed');
          const data = (await response.json()) as ProductSurfacesPublicStatus;
          apply(data);
        })
        .catch(() => {
          const cached = readSurfacesCache();
          apply(
            cached
              ? {
                  ...normalizeProductSurfacesConfig(cached),
                  source: cached.source ?? 'default',
                  updatedAt: cached.updatedAt ?? null,
                }
              : defaultsStatus()
          );
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
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ProductSurfacesPublicStatus>>).detail;
      if (detail && typeof detail === 'object') {
        setSurfaces((prev) => {
          const next: ProductSurfacesPublicStatus = {
            ...normalizeProductSurfacesConfig({ ...prev, ...detail }),
            source: detail.source === 'admin' || prev.source === 'admin' ? 'admin' : 'default',
            updatedAt:
              typeof detail.updatedAt === 'string'
                ? detail.updatedAt
                : prev.updatedAt ?? null,
          };
          writeSurfacesCache(next);
          return next;
        });
      } else {
        load();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener(PRODUCT_SURFACES_CHANGED_EVENT, onChanged);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(PRODUCT_SURFACES_CHANGED_EVENT, onChanged);
    };
  }, [tick]);

  return {
    ...surfaces,
    loading,
    refresh,
    surfaces,
  };
}
