'use client';

/**
 * Profile-sandbox (/) engagement for Telegram + Growth Metrics.
 * Tracks first interact, claim/try CTAs, and leave with dwell time.
 */

import { trackGuestFunnelEvent } from '@/lib/guest-funnel-client';
import { GUEST_FUNNEL_EVENTS } from '@/lib/guest-funnel-events';
import { getStoredMarketingRef } from '@/lib/marketing-attribution';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';

const START_KEY = 'b4b_pressing_session_start';
const ACTIONS_KEY = 'b4b_pressing_actions';
const LEFT_KEY = 'b4b_pressing_leave_sent';

export type PressingAction =
  | 'tip'
  | 'name'
  | 'pressing'
  | 'tagline'
  | 'mix'
  | 'fader'
  | 'module_size'
  | 'wall'
  | 'bar_of_week'
  | 'claim'
  | 'try_sheet'
  | 'how_it_works'
  | 'signup_link';

function readActions(): PressingAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(ACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is PressingAction => typeof x === 'string').slice(0, 24);
  } catch {
    return [];
  }
}

function writeActions(actions: PressingAction[]) {
  try {
    sessionStorage.setItem(ACTIONS_KEY, JSON.stringify(actions.slice(0, 24)));
  } catch {
    /* ignore */
  }
}

function sessionStartMs(): number {
  try {
    const raw = sessionStorage.getItem(START_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const now = Date.now();
    sessionStorage.setItem(START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function dwellSeconds(): number {
  return Math.max(0, Math.round((Date.now() - sessionStartMs()) / 1000));
}

/** Call once when the sandbox mounts. */
export function startPressingSandboxSession(): void {
  if (typeof window === 'undefined') return;
  sessionStartMs();
  try {
    sessionStorage.removeItem(LEFT_KEY);
  } catch {
    /* ignore */
  }
  void trackGuestFunnelEvent(
    GUEST_FUNNEL_EVENTS.PRESSING_OPEN,
    {},
    { oncePerSession: true, markTrySession: false }
  );
}

/** Record a meaningful action; first one fires PRESSING_INTERACT to Telegram. */
export function trackPressingAction(action: PressingAction): void {
  if (typeof window === 'undefined') return;
  const actions = readActions();
  const isFirst = actions.length === 0;
  if (!actions.includes(action)) {
    actions.push(action);
    writeActions(actions);
  }
  if (isFirst) {
    void trackGuestFunnelEvent(
      GUEST_FUNNEL_EVENTS.PRESSING_INTERACT,
      { action, dwellSeconds: dwellSeconds() },
      { oncePerSession: true, markTrySession: false }
    );
  }
}

export function trackPressingClaimCta(source = 'pressing_landing'): void {
  trackPressingAction('claim');
  void trackGuestFunnelEvent(
    GUEST_FUNNEL_EVENTS.PRESSING_CLAIM_CTA,
    { source, dwellSeconds: dwellSeconds(), actions: readActions().join(',') },
    { markTrySession: false }
  );
}

export function trackPressingTrySheet(source = 'pressing_landing'): void {
  trackPressingAction('try_sheet');
  void trackGuestFunnelEvent(
    GUEST_FUNNEL_EVENTS.PRESSING_TRY_SHEET,
    { source, dwellSeconds: dwellSeconds(), actions: readActions().join(',') },
    { markTrySession: false }
  );
}

/**
 * Fire leave summary (duration + engaged?). Uses keepalive so it still sends on close/navigate.
 * Deduped once per tab session.
 */
export function trackPressingLeave(reason: 'pagehide' | 'hidden' | 'unload' = 'pagehide'): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(LEFT_KEY) === '1') return;
    sessionStorage.setItem(LEFT_KEY, '1');
  } catch {
    /* still try to send */
  }

  const actions = readActions();
  const seconds = dwellSeconds();
  const { guestId, guestAlias } = getOrCreateGuestIdentity();
  const payload = {
    event: GUEST_FUNNEL_EVENTS.PRESSING_LEAVE,
    ref: getStoredMarketingRef() || 'organic',
    metadata: {
      guestId,
      guestAlias,
      dwellSeconds: seconds,
      engaged: actions.length > 0,
      actionCount: actions.length,
      actions: actions.join(',') || null,
      reason,
    },
  };

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/analytics/guest-funnel', blob)) return;
    }
    void fetch('/api/analytics/guest-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Bind leave tracking. pagehide = close/navigate; visibility hidden waits ~2.5s
 * so a quick tab switch that comes back does not count as a bounce.
 */
export function bindPressingLeaveTracking(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const clearHideTimer = () => {
    if (hideTimer != null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const onPageHide = () => {
    clearHideTimer();
    trackPressingLeave('pagehide');
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      clearHideTimer();
      hideTimer = setTimeout(() => trackPressingLeave('hidden'), 2500);
      return;
    }
    clearHideTimer();
  };

  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearHideTimer();
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
