import type { User } from '@/lib/types';

/** Pro trial length — full workflow for new signups (no bonus trial Ink). */
export const TRIAL_DURATION_DAYS = 2;

export function getTrialDurationLabel(): string {
  return `${TRIAL_DURATION_DAYS}-day`;
}

export function getTrialDurationTitle(): string {
  return `${TRIAL_DURATION_DAYS}-Day Pro Trial`;
}

export { TRIAL_INK_GRANT } from '@/lib/trial-ink-ab';
export { getTrialInkGrantForVariant } from '@/lib/trial-ink-ab';

export function isTrialActive(
  user: Pick<User, 'trialStartedAt'> | null | undefined
): boolean {
  if (!user?.trialStartedAt) return false;
  const start = new Date(user.trialStartedAt);
  if (Number.isNaN(start.getTime())) return false;
  const elapsedMs = Date.now() - start.getTime();
  return elapsedMs < TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
}

export function getTrialDaysRemaining(
  user: Pick<User, 'trialStartedAt'> | null | undefined
): number | null {
  if (!isTrialActive(user) || !user?.trialStartedAt) return null;
  const start = new Date(user.trialStartedAt);
  const endMs = start.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, endMs - Date.now());
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}
