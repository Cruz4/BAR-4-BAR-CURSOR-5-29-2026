import type { GamificationSummary } from '@/lib/gamification/types';
import {
  isChallengeComplete,
  LIFETIME_MILESTONES,
} from '@/lib/gamification/challenges';
import { rankFromXp } from '@/lib/gamification/ranks';

/** Max prestige cycles an artist can run. */
export const MAX_PRESTIGE = 5;

/** Permanent badges minted on each prestige (never cleared on reset). */
export function prestigeBadgeId(level: number): string {
  return `prestige_${Math.max(1, Math.min(MAX_PRESTIGE, level))}`;
}

/**
 * Scale personal ceilings by prestige so P4 still unlocks by writing —
 * never gated on "be prestige N".
 * P0 = 1×, P1 ≈ 1.4×, P2 ≈ 1.8× … P5 ≈ 3×
 */
export function prestigeThresholdMultiplier(prestigeLevel = 0): number {
  const p = Math.max(0, Math.min(MAX_PRESTIGE, Math.floor(prestigeLevel || 0)));
  return 1 + p * 0.4;
}

export function scaleByPrestige(base: number, prestigeLevel = 0): number {
  if (!Number.isFinite(base) || base <= 0) return base;
  return Math.max(1, Math.ceil(base * prestigeThresholdMultiplier(prestigeLevel)));
}

export function getPrestigeLevel(summary: Pick<GamificationSummary, 'prestigeLevel'>): number {
  const n = Number(summary.prestigeLevel || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_PRESTIGE, Math.floor(n));
}

/** Ready when at top plate + every lifetime personal milestone is done. */
export function canPrestigeReset(summary: GamificationSummary, isPro: boolean): boolean {
  if (getPrestigeLevel(summary) >= MAX_PRESTIGE) return false;
  const rank = rankFromXp(summary.xp || 0, isPro);
  if (rank.id !== 'vault_architect') return false;
  return LIFETIME_MILESTONES.every((m) => isChallengeComplete(summary, m, isPro));
}

export function prestigeTallyLabel(prestigeLevel = 0): string | null {
  const p = getPrestigeLevel({ prestigeLevel });
  if (p <= 0) return null;
  return `P${p}`;
}
