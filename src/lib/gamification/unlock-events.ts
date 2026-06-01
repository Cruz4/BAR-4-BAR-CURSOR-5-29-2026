import type { GamificationSummary, GamificationUnlock } from '@/lib/gamification/types';

export type AchievementUnlockDetail = {
  unlocks: GamificationUnlock[];
  xpGain?: number;
};

export const ACHIEVEMENT_UNLOCK_EVENT = 'b4b-achievement-unlock';
export const GAMIFICATION_SUMMARY_PATCH_EVENT = 'b4b-gamification-summary-patch';

export function dispatchAchievementUnlocks(
  unlocks: GamificationUnlock[] | undefined,
  xpGain = 0
): void {
  if (typeof window === 'undefined' || !unlocks?.length) return;
  window.dispatchEvent(
    new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, {
      detail: { unlocks, xpGain },
    })
  );
}

export function dispatchGamificationSummaryPatch(summary: GamificationSummary): void {
  if (typeof window === 'undefined' || !summary) return;
  window.dispatchEvent(
    new CustomEvent<GamificationSummary>(GAMIFICATION_SUMMARY_PATCH_EVENT, { detail: summary })
  );
}
