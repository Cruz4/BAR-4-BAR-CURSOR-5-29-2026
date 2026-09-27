/**
 * Discover heat — verified responses mixed into the existing Discover stream.
 * The admin switch decides whether Discover uses this score. Counting is separate.
 */

export const DISCOVER_HEAT_POINTS = {
  love: 5,
  reply: 4,
  reverb: 6,
  view: 1,
} as const;

export type DiscoverHeatKind = keyof typeof DISCOVER_HEAT_POINTS;

/** Posts touched inside this window can re-enter Discover after they leave the newest slice. */
export const DISCOVER_HEAT_WINDOW_DAYS = 14;

/** Extra warm posts merged into the newest Discover slice. */
export const DISCOVER_WARM_LIMIT = 40;

/** Warm posts from one Artist Home, so one wall cannot fill the mix. */
export const DISCOVER_WARM_PER_OWNER = 2;

export type DiscoverHeatAdminConfig = {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export function ageHoursFromIso(iso: string | undefined, now = Date.now()): number {
  const at = Date.parse(iso || '');
  if (!Number.isFinite(at)) return DISCOVER_HEAT_WINDOW_DAYS * 24;
  return Math.max(0, (now - at) / 3_600_000);
}

/** Newer posts still surface before they have any response. */
export function discoverRecencyScore(ageHours: number): number {
  const age = Math.max(0, Number(ageHours) || 0);
  return 8 / (1 + age / 12);
}

/** Heat fades with the age of the post. A late burst can still lift it. */
export function decayedDiscoverHeat(heat: number | undefined, ageHours: number): number {
  const points = Math.max(0, Math.floor(Number(heat) || 0));
  if (!points) return 0;
  const age = Math.max(0, Number(ageHours) || 0);
  return points / (1 + age / 36);
}

/**
 * One score for a Discover card when the heat mix is on.
 * Taste match is the viewer's public tags. Heat is the same number for everyone.
 */
export function discoverMixScore(input: {
  at?: string;
  heat?: number;
  matchScore?: number;
  now?: number;
}): number {
  const age = ageHoursFromIso(input.at, input.now);
  const match = Math.max(0, Number(input.matchScore) || 0);
  return discoverRecencyScore(age) + decayedDiscoverHeat(input.heat, age) + match * 1.5;
}
