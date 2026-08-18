'use client';

/**
 * Warm the guest try sheet after landing paint — never on the critical path.
 * Track editor is a huge client chunk; importing it at click time is the long pause.
 */

import { GUEST_TRY_PATH, isGuestTrySheetEnabled } from '@/lib/guest-try';

let warmed = false;
let idleTimer = 0;

function warmTrySheetChunks() {
  if (warmed || typeof window === 'undefined') return;
  if (!isGuestTrySheetEnabled()) return;
  warmed = true;
  void import('@/components/track-editor');
}

export function prefetchGuestTrySheetNow(prefetchHref?: (href: string) => void) {
  if (typeof window === 'undefined' || !isGuestTrySheetEnabled()) return;
  warmTrySheetChunks();
  try {
    prefetchHref?.(GUEST_TRY_PATH);
  } catch {
    /* ignore */
  }
}

/** After first paint + a short delay so the sandbox itself stays snappy. */
export function prefetchGuestTrySheetWhenIdle(prefetchHref?: (href: string) => void) {
  if (typeof window === 'undefined' || !isGuestTrySheetEnabled() || warmed) return;
  const run = () => prefetchGuestTrySheetNow(prefetchHref);
  if (idleTimer) window.clearTimeout(idleTimer);
  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 1800 });
    } else {
      idleTimer = window.setTimeout(run, 400);
    }
  };
  idleTimer = window.setTimeout(schedule, 1100);
}
