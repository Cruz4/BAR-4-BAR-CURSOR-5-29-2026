'use client';

import {
  buildTikTokPixelBootstrap,
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

/** Fired after the cookie banner is accepted so deferred tours can start. */
export const COOKIE_CONSENT_CHANGED_EVENT = 'b4b-cookie-consent-changed';

export function hasMarketingCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function dispatchCookieConsentChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT));
}

/** No-op — base code loads from layout head; kept for cookie banner hook. */
const TIKTOK_BOOTSTRAP_SCRIPT_ID = 'tiktok-pixel-bootstrap';

/** Injects TikTok only after marketing cookie consent (no layout `<head>` load). */
export function ensureTikTokPixelLoaded(): boolean {
  if (!isTikTokPixelEnabled() || typeof window === 'undefined' || !hasMarketingCookieConsent()) {
    return false;
  }
  if (!document.getElementById(TIKTOK_BOOTSTRAP_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = TIKTOK_BOOTSTRAP_SCRIPT_ID;
    script.text = buildTikTokPixelBootstrap(getTikTokPixelId());
    document.head.appendChild(script);
  }
  window.ttq?.grantConsent?.();
  return Boolean(window.ttq);
}

export function grantTikTokPixelConsent(): void {
  if (!ensureTikTokPixelLoaded()) return;
  trackTikTokPageView();
}

function canSendTikTokEvents(): boolean {
  return (
    isTikTokPixelEnabled() &&
    hasMarketingCookieConsent() &&
    typeof window !== 'undefined' &&
    !!window.ttq
  );
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
