import type { User } from '@/lib/types';

/** Pro trial length — full workflow + trial Ink for new signups. */
export const TRIAL_DURATION_DAYS = 2;

export function getTrialDurationLabel(): string {
  return `${TRIAL_DURATION_DAYS}-day`;
}

export function getTrialDurationTitle(): string {
  return `${TRIAL_DURATION_DAYS}-Day Pro Trial`;
}

/** Control arm: one-time Ink during Pro trial (`trialInkBalance`; expires when trial ends). */
export { TRIAL_INK_GRANT_CONTROL as TRIAL_INK_GRANT } from '@/lib/trial-ink-ab';
export {
  assignTrialInkAbVariant,
  getTrialInkAbMode,
  getTrialInkGrantForVariant,
  TRIAL_INK_GRANT_H1_ZERO,
} from '@/lib/trial-ink-ab';

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
