
export const PRO_CHECKOUT_KEYS = ['PRO_MONTHLY', 'PRO_YEARLY'] as const;
export type ProCheckoutPriceKey = (typeof PRO_CHECKOUT_KEYS)[number];

export type ProCheckoutOptions = {
  /** @deprecated Stripe trial removed — always charges immediately */
  skipTrial?: boolean;
};

export function isProCheckoutPriceKey(key: string | null | undefined): key is ProCheckoutPriceKey {
  return key === 'PRO_MONTHLY' || key === 'PRO_YEARLY';
}

export function buildProCheckoutPath(isYearly: boolean, _options?: ProCheckoutOptions): string {
  const checkout: ProCheckoutPriceKey = isYearly ? 'PRO_YEARLY' : 'PRO_MONTHLY';
  return `/usage?tab=cloud&checkout=${checkout}`;
}

export function getSafeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

export function buildLoginPath(nextPath: string): string {
  return `/login?next=${encodeURIComponent(getSafeNextPath(nextPath))}`;
}

/** Guest First Drop checkout — sign up, then return to the share page to buy. */
export function buildDropBuyLoginPath(shareId: string): string {
  const next = getSafeNextPath(`/share/${shareId}`);
  return `/login?mode=signup&next=${encodeURIComponent(next)}&intent=drop-buy`;
}

function parsePathUrl(path: string): URL | null {
  try {
    return path.startsWith('http') ? new URL(path) : new URL(path, 'http://local');
  } catch {
    return null;
  }
}

export function getCheckoutFromPath(path: string): ProCheckoutPriceKey | null {
  const url = parsePathUrl(path);
  const checkout = url?.searchParams.get('checkout') ?? null;
  return isProCheckoutPriceKey(checkout) ? checkout : null;
}

/** Stripe trial removed — Pro checkout always charges immediately. */
export function getCheckoutTrialFromPath(_path: string): boolean {
  return false;
}

export function getProCheckoutLabel(priceKey: ProCheckoutPriceKey): string {
  return priceKey === 'PRO_YEARLY' ? 'Pro Yearly' : 'Pro Monthly';
}
