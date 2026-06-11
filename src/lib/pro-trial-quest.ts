import type { User } from '@/lib/types';
import { isProUser } from '@/lib/subscription';
import { isTrialActive } from '@/lib/trial';

/** Fired client-side when user saves a custom DNA profile during trial. */
export const PRO_TRIAL_WIN_EVENT = 'b4b-pro-trial-win';

/** Opens Generation Workstation directly on DNA & REMIX seed step. */
export const PRO_TRIAL_QUEST_OPEN_GENERATOR = 'remix';

export const PRO_TRIAL_WIN_QUEST = {
  title: 'Pro trial quest',
  task: 'Save your first DNA extraction to the vault',
  hint:
    'Generation Workstation → DNA & REMIX → paste lyrics, a poem, or ideas (or toggle Sync Current Lyrics) → run extraction → on Analysis Step tap Save DNA Profile. DNA Suite in the right panel is also where you can type your own or edit after you load or extract.',
  cta: 'Open DNA & REMIX',
  completeSummary:
    'Your extraction is in the vault. Upgrade before trial ends to keep saving custom profiles.',
} as const;

export function shouldShowProTrialWinQuest(user: Pick<
  User,
  'subscriptionStatus' | 'trialStartedAt' | 'proTrialWinCompletedAt' | 'proTrialWinDismissedAt'
> | null | undefined): boolean {
  if (!user || isProUser(user)) return false;
  if (!isTrialActive()) return false;
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
