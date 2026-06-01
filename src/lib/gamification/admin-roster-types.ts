import type { GamificationSummary } from '@/lib/gamification/types';

export type AdminGamificationRosterEntry = {
  displayName: string;
  email: string;
  status: string;
  xp: number;
  rankId: GamificationSummary['rankId'];
  currentStreak: number;
  longestStreak: number;
  lifetimeBarsWritten: number;
  unlockedAchievements: Record<string, string>;
};
