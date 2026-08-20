import type { User } from '@/lib/types';
import { isProUser, isProFeaturePreviewActive } from '@/lib/subscription';

/** Fired client-side when user saves a custom DNA profile during Pro preview. */
export const PRO_TRIAL_WIN_EVENT = 'b4b-pro-trial-win';

/** Opens Generation Workstation directly on DNA & REMIX seed step. */
export const PRO_TRIAL_QUEST_OPEN_GENERATOR = 'remix';

export const PRO_TRIAL_WIN_QUEST = {
  title: 'Try this',
  task: 'Save how a song feels — so you can reuse that vibe later',
  hint: 'We’ll open a track and walk you through it.',
  cta: 'Show me',
  completeSummary: 'Nice — that’s saved. Upgrade if you want to keep doing this after the preview.',
} as const;

export function shouldShowProTrialWinQuest(user: Pick<
  User,
  'subscriptionStatus' | 'proFeaturePreviewExpiresAt' | 'proTrialWinCompletedAt' | 'proTrialWinDismissedAt'
> | null | undefined): boolean {
  if (!user || isProUser(user)) return false;
  if (!isProFeaturePreviewActive(user)) return false;
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
