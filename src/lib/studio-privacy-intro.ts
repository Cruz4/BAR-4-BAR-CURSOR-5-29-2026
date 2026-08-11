import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';

/** Set when the guided tour finishes — show privacy intro on next screen. */
export const PENDING_STUDIO_PRIVACY_INTRO_KEY = 'b4b-pending-studio-privacy-intro';
const SNOOZE_STUDIO_PRIVACY_INTRO_KEY = 'b4b-privacy-intro-snoozed';
const VAULT_TOUR_ACTIVE_KEY = 'b4b-vault-tour-active';
const STUDIO_PRIVACY_INTRO_OPEN_KEY = 'b4b-privacy-intro-open';

/** Fired when vault tour ends and privacy intro may open. */
export const STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT = 'b4b-privacy-intro-eligible';

export function setVaultTourRunning(running: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (running) sessionStorage.setItem(VAULT_TOUR_ACTIVE_KEY, '1');
    else sessionStorage.removeItem(VAULT_TOUR_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function isVaultTourRunning(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(VAULT_TOUR_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setStudioPrivacyIntroOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (open) sessionStorage.setItem(STUDIO_PRIVACY_INTRO_OPEN_KEY, '1');
    else sessionStorage.removeItem(STUDIO_PRIVACY_INTRO_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

export function isStudioPrivacyIntroOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STUDIO_PRIVACY_INTRO_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** True while vault tour or privacy intro is in progress — block other modals. */
export function isStudioOnboardingBusy(): boolean {
  return (
    isVaultTourRunning() ||
    hasPendingStudioPrivacyIntro() ||
    isStudioPrivacyIntroOpen() ||
    (typeof window !== 'undefined' &&
      (() => {
        try {
          return (
            sessionStorage.getItem('b4b-pending-activity-push-intro') === '1' ||
            sessionStorage.getItem('b4b-activity-push-intro-open') === '1'
          );
        } catch {
          return false;
        }
      })())
  );
}

export function hasPendingStudioPrivacyIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(PENDING_STUDIO_PRIVACY_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function dispatchStudioPrivacyIntroEligible() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT));
}

export function snoozeStudioPrivacyIntro() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SNOOZE_STUDIO_PRIVACY_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isStudioPrivacyIntroSnoozed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SNOOZE_STUDIO_PRIVACY_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function queueStudioPrivacyIntro() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_STUDIO_PRIVACY_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumePendingStudioPrivacyIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pending = sessionStorage.getItem(PENDING_STUDIO_PRIVACY_INTRO_KEY) === '1';
    if (pending) sessionStorage.removeItem(PENDING_STUDIO_PRIVACY_INTRO_KEY);
    return pending;
  } catch {
    return false;
  }
}

export async function markStudioPrivacyIntroComplete(userId: string) {
  await setDoc(
    doc(db, 'users', userId),
    { studioPrivacyIntroCompletedAt: new Date().toISOString() },
    { merge: true }
  );
}
