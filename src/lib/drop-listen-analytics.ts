export const DROP_LISTEN_MILESTONES = [25, 50, 80, 100] as const;

export type DropListenMilestone = (typeof DROP_LISTEN_MILESTONES)[number];

export type DropListenSource =
  | 'artist_home'
  | 'scene'
  | 'discover'
  | 'share'
  | 'library'
  | 'direct';

export function isDropListenMilestone(value: unknown): value is DropListenMilestone {
  return DROP_LISTEN_MILESTONES.includes(Number(value) as DropListenMilestone);
}
export function normalizeDropListenSource(value: unknown): DropListenSource {
  return value === 'artist_home' ||
    value === 'scene' ||
    value === 'discover' ||
    value === 'share' ||
    value === 'library'
    ? value
    : 'direct';
}

export function dropListenMilestoneSeconds(
  milestone: DropListenMilestone,
  eligibleDurationSec: number
): number {
  const duration = Math.max(1, Math.min(60 * 60, Number(eligibleDurationSec) || 30));
  return duration * (milestone / 100);
}

export type OrganicMomentumSignals = {
  qualifiedListeners: number;
  repeatListeners: number;
  follows: number;
  innerCircleJoins: number;
  convertedShares: number;
  purchaseConversions: number;
};

/**
 * Organic momentum is intentionally based on capped relationship conversions.
 * Money spent, subscription tier, Ink, ads, and sponsored/editorial placement
 * are not accepted inputs and therefore cannot change this score.
 */
export function organicMomentumScore(signals: OrganicMomentumSignals): number {
  const whole = (value: number, cap: number) =>
    Math.max(0, Math.min(cap, Math.floor(Number(value) || 0)));

  return (
    whole(signals.qualifiedListeners, 10_000) +
    whole(signals.repeatListeners, 5_000) * 3 +
    whole(signals.follows, 5_000) * 4 +
    whole(signals.innerCircleJoins, 5_000) * 5 +
    whole(signals.convertedShares, 5_000) * 5 +
    whole(signals.purchaseConversions, 5_000) * 8
  );
}
