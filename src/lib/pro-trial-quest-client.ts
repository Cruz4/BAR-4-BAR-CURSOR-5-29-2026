'use client';

import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { dispatchProTrialWinComplete } from '@/lib/pro-trial-quest';

export async function markProTrialWinComplete(userId: string): Promise<void> {
  await setDoc(
    doc(db, 'users', userId),
    { proTrialWinCompletedAt: new Date().toISOString() },
    { merge: true }
  );
  void trackStudioEvent(ANALYTICS_EVENTS.TRIAL_QUEST_COMPLETE, { quest: 'pro_trial_dna_vault' });
  dispatchProTrialWinComplete();
}

export async function dismissProTrialWinQuest(userId: string): Promise<void> {
  await setDoc(
    doc(db, 'users', userId),
    { proTrialWinDismissedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** Call after a successful custom DNA vault save during Pro trial. */
export async function recordProTrialVaultSave(userId: string, trialActive: boolean): Promise<void> {
  if (!trialActive) return;
  try {
    await markProTrialWinComplete(userId);
  } catch (e) {
    console.warn('Failed to record Pro trial win', e);
    dispatchProTrialWinComplete();
  }
}
