
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

export type DropBuyIntent = {
  amountCents?: number;
  trackId?: string;
  referralPostId?: string;
};

/** Song-page return URL that safely carries a guest's chosen checkout details. */
export function buildDropBuyReturnPath(
  shareId: string,
  intent: DropBuyIntent = {},
  destination: 'song' | 'share' = 'song'
): string {
  const id = shareId.trim();
  const query = new URLSearchParams({ checkout: 'drop' });
  if (Number.isFinite(intent.amountCents) && (intent.amountCents ?? 0) > 0) {
    query.set('amountCents', String(Math.round(intent.amountCents!)));
  }
  if (intent.trackId?.trim()) query.set('trackId', intent.trackId.trim());
  if (intent.referralPostId?.trim()) query.set('refPost', intent.referralPostId.trim());
  return `/${destination}/${encodeURIComponent(id)}?${query.toString()}`;
}

/** Guest First Drop checkout — sign up, return to the song, then resume checkout. */
export function buildDropBuyLoginPath(
  shareId: string,
  intent: DropBuyIntent = {},
  destination: 'song' | 'share' = 'song'
): string {
  const next = getSafeNextPath(buildDropBuyReturnPath(shareId, intent, destination));
  return `/login?mode=signup&next=${encodeURIComponent(next)}&intent=drop-buy`;
}

function parsePathUrl(path: string): URL | null {
  try {
    return path.startsWith('http') ? new URL(path) : new URL(path, 'http://local');
  } catch {
    return null;
  }
}

export function getDropBuyIntentFromPath(path: string): DropBuyIntent | null {
  const url = parsePathUrl(path);
  if (
    !url ||
    (!url.pathname.startsWith('/song/') && !url.pathname.startsWith('/share/')) ||
    url.searchParams.get('checkout') !== 'drop'
  ) {
    return null;
  }
  const amountRaw = url.searchParams.get('amountCents');
  const amount = amountRaw ? Number(amountRaw) : NaN;
  const trackId = url.searchParams.get('trackId')?.trim();
  const referralPostId = url.searchParams.get('refPost')?.trim();
  return {
    ...(Number.isSafeInteger(amount) && amount > 0 ? { amountCents: amount } : {}),
    ...(trackId ? { trackId } : {}),
    ...(referralPostId ? { referralPostId } : {}),
  };
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
