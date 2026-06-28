'use client';

import {
  COOKIE_CONSENT_STORAGE_KEY,
  getTikTokPixelId,
  isTikTokPixelEnabledForBuild,
} from '@/lib/tiktok-pixel-config';

type TikTokQueue = {
  (...args: unknown[]): void;
  page?: () => void;
  track?: (event: string, props?: Record<string, unknown>) => void;
  identify?: (props: Record<string, unknown>) => void;
  grantConsent?: () => void;
};

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

export { COOKIE_CONSENT_STORAGE_KEY };

/** TikTok only accepts these content_type values on commerce events. */
export const TIKTOK_CONTENT_TYPE = 'product' as const;

export function getTikTokPixelIdClient(): string | null {
  const id = getTikTokPixelId();
  return id || null;
}

export function isTikTokPixelEnabled(): boolean {
  return isTikTokPixelEnabledForBuild();
}

export function hasMarketingCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

/** No-op — base code loads from layout head; kept for cookie banner hook. */
export function grantTikTokPixelConsent(): void {
  if (!isTikTokPixelEnabled() || typeof window === 'undefined' || !window.ttq) return;
  window.ttq.grantConsent?.();
}

function canSendTikTokEvents(): boolean {
  return isTikTokPixelEnabled() && typeof window !== 'undefined' && !!window.ttq;
}

export function trackTikTokPageView(): void {
  if (!canSendTikTokEvents()) return;
  window.ttq?.page?.();
}

export function trackTikTokEvent(
  event: string,
  properties?: Record<string, string | number | boolean | undefined>
): void {
  if (!canSendTikTokEvents()) return;
  const payload = properties
    ? Object.fromEntries(
        Object.entries(properties).filter(([, v]) => v !== undefined && v !== null)
      )
    : undefined;
  window.ttq?.track?.(event, payload);
}

async function sha256Hex(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Advanced matching — values are hashed before send (TikTok requirement). */
export async function identifyTikTokUser(params: {
  email?: string | null;
  externalId?: string | null;
}): Promise<void> {
  if (!canSendTikTokEvents()) return;
  const payload: Record<string, string> = {};
  if (params.email) payload.email = await sha256Hex(params.email);
  if (params.externalId) payload.external_id = await sha256Hex(params.externalId);
  if (Object.keys(payload).length === 0) return;
  window.ttq?.identify?.(payload);
}
