'use client';

import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';

/** Why the user saw an upgrade CTA — used on `upgrade_click` and admin funnel breakdowns. */
export type UpgradeTrigger =
  | 'slot_limit'
  | 'low_ink'
  | 'trial_quest'
  | 'pricing'
  | 'ink_depletion'
  | 'other';

export function trackUpgradeClick(
  trigger: UpgradeTrigger,
  metadata: Record<string, string | number | boolean | null> = {}
): void {
  void trackStudioEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, { trigger, ...metadata });
}

export function trackLowInkHit(
  actionName: string,
  inkNeeded: number,
  inkBalance: number
): void {
  void trackStudioEvent(ANALYTICS_EVENTS.LOW_INK_HIT, {
    actionName,
    inkNeeded,
    inkBalance,
  });
}
