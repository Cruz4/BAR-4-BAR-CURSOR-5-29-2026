import type { User } from '@/lib/types';
import { isProUser } from '@/lib/subscription';
import { isTrialActive } from '@/lib/trial';

/** Fired client-side when user saves a custom DNA profile during trial. */
export const PRO_TRIAL_WIN_EVENT = 'b4b-pro-trial-win';

export const PRO_TRIAL_WIN_QUEST = {
  title: 'Pro trial quest',
  task: 'Save your first DNA strain to the vault',
  hint: 'Open a track → Creative DNA (right panel) → folder icon → Save profile. Or save from DNA & REMIX Calibration Hub.',
  cta: 'Open track & DNA',
} as const;

export function shouldShowProTrialWinQuest(user: Pick<
  User,
  'subscriptionStatus' | 'trialStartedAt' | 'proTrialWinCompletedAt' | 'proTrialWinDismissedAt'
> | null | undefined): boolean {
  if (!user || isProUser(user)) return false;
  if (!isTrialActive(user)) return false;
  if (user.proTrialWinCompletedAt || user.proTrialWinDismissedAt) return false;
  return true;
}

export function isProTrialWinComplete(user: Pick<User, 'proTrialWinCompletedAt'> | null | undefined): boolean {
  return Boolean(user?.proTrialWinCompletedAt);
}

export function dispatchProTrialWinComplete() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PRO_TRIAL_WIN_EVENT));
}
