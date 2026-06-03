import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';

/** Set when the guided tour finishes — show privacy intro on next screen. */
export const PENDING_STUDIO_PRIVACY_INTRO_KEY = 'b4b-pending-studio-privacy-intro';
const SNOOZE_STUDIO_PRIVACY_INTRO_KEY = 'b4b-privacy-intro-snoozed';

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
