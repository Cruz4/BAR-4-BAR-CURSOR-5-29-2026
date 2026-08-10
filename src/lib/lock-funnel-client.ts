'use client';

/**
 * Client LOCK funnel tracker — mirrors guest try sheet analytics.
 * High-signal steps also Telegram via /api/analytics/lock-funnel.
 */

import { getStoredMarketingRef, normalizeMarketingRef } from '@/lib/marketing-attribution';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';
import {
  LOCK_FUNNEL_EVENTS,
  type LockFunnelEventName,
  type LockFunnelMetadata,
} from '@/lib/lock-funnel-events';

const SESSION_FLAG = 'b4b_lock_session';
const ONCE_PREFIX = 'b4b_lock_funnel_once:';
const LOCKS_WRITTEN_KEY = 'b4b_lock_echoes_written';

function resolveRef(explicit?: string | null): string {
  const fromArg = normalizeMarketingRef(explicit ?? null);
  if (fromArg) return fromArg;
  return getStoredMarketingRef() || 'organic';
}

function onceKey(event: LockFunnelEventName, scope?: string): string {
  return `${ONCE_PREFIX}${event}${scope ? `:${scope}` : ''}`;
}

function withGuestIdentity(metadata: LockFunnelMetadata = {}): LockFunnelMetadata {
  const { guestId, guestAlias } = getOrCreateGuestIdentity();
  return { ...metadata, guestId, guestAlias };
}

export function markLockSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_FLAG, '1');
    getOrCreateGuestIdentity();
  } catch {
    /* ignore */
  }
}

export function wasLockSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

export function setLockEchoesWritten(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LOCKS_WRITTEN_KEY, String(Math.max(0, count)));
  } catch {
    /* ignore */
  }
}

export async function trackLockFunnelEvent(
  event: LockFunnelEventName,
  metadata: LockFunnelMetadata = {},
  options?: { oncePerSession?: boolean; onceScope?: string; ref?: string | null }
): Promise<void> {
  if (typeof window === 'undefined') return;

  markLockSession();

  if (options?.oncePerSession) {
    try {
      const key = onceKey(event, options.onceScope);
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
  }

  try {
    await fetch('/api/analytics/lock-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        ref: resolveRef(options?.ref),
        metadata: withGuestIdentity(metadata),
      }),
      keepalive: true,
    });
  } catch {
    // Non-blocking
  }
}

export function trackLockOpen(lockId: string, isHouse?: boolean): void {
  void trackLockFunnelEvent(
    LOCK_FUNNEL_EVENTS.OPEN,
    { lockId, isHouse: Boolean(isHouse) },
    { oncePerSession: true, onceScope: lockId }
  );
}

export function trackLockTyped(lockId: string): void {
  void trackLockFunnelEvent(
    LOCK_FUNNEL_EVENTS.TYPED,
    { lockId },
    { oncePerSession: true, onceScope: lockId }
  );
}

export function trackLockSubmit(meta: {
  lockId: string;
  lockScore: number;
  branched: boolean;
  echoCount?: number;
}): void {
  // SUBMIT + BRANCH are recorded server-side on /api/lock/.../echo (avoids double Telegram).
  const nextCount = (meta.echoCount ?? 0) + 1;
  setLockEchoesWritten(nextCount);
}

export function trackLockShareCard(lockId: string, lockScore: number): void {
  void trackLockFunnelEvent(LOCK_FUNNEL_EVENTS.SHARE_CARD, { lockId, lockScore });
}

export function trackLockNameCta(lockId: string, source: string): void {
  void trackLockFunnelEvent(LOCK_FUNNEL_EVENTS.NAME_CTA, { lockId, source });
}

export function trackLockWhereNext(lockId: string, destination: string): void {
  void trackLockFunnelEvent(LOCK_FUNNEL_EVENTS.WHERE_NEXT, { lockId, destination });
}

export function trackLockStudio(lockId: string): void {
  void trackLockFunnelEvent(LOCK_FUNNEL_EVENTS.STUDIO, { lockId });
}

export function trackLockWriteAnother(lockId: string): void {
  void trackLockFunnelEvent(LOCK_FUNNEL_EVENTS.WRITE_ANOTHER, { lockId });
}

export function trackLockBloodline(lockId: string): void {
  void trackLockFunnelEvent(
    LOCK_FUNNEL_EVENTS.BLOODLINE,
    { lockId },
    { oncePerSession: true, onceScope: lockId }
  );
}

export function trackLockSignupCta(lockId: string, source: string): void {
  void trackLockFunnelEvent(LOCK_FUNNEL_EVENTS.SIGNUP_CTA, { lockId, source });
}
