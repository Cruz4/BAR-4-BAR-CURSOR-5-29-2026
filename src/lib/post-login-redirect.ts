import { getCheckoutFromPath, getSafeNextPath } from '@/lib/checkout-intent';
import { DNA_DROP_UPGRADE_PATH, isDnaDropLoginIntent } from '@/lib/dna-drop-access';

const FRESH_SIGNUP_KEY = 'b4b_fresh_signup';

export function markFreshSignup(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(FRESH_SIGNUP_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumeFreshSignup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const fresh = sessionStorage.getItem(FRESH_SIGNUP_KEY) === '1';
    if (fresh) sessionStorage.removeItem(FRESH_SIGNUP_KEY);
    return fresh;
  } catch {
    return false;
  }
}

function parseNextPath(next: string): { pathname: string; search: string } {
  const [pathname, search = ''] = next.split('?');
  return { pathname, search: search ? `?${search}` : '' };
}

/** Fresh signups start at the signed-in home (Scene) unless they chose Pro checkout or a share import. */
export function resolvePostLoginPath(
  nextParam: string | null | undefined,
  options?: { intent?: string | null; isPro?: boolean }
): string {
  const safeNext = getSafeNextPath(nextParam);

  if (isDnaDropLoginIntent(options?.intent) && options?.isPro === false) {
    return DNA_DROP_UPGRADE_PATH;
  }

  const isFreshSignup = consumeFreshSignup();

  if (!isFreshSignup) return safeNext;

  const { pathname } = parseNextPath(safeNext);

  if (pathname.startsWith('/share/') || pathname.startsWith('/song/')) return safeNext;
  if (getCheckoutFromPath(safeNext)) return safeNext;

  if (pathname === '/usage' || pathname.startsWith('/usage/')) {
    return '/';
  }

  return safeNext;
}
