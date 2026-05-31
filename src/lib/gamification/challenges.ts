import type { GamificationSummary } from '@/lib/gamification/types';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { rankFromXp, STUDIO_RANKS } from '@/lib/gamification/ranks';

export type ChallengeScale = 'weekly' | 'monthly' | 'lifetime';
export type ChallengeTier = 'standard' | 'epic' | 'legendary';

export type ChallengeDef = {
  id: string;
  label: string;
  description: string;
  target: number;
  scale: ChallengeScale;
  tier: ChallengeTier;
  /** Field on gamification summary used for progress */
  field:
    | 'barsWeek'
    | 'generateNextLineWeekCount'
    | 'tracksCompletedWeekCount'
    | 'barsMonth'
    | 'generateNextLineMonthCount'
    | 'tracksCompletedMonthCount'
    | 'currentStreak'
    | 'lifetimeBarsWritten'
    | 'lifetimeTracksCompleted'
    | 'lifetimeGenerateNextLine'
    | 'lifetimeStudioSessions'
    | 'longestStreak'
    | 'xp'
    | 'achievementCount'
    | 'rankHeadliner'
    | 'rankVaultArchitect';
};

export const WEEKLY_CHALLENGES: ChallengeDef[] = [
  {
    id: 'bars_8',
    label: 'Write 8 bars this week',
    description: 'Add eight new bars across any tracks before Monday reset.',
    target: 8,
    scale: 'weekly',
    tier: 'standard',
    field: 'barsWeek',
  },
  {
    id: 'next_line_5',
    label: 'Generate Next Line 5 times',
    description: 'Use Bar Workstation AI five times this week.',
    target: 5,
    scale: 'weekly',
    tier: 'standard',
    field: 'generateNextLineWeekCount',
  },
  {
    id: 'complete_1_track',
    label: 'Complete 1 track',
    description: 'Mark at least one track complete this week.',
    target: 1,
    scale: 'weekly',
    tier: 'standard',
    field: 'tracksCompletedWeekCount',
  },
];

export const MONTHLY_CHALLENGES: ChallengeDef[] = [
  {
    id: 'bars_40',
    label: 'Write 40 bars this month',
    description: 'Sustained writing pace — forty bars before the calendar month ends.',
    target: 40,
    scale: 'monthly',
    tier: 'standard',
    field: 'barsMonth',
  },
  {
    id: 'next_line_20',
    label: 'Generate Next Line 20 times',
    description: 'Keep the AI booth hot with twenty next-bar generations.',
    target: 20,
    scale: 'monthly',
    tier: 'standard',
    field: 'generateNextLineMonthCount',
  },
  {
    id: 'complete_3_tracks',
    label: 'Complete 3 tracks',
    description: 'Lock in three finished tracks this month.',
    target: 3,
    scale: 'monthly',
    tier: 'epic',
    field: 'tracksCompletedMonthCount',
  },
  {
    id: 'streak_10',
    label: 'Hit a 10-day streak',
    description: 'Write in the studio ten days in a row at any point this month.',
    target: 10,
    scale: 'monthly',
    tier: 'epic',
    field: 'currentStreak',
  },
];

export const LIFETIME_MILESTONES: ChallengeDef[] = [
  {
    id: 'life_bars_100',
    label: 'Century Writer',
    description: 'Write 100 bars across your entire studio career.',
    target: 100,
    scale: 'lifetime',
    tier: 'standard',
    field: 'lifetimeBarsWritten',
  },
  {
    id: 'life_bars_500',
    label: '500-Bar Archive',
    description: 'Five hundred bars logged — you are building a catalog.',
    target: 500,
    scale: 'lifetime',
    tier: 'epic',
    field: 'lifetimeBarsWritten',
  },
  {
    id: 'life_bars_2000',
    label: 'Vault Legend',
    description: 'Two thousand lifetime bars. Grand achievement territory.',
    target: 2000,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'lifetimeBarsWritten',
  },
  {
    id: 'life_tracks_5',
    label: 'EP Complete',
    description: 'Finish five tracks lifetime.',
    target: 5,
    scale: 'lifetime',
    tier: 'standard',
    field: 'lifetimeTracksCompleted',
  },
  {
    id: 'life_tracks_25',
    label: 'Album Cycle',
    description: 'Twenty-five completed tracks — a full body of work.',
    target: 25,
    scale: 'lifetime',
    tier: 'epic',
    field: 'lifetimeTracksCompleted',
  },
  {
    id: 'life_next_50',
    label: 'AI Apprentice',
    description: 'Generate Next Line fifty times lifetime.',
    target: 50,
    scale: 'lifetime',
    tier: 'standard',
    field: 'lifetimeGenerateNextLine',
  },
  {
    id: 'life_next_500',
    label: 'Bar Machine',
    description: 'Five hundred AI next-bar generations. You know the workflow.',
    target: 500,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'lifetimeGenerateNextLine',
  },
  {
    id: 'life_sessions_30',
    label: '30 Session Days',
    description: 'Show up in the studio on thirty different days.',
    target: 30,
    scale: 'lifetime',
    tier: 'standard',
    field: 'lifetimeStudioSessions',
  },
  {
    id: 'life_streak_30',
    label: 'Iron Streak',
    description: 'Reach a 30-day writing streak at least once.',
    target: 30,
    scale: 'lifetime',
    tier: 'epic',
    field: 'longestStreak',
  },
  {
    id: 'life_streak_100',
    label: 'Century Streak',
    description: 'One hundred consecutive studio days. Legendary discipline.',
    target: 100,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'longestStreak',
  },
  {
    id: 'life_xp_1500',
    label: 'Headliner Status',
    description: 'Earn 1,500 XP and reach Headliner rank.',
    target: 1500,
    scale: 'lifetime',
    tier: 'epic',
    field: 'rankHeadliner',
  },
  {
    id: 'life_xp_3500',
    label: 'Vault Architect',
    description: '3,500 XP — the highest studio rank (Pro overlay at cap).',
    target: 3500,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'rankVaultArchitect',
  },
  {
    id: 'life_badges_5',
    label: 'Badge Collector',
    description: 'Unlock five studio achievements.',
    target: 5,
    scale: 'lifetime',
    tier: 'standard',
    field: 'achievementCount',
  },
  {
    id: 'life_badges_all',
    label: 'Full Trophy Case',
    description: 'Unlock every achievement you are eligible for.',
    target: 13,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'achievementCount',
  },
];

