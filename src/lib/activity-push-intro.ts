/** Post–Scene-tour prompt to enable Activity web push (browser permission + FCM token). */

export const PENDING_ACTIVITY_PUSH_INTRO_KEY = 'b4b-pending-activity-push-intro';
const DISMISSED_ACTIVITY_PUSH_INTRO_KEY = 'b4b-activity-push-intro-dismissed';
const ACTIVITY_PUSH_INTRO_OPEN_KEY = 'b4b-activity-push-intro-open';

/** Fired when push intro may safely open (tour/privacy cleared). */
export const ACTIVITY_PUSH_INTRO_ELIGIBLE_EVENT = 'b4b-activity-push-intro-eligible';

export function setActivityPushIntroOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (open) sessionStorage.setItem(ACTIVITY_PUSH_INTRO_OPEN_KEY, '1');
    else sessionStorage.removeItem(ACTIVITY_PUSH_INTRO_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

export function isActivityPushIntroOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ACTIVITY_PUSH_INTRO_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function queueActivityPushIntro() {
  if (typeof window === 'undefined') return;
  try {
    if (isActivityPushIntroDismissed()) return;
    sessionStorage.setItem(PENDING_ACTIVITY_PUSH_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasPendingActivityPushIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(PENDING_ACTIVITY_PUSH_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function consumePendingActivityPushIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pending = sessionStorage.getItem(PENDING_ACTIVITY_PUSH_INTRO_KEY) === '1';
    if (pending) sessionStorage.removeItem(PENDING_ACTIVITY_PUSH_INTRO_KEY);
    return pending;
  } catch {
    return false;
  }
}

export function dismissActivityPushIntro() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_ACTIVITY_PUSH_INTRO_KEY);
    localStorage.setItem(DISMISSED_ACTIVITY_PUSH_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isActivityPushIntroDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISMISSED_ACTIVITY_PUSH_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function dispatchActivityPushIntroEligible() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTIVITY_PUSH_INTRO_ELIGIBLE_EVENT));
}
