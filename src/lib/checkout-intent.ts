import type { StripePriceKey } from '@/lib/stripe-catalog';

export const PRO_CHECKOUT_KEYS = ['PRO_MONTHLY', 'PRO_YEARLY'] as const;
export type ProCheckoutPriceKey = (typeof PRO_CHECKOUT_KEYS)[number];

export type ProCheckoutOptions = {
  /** Skip Stripe trial — charge immediately */
  skipTrial?: boolean;
};

export function isProCheckoutPriceKey(key: string | null | undefined): key is ProCheckoutPriceKey {
  return key === 'PRO_MONTHLY' || key === 'PRO_YEARLY';
}

export function buildProCheckoutPath(isYearly: boolean, options?: ProCheckoutOptions): string {
  const checkout: ProCheckoutPriceKey = isYearly ? 'PRO_YEARLY' : 'PRO_MONTHLY';
  const trialParam = options?.skipTrial ? '0' : '1';
  return `/usage?tab=cloud&checkout=${checkout}&trial=${trialParam}`;
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

/** Whether Pro checkout should include Stripe trial_period_days (default true). */
export function getCheckoutTrialFromPath(path: string): boolean {
  const url = parsePathUrl(path);
  return url?.searchParams.get('trial') !== '0';
}

export function getProCheckoutLabel(priceKey: ProCheckoutPriceKey): string {
  return priceKey === 'PRO_YEARLY' ? 'Pro Yearly' : 'Pro Monthly';
}
