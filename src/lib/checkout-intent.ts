import type { StripePriceKey } from '@/lib/stripe-catalog';

export const PRO_CHECKOUT_KEYS = ['PRO_MONTHLY', 'PRO_YEARLY'] as const;
export type ProCheckoutPriceKey = (typeof PRO_CHECKOUT_KEYS)[number];

export function isProCheckoutPriceKey(key: string | null | undefined): key is ProCheckoutPriceKey {
  return key === 'PRO_MONTHLY' || key === 'PRO_YEARLY';
}

export function buildProCheckoutPath(isYearly: boolean): string {
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

function parsePathUrl(path: string): URL | null {
  try {
    return path.startsWith('http') ? new URL(path) : new URL(path, 'http://local');
  } catch {
    return null;
  }
}

export function getCheckoutFromPath(path: string): StripePriceKey | null {
  const url = parsePathUrl(path);
  const checkout = url?.searchParams.get('checkout') ?? null;
  return isProCheckoutPriceKey(checkout) ? checkout : null;
}

export function getProCheckoutLabel(priceKey: ProCheckoutPriceKey): string {
  return priceKey === 'PRO_YEARLY' ? 'Pro Yearly' : 'Pro Monthly';
}
