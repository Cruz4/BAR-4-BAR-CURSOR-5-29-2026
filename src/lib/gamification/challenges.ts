import type { GamificationSummary } from '@/lib/gamification/types';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { rankFromXp, STUDIO_RANKS } from '@/lib/gamification/ranks';
import { linesToRhymeBars, rhymeBarsToLines } from '@/lib/lyrics-units';

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
    | 'dnaImportWeekCount'
    | 'friendshipWeekCount'
    | 'wallPostWeekCount'
    | 'shareCreatedWeekCount'
    | 'qualifiedListenSongWeekCount'
    | 'quoteReverbWeekCount'
    | 'galleryPostWeekCount'
    | 'creatorListenerWeekCount'
    | 'barsMonth'
    | 'generateNextLineMonthCount'
    | 'tracksCompletedMonthCount'
    | 'currentStreak'
    | 'lifetimeBarsWritten'
    | 'lifetimeTracksCompleted'
    | 'lifetimeGenerateNextLine'
    | 'lifetimeStudioSessions'
    | 'lifetimeDnaImports'
    | 'lifetimeFriendshipsAccepted'
    | 'lifetimeWallPosts'
    | 'lifetimeSharesCreated'
    | 'lifetimeDnaImportsReceived'
    | 'longestStreak'
    | 'xp'
    | 'achievementCount'
    | 'rankHeadliner'
    | 'rankVaultArchitect';
};

/** Summary fields that accumulate **line** counts; challenge targets are rhyme bars. */
const BAR_LINE_FIELDS = new Set<ChallengeDef['field']>([
  'barsWeek',
  'barsMonth',
  'lifetimeBarsWritten',
]);

export const WEEKLY_CHALLENGES: ChallengeDef[] = [
  {
    id: 'bars_8',
    label: 'Write 16 bars this week',
    description: 'Hand-write sixteen new rhyme bars (typed lines) across any tracks before Monday reset.',
    target: 16,
    scale: 'weekly',
    tier: 'standard',
    field: 'barsWeek',
  },
  {
    id: 'next_line_5',
    label: 'Generate Next Line 8 times',
    description: 'Use Bar Workstation AI eight times this week.',
    target: 8,
    scale: 'weekly',
    tier: 'standard',
    field: 'generateNextLineWeekCount',
  },
  {
    id: 'complete_1_track',
    label: 'Complete 1 track',
    description: 'Mark at least one track complete this week (Track Status → Mark Track Complete).',
    target: 1,
    scale: 'weekly',
    tier: 'standard',
    field: 'tracksCompletedWeekCount',
  },
  {
    id: 'dna_import_1',
    label: 'Import a DNA Drop',
    description: 'Pull another artist’s DNA Drop into your vault this week.',
    target: 1,
    scale: 'weekly',
    tier: 'epic',
    field: 'dnaImportWeekCount',
  },
  {
    id: 'friendship_2',
    label: 'Seal 2 friendships',
    description: 'Accept (or get accepted on) two friend requests this week.',
    target: 2,
    scale: 'weekly',
    tier: 'epic',
    field: 'friendshipWeekCount',
  },
  {
    id: 'wall_posts_3',
    label: 'Post 3 times on the wall',
    description: 'Publish three Artist Home / Scene wall posts this week.',
    target: 3,
    scale: 'weekly',
    tier: 'standard',
    field: 'wallPostWeekCount',
  },
  {
    id: 'share_drop_1',
    label: 'DNA Drop 1 project',
    description: 'Publish one shareable DNA Drop this week (Pro).',
    target: 1,
    scale: 'weekly',
    tier: 'epic',
    field: 'shareCreatedWeekCount',
  },
  {
    id: 'qualified_listening_mix',
    label: 'Deep-listen to 3 songs',
    description: 'Reach 80% on three different pressed songs this week. One qualified day per song counts.',
    target: 3,
    scale: 'weekly',
    tier: 'standard',
    field: 'qualifiedListenSongWeekCount',
  },
  {
    id: 'quote_reverbs_2',
    label: 'Publish 2 Quote Reverbs',
    description: 'Add your perspective to two public posts this week.',
    target: 2,
    scale: 'weekly',
    tier: 'standard',
    field: 'quoteReverbWeekCount',
  },
  {
    id: 'gallery_posts_2',
    label: 'Post 2 public images',
    description: 'Publish two verified image posts from your live Artist Home.',
    target: 2,
    scale: 'weekly',
    tier: 'standard',
    field: 'galleryPostWeekCount',
  },
  {
    id: 'creator_listener_momentum',
    label: 'Reach 5 new qualified listeners',
    description: 'Five distinct listeners earn their first qualified day on your pressed music this week.',
    target: 5,
    scale: 'weekly',
    tier: 'epic',
    field: 'creatorListenerWeekCount',
  },
];

