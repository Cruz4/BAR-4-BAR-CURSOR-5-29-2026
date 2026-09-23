'use client';

import { useEffect } from 'react';

export const RELEASE_CATALOG_FROM_QUERY = 'release-catalog';
export const RELEASE_CATALOG_SCROLL_ID = 'release-catalog-scroll';
const STORAGE_KEY = 'b4b:release-catalog-return';
const MAX_AGE_MS = 30 * 60 * 1000;

export type ReleaseCatalogReturnState = {
  scrollTop: number;
  sectionId?: string;
  reopenAfterBack?: boolean;
  /** Set when the user followed a catalog outbound link; cleared after catalog reopens. */
  pendingFromCatalog?: boolean;
  savedAt: number;
};

function readState(): ReleaseCatalogReturnState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ReleaseCatalogReturnState;
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeState(state: ReleaseCatalogReturnState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Call right before leaving the catalog for a release / share / vault screen. */
export function markReleaseCatalogNavigation(sectionId?: string) {
  if (typeof window === 'undefined') return;
  const scrollEl = document.getElementById(RELEASE_CATALOG_SCROLL_ID);
  writeState({
    scrollTop: scrollEl?.scrollTop ?? 0,
    sectionId,
    pendingFromCatalog: true,
    savedAt: Date.now(),
  });
}

export function appendReleaseCatalogFromParam(href: string): string {
  const [beforeHash, hash] = href.split('#');
  const [pathname, query = ''] = beforeHash.split('?');
  const params = new URLSearchParams(query);
  params.set('from', RELEASE_CATALOG_FROM_QUERY);
  const q = params.toString();
  return `${pathname}${q ? `?${q}` : ''}${hash ? `#${hash}` : ''}`;
}

/** Outbound link from Release Catalog — preserves scroll + section for Back. */
export function catalogLinkHref(href: string, sectionId?: string): string {
  markReleaseCatalogNavigation(sectionId);
  return appendReleaseCatalogFromParam(href);
}

export function isReleaseCatalogReferrer(searchParams: URLSearchParams | null | undefined): boolean {
  return searchParams?.get('from') === RELEASE_CATALOG_FROM_QUERY;
}

/** Browser / header Back from a catalog destination — reopens catalog on the prior screen. */
export function navigateBackToReleaseCatalog(router: { back: () => void }): boolean {
  if (typeof window === 'undefined') return false;
  const fromCatalog =
    new URLSearchParams(window.location.search).get('from') === RELEASE_CATALOG_FROM_QUERY;
  const existing = readState();
  if (!fromCatalog && !existing) return false;

  writeState({
    scrollTop: existing?.scrollTop ?? 0,
    sectionId: existing?.sectionId,
    reopenAfterBack: true,
    pendingFromCatalog: true,
    savedAt: Date.now(),
  });
  router.back();
  return true;
}

export function peekReleaseCatalogReopen(): ReleaseCatalogReturnState | null {
  const data = readState();
  if (!data?.reopenAfterBack) return null;
  return data;
}

/** After the catalog dialog opens again — restore scroll + section, clear reopen flag. */
export function consumeReleaseCatalogReopen(): ReleaseCatalogReturnState | null {
  const data = peekReleaseCatalogReopen();
  if (!data) return null;
  writeState({
    scrollTop: data.scrollTop,
    sectionId: data.sectionId,
    pendingFromCatalog: false,
    savedAt: data.savedAt,
  });
  return data;
}

export function applyReleaseCatalogScrollRestore(state: ReleaseCatalogReturnState | null) {
  if (!state) return;
  requestAnimationFrame(() => {
    const scrollEl = document.getElementById(RELEASE_CATALOG_SCROLL_ID);
    if (scrollEl && state.scrollTop > 0) scrollEl.scrollTop = state.scrollTop;
    if (state.sectionId) {
      document.getElementById(state.sectionId)?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  });
}

function isBackForwardNavigation(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === 'back_forward';
}

/** Mount on any page that hosts ReleaseCatalogDialog (Scene, Vault dock, etc.). */
export function useReleaseCatalogReopenListener(onReopen: () => void) {
  useEffect(() => {
    const tryReopen = () => {
      if (peekReleaseCatalogReopen()) {
        onReopen();
        return;
      }
      const data = readState();
      if (data?.pendingFromCatalog && isBackForwardNavigation()) {
        writeState({
          scrollTop: data.scrollTop,
          sectionId: data.sectionId,
          reopenAfterBack: true,
          pendingFromCatalog: true,
          savedAt: Date.now(),
        });
        onReopen();
      }
    };
    tryReopen();
    const onPageShow = () => tryReopen();
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [onReopen]);
}
