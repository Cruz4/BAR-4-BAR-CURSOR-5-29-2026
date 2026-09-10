/**
 * Remember window scroll (+ light feed state) when leaving Scene / Discover feeds
 * so phone back returns to the same card, not the top.
 */

const STORAGE_PREFIX = 'aka.feed.scroll:';
const MAX_AGE_MS = 30 * 60 * 1000;

export type FeedScrollSnapshot = {
  savedAt: string;
  scrollY: number;
  extras?: Record<string, unknown>;
};

export function feedScrollRouteKey(pathname: string, search = '', hash = ''): string {
  return `${pathname}${search}${hash}`;
}

export function currentFeedScrollRouteKey(): string {
  if (typeof window === 'undefined') return '/';
  return feedScrollRouteKey(
    window.location.pathname,
    window.location.search,
    window.location.hash
  );
}

export function rememberFeedScroll(routeKey: string, extras?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    const payload: FeedScrollSnapshot = {
      savedAt: new Date().toISOString(),
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
      ...(extras && Object.keys(extras).length ? { extras } : {}),
    };
    sessionStorage.setItem(`${STORAGE_PREFIX}${routeKey}`, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function readFeedScroll(routeKey: string): FeedScrollSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${routeKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedScrollSnapshot;
    if (!parsed?.savedAt || typeof parsed.scrollY !== 'number') return null;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(age) || age > MAX_AGE_MS) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${routeKey}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearFeedScroll(routeKey: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${routeKey}`);
  } catch {
    /* ignore */
  }
}

function applyScrollY(y: number) {
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;
}

export function restoreFeedScroll(routeKey: string, opts?: { clear?: boolean }): boolean {
  const snap = readFeedScroll(routeKey);
  if (!snap) return false;
  applyScrollY(snap.scrollY);
  if (opts?.clear) clearFeedScroll(routeKey);
  return true;
}

export function scheduleFeedScrollRestore(routeKey: string): () => void {
  const snap = readFeedScroll(routeKey);
  if (!snap) return () => undefined;

  const run = (clear = false) => {
    restoreFeedScroll(routeKey, { clear });
  };

  run();
  const frame = window.requestAnimationFrame(() => run());
  const t1 = window.setTimeout(() => run(), 80);
  const t2 = window.setTimeout(() => run(), 280);
  const t3 = window.setTimeout(() => run(true), 520);

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.clearTimeout(t3);
  };
}

/** True when an in-app link leaves the current feed route (profile, post, vault, …). */
export function shouldSaveFeedScrollBeforeNav(
  href: string | null | undefined,
  pathname: string,
  search = ''
): boolean {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (typeof window === 'undefined') return false;

  let targetPath = href;
  let targetSearch = '';
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.origin !== window.location.origin) return false;
      targetPath = url.pathname;
      targetSearch = url.search;
    } catch {
      return false;
    }
  } else {
    const hashIdx = href.indexOf('#');
    const pathAndQuery = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const qIdx = pathAndQuery.indexOf('?');
    targetPath = qIdx >= 0 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
    targetSearch = qIdx >= 0 ? pathAndQuery.slice(qIdx) : '';
  }

  const current = `${pathname}${search}`;
  const target = `${targetPath || '/'}${targetSearch}`;
  if (target === current) return false;

  // Opening the phone portal feed from Scene home is not "leaving" the feed.
  if (pathname === '/' && targetPath === '/' && targetSearch.includes('scene=')) return false;

  return true;
}

/** Reset window scroll when entering a non-feed page (e.g. Activity from a scrolled Scene). */
export function scrollPageToTop() {
  if (typeof window === 'undefined') return;
  const run = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  run();
  window.requestAnimationFrame(run);
}

export function captureFeedScrollOnLinkClick(
  event: { target: EventTarget | null },
  routeKey: string,
  extras?: Record<string, unknown>
) {
  const href = (event.target as HTMLElement | null)?.closest('a[href]')?.getAttribute('href');
  if (!href) return;
  if (typeof window === 'undefined') return;
  if (
    !shouldSaveFeedScrollBeforeNav(
      href,
      window.location.pathname,
      window.location.search
    )
  ) {
    return;
  }
  rememberFeedScroll(routeKey, extras);
}