/** Returns ISO date string for Monday of current week (UTC). */
export function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function achievementCount(summary: GamificationSummary): number {
  return Object.keys(summary.unlockedAchievements || {}).length;
}

export function resolveChallengeTarget(challenge: ChallengeDef, isPro: boolean): number {
  if (challenge.id === 'life_badges_all') {
    return isPro ? ACHIEVEMENTS.length : ACHIEVEMENTS.filter((a) => !a.proOnly).length;
  }
  return challenge.target;
}

function resolveFieldProgress(
  summary: GamificationSummary,
  field: ChallengeDef['field'],
  isPro: boolean
): number {
  switch (field) {
    case 'barsWeek':
      return summary.weeklyChallengeWeekKey === getWeekKey()
        ? summary.weeklyChallengeProgress.barsWeek || 0
        : 0;
    case 'generateNextLineWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.generateNextLineWeekCount || 0 : 0;
    case 'tracksCompletedWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.tracksCompletedWeekCount || 0 : 0;
    case 'barsMonth':
      return summary.monthlyChallengeMonthKey === getMonthKey()
        ? summary.monthlyChallengeProgress.barsMonth || 0
        : 0;
    case 'generateNextLineMonthCount':
      return summary.monthlyChallengeMonthKey === getMonthKey() ? summary.generateNextLineMonthCount || 0 : 0;
    case 'tracksCompletedMonthCount':
      return summary.monthlyChallengeMonthKey === getMonthKey() ? summary.tracksCompletedMonthCount || 0 : 0;
    case 'currentStreak':
      return summary.currentStreak || 0;
    case 'lifetimeBarsWritten':
      return summary.lifetimeBarsWritten || 0;
    case 'lifetimeTracksCompleted':
      return summary.lifetimeTracksCompleted || 0;
    case 'lifetimeGenerateNextLine':
      return summary.lifetimeGenerateNextLine || 0;
    case 'lifetimeStudioSessions':
      return summary.lifetimeStudioSessions || 0;
    case 'longestStreak':
      return summary.longestStreak || 0;
    case 'xp':
      return summary.xp || 0;
    case 'achievementCount':
      return achievementCount(summary);
    case 'rankHeadliner':
      return summary.xp >= (STUDIO_RANKS.find((r) => r.id === 'headliner')?.minXp || 1500) ? 1 : 0;
    case 'rankVaultArchitect': {
      const rank = rankFromXp(summary.xp, isPro);
      return rank.id === 'vault_architect' ? 1 : 0;
    }
    default:
      return 0;
  }
}

export function getChallengeProgress(
  summary: GamificationSummary,
  challenge: Pick<ChallengeDef, 'field' | 'target'>,
  isPro = false
): number {
  return resolveFieldProgress(summary, challenge.field, isPro);
}

export function isChallengeComplete(
  summary: GamificationSummary,
  challenge: ChallengeDef,
  isPro = false
): boolean {
  const progress = getChallengeProgress(summary, challenge, isPro);
  const target = resolveChallengeTarget(challenge, isPro);
  if (challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect') {
    return progress >= 1;
  }
  return progress >= target;
}

export function getChallengePercent(
  summary: GamificationSummary,
  challenge: ChallengeDef,
  isPro = false
): number {
  const target = resolveChallengeTarget(challenge, isPro);
  if (challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect') {
    return isChallengeComplete(summary, challenge, isPro)
      ? 100
      : Math.min(99, Math.round((summary.xp / challenge.target) * 100));
  }
  const progress = getChallengeProgress(summary, challenge, isPro);
  return Math.min(100, Math.round((progress / target) * 100));
}

export const TIER_LABELS: Record<ChallengeTier, string> = {
  standard: 'Standard',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const SCALE_LABELS: Record<ChallengeScale, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  lifetime: 'Lifetime',
};
