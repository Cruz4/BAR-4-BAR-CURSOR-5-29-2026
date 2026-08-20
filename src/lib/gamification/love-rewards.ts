/** One permanent-Ink reward for each complete block of verified Loves received. */
export const LOVE_INK_REWARD_INTERVAL = 20;
export const LOVE_INK_REWARD_AMOUNT = 2;

export function isLoveInkRewardMilestone(lifetimeLovesReceived: number): boolean {
  return (
    Number.isInteger(lifetimeLovesReceived) &&
    lifetimeLovesReceived > 0 &&
    lifetimeLovesReceived % LOVE_INK_REWARD_INTERVAL === 0
  );
}

export function loveInkRewardUnlockId(lifetimeLovesReceived: number): string {
  return `love_milestone_${lifetimeLovesReceived}`;
}

export function loveInkRewardDescription(lifetimeLovesReceived: number): string {
  return `${lifetimeLovesReceived} verified Loves on your work — ${LOVE_INK_REWARD_AMOUNT} permanent Ink earned.`;
}
