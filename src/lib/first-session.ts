/**
 * First-session onboarding helpers.
 *
 * Brand-new signups skip the 9-step blocking guided tour and instead get
 * three just-in-time coach marks in the editor:
 *   1. after the first line is written  -> point at Generate Next
 *   2. after the first Ink spend        -> explain Ink in one line
 *   3. after the first accepted option  -> explain regeneration / autosave
 *
 * The full guided tour stays available from the Studio Manual and will
 * auto-run on a later session (same 30-minute freshness rule the vault
 * tour already uses).
 */

import type { User } from '@/lib/types';

export const FRESH_SIGNUP_WINDOW_MS = 30 * 60 * 1000;

export const COACH_FIRST_INK_EVENT = 'b4b:coach-first-ink';
export const COACH_FIRST_ACCEPT_EVENT = 'b4b:coach-first-accept';

export type CoachMarkStage = 'generate' | 'ink' | 'accept';

/** Fresh signup still inside their first ~30 minutes, tour not yet completed. */
export function isFirstWriteSession(user: Pick<User, 'createdAt' | 'lyricsTutorialCompletedAt'> | null | undefined): boolean {
  if (!user) return false;
  if (user.lyricsTutorialCompletedAt) return false;
  const ageMs = Date.now() - new Date(user.createdAt).getTime();
  return ageMs >= 0 && ageMs < FRESH_SIGNUP_WINDOW_MS;
}

function coachKey(userId: string, stage: CoachMarkStage): string {
  return `b4b_coach_${stage}_${userId}`;
}

export function hasSeenCoachMark(userId: string, stage: CoachMarkStage): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(coachKey(userId, stage)) === '1';
  } catch {
    return true;
  }
}

export function markCoachMarkSeen(userId: string, stage: CoachMarkStage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(coachKey(userId, stage), '1');
  } catch {
    /* ignore */
  }
}

export function dispatchCoachEvent(eventName: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(eventName));
}
