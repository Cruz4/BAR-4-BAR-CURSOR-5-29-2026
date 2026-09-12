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
  /** Artist Home live on the public Scene. */
  publicProfile: boolean;
  profileSlug?: string;
  /** ISO — last Firebase Auth sign-in. */
  lastSignInAt?: string | null;
};