export const MONTHLY_CHALLENGES: ChallengeDef[] = [
  {
    id: 'bars_40',
    label: 'Write 40 bars this month',
    description: 'Sustained hand-writing — forty rhyme bars you typed (not AI-generated) before month end.',
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
    description: 'Lock in three finished tracks this month (Mark Track Complete in the Workstation).',
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
    description: 'Hand-write 100 rhyme bars across your studio career (AI lines do not count).',
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
    description: 'Earn Headliner rank on the studio plate ladder.',
    target: 1,
    scale: 'lifetime',
    tier: 'epic',
    field: 'rankHeadliner',
  },
  {
    id: 'life_xp_3500',
    label: 'Vault Architect',
    description: 'Reach Vault Architect — the top studio plate (Pro overlay at cap).',
    target: 1,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'rankVaultArchitect',
  },
  {
    id: 'life_badges_5',
    label: 'Badge Collector',
    description: 'Unlock eight studio achievements.',
    target: 8,
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
  {
    id: 'life_dna_imports_5',
    label: 'Strain Archive',
    description: 'Import five foreign DNA Drops into your vault.',
    target: 5,
    scale: 'lifetime',
    tier: 'epic',
    field: 'lifetimeDnaImports',
  },
  {
    id: 'life_dna_imports_15',
    label: 'Cross-Vault Library',
    description: 'Fifteen artist DNA Drops collected lifetime.',
    target: 15,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'lifetimeDnaImports',
  },
  {
    id: 'life_friends_10',
    label: 'Network Ten',
    description: 'Seal ten artist friendships.',
    target: 10,
    scale: 'lifetime',
    tier: 'epic',
    field: 'lifetimeFriendshipsAccepted',
  },
  {
    id: 'life_wall_25',
    label: 'Block Broadcaster',
    description: 'Twenty-five wall posts across your Artist Home career.',
    target: 25,
    scale: 'lifetime',
    tier: 'epic',
    field: 'lifetimeWallPosts',
  },
  {
    id: 'life_shares_5',
    label: 'Five Drops Live',
    description: 'Publish five DNA Drops lifetime.',
    target: 5,
    scale: 'lifetime',
    tier: 'epic',
    field: 'lifetimeSharesCreated',
  },
  {
    id: 'life_resonance_10',
    label: 'Signal Strong',
    description: 'Ten imports of your DNA Drops by other artists.',
    target: 10,
    scale: 'lifetime',
    tier: 'legendary',
    field: 'lifetimeDnaImportsReceived',
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
    case 'dnaImportWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.dnaImportWeekCount || 0 : 0;
    case 'friendshipWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.friendshipWeekCount || 0 : 0;
    case 'wallPostWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.wallPostWeekCount || 0 : 0;
    case 'shareCreatedWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.shareCreatedWeekCount || 0 : 0;
    case 'qualifiedListenSongWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.qualifiedListenSongWeekCount || 0 : 0;
    case 'quoteReverbWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.quoteReverbWeekCount || 0 : 0;
    case 'galleryPostWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.galleryPostWeekCount || 0 : 0;
    case 'creatorListenerWeekCount':
      return summary.weeklyChallengeWeekKey === getWeekKey() ? summary.creatorListenerWeekCount || 0 : 0;
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
    case 'lifetimeDnaImports':
      return summary.lifetimeDnaImports || 0;
    case 'lifetimeFriendshipsAccepted':
      return summary.lifetimeFriendshipsAccepted || 0;
    case 'lifetimeWallPosts':
      return summary.lifetimeWallPosts || 0;
    case 'lifetimeSharesCreated':
      return summary.lifetimeSharesCreated || 0;
    case 'lifetimeDnaImportsReceived':
      return summary.lifetimeDnaImportsReceived || 0;
    case 'longestStreak':
      return summary.longestStreak || 0;
    case 'xp':
      return summary.xp || 0;
    case 'achievementCount':
      return achievementCount(summary);
    case 'rankHeadliner': {
      const rank = rankFromXp(summary.xp, isPro);
      const headlinerIdx = STUDIO_RANKS.findIndex((r) => r.id === 'headliner');
      const currentIdx = STUDIO_RANKS.findIndex((r) => r.id === rank.id);
      return currentIdx >= headlinerIdx && headlinerIdx >= 0 ? 1 : 0;
    }
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
  const raw = resolveFieldProgress(summary, challenge.field, isPro);
  if (BAR_LINE_FIELDS.has(challenge.field)) {
    return linesToRhymeBars(raw);
  }
  return raw;
}

export function isChallengeComplete(
  summary: GamificationSummary,
  challenge: ChallengeDef,
  isPro = false
): boolean {
  const target = resolveChallengeTarget(challenge, isPro);
  if (challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect') {
    return getChallengeProgress(summary, challenge, isPro) >= 1;
  }
  if (BAR_LINE_FIELDS.has(challenge.field)) {
    const rawLines = resolveFieldProgress(summary, challenge.field, isPro);
    return rawLines >= rhymeBarsToLines(target);
  }
  return resolveFieldProgress(summary, challenge.field, isPro) >= target;
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
