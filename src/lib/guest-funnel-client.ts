'use client';

import { getStoredMarketingRef, normalizeMarketingRef } from '@/lib/marketing-attribution';
import { buildLoginUrl } from '@/lib/login-links';
import { vaultHref } from '@/lib/scene-home';
import {
  GUEST_FUNNEL_EVENTS,
  type GuestFunnelEventName,
  type GuestFunnelMetadata,
} from '@/lib/guest-funnel-events';
import { getOrCreateGuestIdentity, peekGuestIdentity } from '@/lib/guest-identity';

const SESSION_FLAG = 'b4b_guest_try_session';
const ONCE_PREFIX = 'b4b_guest_funnel_once:';
const ASSISTS_USED_KEY = 'b4b_guest_demo_assists_used';
const BARS_WRITTEN_KEY = 'b4b_guest_bars_written';

function resolveRef(explicit?: string | null): string {
  const fromArg = normalizeMarketingRef(explicit ?? null);
  if (fromArg) return fromArg;
  return getStoredMarketingRef() || 'organic';
}

function onceKey(event: GuestFunnelEventName): string {
  return `${ONCE_PREFIX}${event}`;
}

function withGuestIdentity(metadata: GuestFunnelMetadata = {}): GuestFunnelMetadata {
  const { guestId, guestAlias } = getOrCreateGuestIdentity();
  return { ...metadata, guestId, guestAlias };
}

export function markGuestTrySession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_FLAG, '1');
    getOrCreateGuestIdentity();
  } catch {
    /* ignore */
  }
}

export function wasGuestTrySession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

export function setGuestDemoAssistsUsed(used: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ASSISTS_USED_KEY, String(Math.max(0, used)));
  } catch {
    /* ignore */
  }
}

export function setGuestBarsWritten(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BARS_WRITTEN_KEY, String(Math.max(0, count)));
  } catch {
    /* ignore */
  }
}

/** Snapshot engagement + guest identity for signup analytics, then clear session markers. */
export function consumeGuestTrySignupMeta(): {
  fromGuestTry: boolean;
  barsWritten: number | null;
  assistsUsed: number | null;
  guestId: string | null;
  guestAlias: string | null;
} {
  if (typeof window === 'undefined') {
    return {
      fromGuestTry: false,
      barsWritten: null,
      assistsUsed: null,
      guestId: null,
      guestAlias: null,
    };
  }
  try {
    const fromGuestTry = sessionStorage.getItem(SESSION_FLAG) === '1';
    const identity = peekGuestIdentity() || (fromGuestTry ? getOrCreateGuestIdentity() : null);
    const barsRaw = sessionStorage.getItem(BARS_WRITTEN_KEY);
    const assistsRaw = sessionStorage.getItem(ASSISTS_USED_KEY);
    const barsWritten = barsRaw != null ? Number.parseInt(barsRaw, 10) : null;
    const assistsUsed = assistsRaw != null ? Number.parseInt(assistsRaw, 10) : null;
    sessionStorage.removeItem(SESSION_FLAG);
    sessionStorage.removeItem(BARS_WRITTEN_KEY);
    sessionStorage.removeItem(ASSISTS_USED_KEY);
    return {
      fromGuestTry: fromGuestTry || Boolean(identity),
      barsWritten: Number.isFinite(barsWritten) ? barsWritten : null,
      assistsUsed: Number.isFinite(assistsUsed) ? assistsUsed : null,
      guestId: identity?.guestId ?? null,
      guestAlias: identity?.guestAlias ?? null,
    };
  } catch {
    return {
      fromGuestTry: false,
      barsWritten: null,
      assistsUsed: null,
      guestId: null,
      guestAlias: null,
    };
  }
}

export function getGuestSignupHref(options?: {
  marketingRef?: string | null;
  next?: string | null;
}): string {
  return buildLoginUrl({
    mode: 'signup',
    marketingRef: options?.marketingRef ?? getStoredMarketingRef(),
    // Guest demo bars hand off on the Vault surface, so signups land there.
    next: options?.next ?? vaultHref(),
    intent: 'guest_try',
  });
}

export async function trackGuestFunnelEvent(
  event: GuestFunnelEventName,
  metadata: GuestFunnelMetadata = {},
  options?: { oncePerSession?: boolean; ref?: string | null; markTrySession?: boolean }
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (options?.markTrySession !== false) {
    markGuestTrySession();
  }

  if (options?.oncePerSession) {
    try {
      if (sessionStorage.getItem(onceKey(event))) return;
      sessionStorage.setItem(onceKey(event), '1');
    } catch {
      /* ignore */
    }
  }

  try {
    await fetch('/api/analytics/guest-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        ref: resolveRef(options?.ref),
        metadata: withGuestIdentity(metadata),
      }),
    });
  } catch {
    // Non-blocking
  }
}

export function trackGuestTryOpen(ref?: string | null): void {
  void trackGuestFunnelEvent(GUEST_FUNNEL_EVENTS.OPEN, {}, { oncePerSession: true, ref });
}

export function trackGuestWroteBar(barCount: number): void {
  setGuestBarsWritten(barCount);
  void trackGuestFunnelEvent(
    GUEST_FUNNEL_EVENTS.WROTE_BAR,
    { barCount },
    { oncePerSession: true }
  );
}

export function trackGuestSignupCta(source: string): void {
  void trackGuestFunnelEvent(GUEST_FUNNEL_EVENTS.SIGNUP_CTA, { source });
}
