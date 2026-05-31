/** Gamification profile stored at users/{uid}/gamification/summary */

export type RankId = 'open_mic' | 'demo_tape' | 'session_ready' | 'headliner' | 'vault_architect';

export type GamificationSummary = {
  xp: number;
  rankId: RankId;
  currentStreak: number;
  longestStreak: number;
  /** achievement id → unlockedAt ISO */
  unlockedAchievements: Record<string, string>;
  weeklyChallengeProgress: Record<string, number>;
  weeklyChallengeWeekKey: string;
  monthlyChallengeProgress: Record<string, number>;
  monthlyChallengeMonthKey: string;
  generateNextLineMonthCount: number;
  tracksCompletedMonthCount: number;
  lifetimeBarsWritten: number;
  lifetimeTracksCompleted: number;
  lifetimeGenerateNextLine: number;
  lifetimeStudioSessions: number;
  personalBests: {
    barsInDay: number;
    longestStreak: number;
    barsInSession: number;
  };
  publicProfile: boolean;
  profileSlug?: string;
  leaderboardHidden: boolean;
  bonusInkGrantedThisMonth: number;
  bonusInkMonthKey: string;
  barsWritten7d: number;
  barsWrittenToday: number;
  barsWrittenDayKey: string;
  tracksCompleted30d: number;
  generateNextLineWeekCount: number;
  dnaFilledWeekCount: number;
  tracksCompletedWeekCount: number;
  lastGenerateNextLineDayKey: string;
  updatedAt: string;
};

export type GamificationUnlock = {
  id: string;
  title: string;
  description: string;
  inkReward: number;
  proOnly?: boolean;
};

export type GamificationTrigger =
  | 'session_start'
  | 'ai_action'
  | 'smart_structure_used'
  | 'tour_complete'
  | 'rhyme_pulse_on'
  | 'track_saved'
  | 'dna_preset_saved'
  | 'share_created'
  | 'album_limit_hit';

export const DEFAULT_GAMIFICATION_SUMMARY: GamificationSummary = {
  xp: 0,
  rankId: 'open_mic',
  currentStreak: 0,
  longestStreak: 0,
  unlockedAchievements: {},
  weeklyChallengeProgress: {},
  weeklyChallengeWeekKey: '',
  monthlyChallengeProgress: {},
  monthlyChallengeMonthKey: '',
  generateNextLineMonthCount: 0,
  tracksCompletedMonthCount: 0,
  lifetimeBarsWritten: 0,
  lifetimeTracksCompleted: 0,
  lifetimeGenerateNextLine: 0,
  lifetimeStudioSessions: 0,
  personalBests: { barsInDay: 0, longestStreak: 0, barsInSession: 0 },
  publicProfile: false,
  leaderboardHidden: false,
  bonusInkGrantedThisMonth: 0,
  bonusInkMonthKey: '',
  barsWritten7d: 0,
  barsWrittenToday: 0,
  barsWrittenDayKey: '',
  tracksCompleted30d: 0,
  generateNextLineWeekCount: 0,
  dnaFilledWeekCount: 0,
  tracksCompletedWeekCount: 0,
  lastGenerateNextLineDayKey: '',
  updatedAt: new Date().toISOString(),
};
